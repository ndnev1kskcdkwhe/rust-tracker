"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PSM, createWorker, type Worker } from "tesseract.js";
import { CROPS, CROP_LABELS, DEFAULT_TARGET_GENOME, type Crop } from "@/lib/calculators/genetics/data";
import { greenGeneCount, parseGenome } from "@/lib/calculators/genetics/genetics";
import { findBestArrangement } from "@/lib/calculators/genetics/arrangement";
import { parseGenesFromOcrText } from "@/lib/calculators/genetics/ocr";

interface SavedGenome {
  id: string;
  crop: Crop;
  genes: string;
  label: string | null;
  createdAt: string;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Gap between scans (after the previous one finishes) — full-frame OCR is slower than a
 * cropped region, so a recursive delay avoids piling up overlapping recognize() calls. */
const SCAN_DELAY_MS = 800;

/** How many misses on the discovered region before we assume the UI moved and re-locate. */
const MAX_MISSES_BEFORE_RELOCATE = 5;

const TARGET_GENOME = parseGenome(DEFAULT_TARGET_GENOME);

export default function GeneticsScanPage() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session?.user;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const scanLoopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningRef = useRef(false);
  const lastGenesRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const cropRef = useRef<Crop>("HEMP");
  const discoveredRegionRef = useRef<Rect | null>(null);
  const consecutiveMissesRef = useRef(0);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastOcrText, setLastOcrText] = useState<string>("");
  const [isTestingOcr, setIsTestingOcr] = useState(false);
  const [crop, setCrop] = useState<Crop>("HEMP");
  const [savedGenomes, setSavedGenomes] = useState<SavedGenome[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<SavedGenome[]>([]);

  cropRef.current = crop;

  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    refreshSavedGenomes();
  }, [isLoggedIn]);

  async function refreshSavedGenomes() {
    const res = await fetch("/api/genomes");
    const data = await res.json();
    setSavedGenomes(Array.isArray(data) ? data : []);
  }

  function stopEverything() {
    isScanningRef.current = false;
    if (scanLoopTimerRef.current) {
      clearTimeout(scanLoopTimerRef.current);
      scanLoopTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsScanning(false);
    setIsCapturing(false);
  }

  function playPumSound() {
    if (!audioContextRef.current) {
      return;
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(700, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.18);
  }

  async function handleStartCapture() {
    setErrorMessage(null);
    discoveredRegionRef.current = null;
    consecutiveMissesRef.current = 0;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setErrorMessage("Цей браузер не підтримує захоплення екрана.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      stream.getVideoTracks()[0]?.addEventListener("ended", stopEverything);
      setIsCapturing(true);
    } catch {
      setErrorMessage("Не вдалося отримати доступ до екрана.");
    }
  }

  async function ensureWorker(): Promise<Worker> {
    if (!workerRef.current) {
      workerRef.current = await createWorker("eng");
    }
    return workerRef.current;
  }

  function captureFrameToCanvas(rect?: Rect, scaleUp = 1): HTMLCanvasElement | null {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      return null;
    }
    const sx = rect ? Math.max(0, rect.x) : 0;
    const sy = rect ? Math.max(0, rect.y) : 0;
    const sw = rect ? Math.min(rect.width, video.videoWidth - sx) : video.videoWidth;
    const sh = rect ? Math.min(rect.height, video.videoHeight - sy) : video.videoHeight;
    if (sw <= 0 || sh <= 0) {
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = sw * scaleUp;
    canvas.height = sh * scaleUp;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  /**
   * Full-frame pass: finds the word "Genetics" anywhere on screen (via word bounding boxes,
   * SPARSE_TEXT mode — built for isolated text blocks over a busy background) and derives a
   * tight region around where the gene letters follow it. Only needed once per capture
   * session (or after several consecutive misses), not on every scan tick — full-frame OCR
   * is too slow and too noisy (game HUD/inventory text) to run repeatedly.
   */
  async function locateGeneticsRegion(): Promise<Rect | null> {
    const canvas = captureFrameToCanvas();
    if (!canvas) {
      return null;
    }
    const worker = await ensureWorker();
    // AUTO (Tesseract's default full-page segmentation) rather than SPARSE_TEXT: our target
    // is a structured multi-line UI panel over the 3D scene, not scattered isolated words —
    // closer to "a page with text blocks" than "random signage in a photo."
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    const { data } = await worker.recognize(canvas, {}, { blocks: true, text: true });

    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        for (const line of paragraph.lines ?? []) {
          for (const word of line.words ?? []) {
            if (word.text.toLowerCase().replace(/[^a-z]/g, "").includes("genetic")) {
              const wordWidth = word.bbox.x1 - word.bbox.x0;
              const wordHeight = word.bbox.y1 - word.bbox.y0;
              return {
                x: word.bbox.x0,
                y: word.bbox.y0 - wordHeight * 0.4,
                width: wordWidth * 5,
                height: wordHeight * 1.8,
              };
            }
          }
        }
      }
    }

    // Diagnostic fallback so a failed locate still tells us something useful: is "genetics"
    // present in the plain recognized text at all (meaning the word/bbox hierarchy just
    // didn't carry it), or did OCR miss it entirely at this page-segmentation mode?
    const plainText = (data.text ?? "").trim();
    const foundInPlainText = plainText.toLowerCase().includes("genetic");
    setLastOcrText(
      foundInPlainText
        ? `Слово "Genetics" є в тексті, але не вдалось визначити позицію. Розпізнано: "${plainText.slice(0, 200)}"`
        : `Не знайшов "Genetics" у розпізнаному тексті. Розпізнано: "${plainText.slice(0, 200)}"`
    );
    return null;
  }

  async function scanOnce() {
    if (!discoveredRegionRef.current) {
      setLastOcrText("Шукаю область з генетикою на екрані...");
      const region = await locateGeneticsRegion();
      if (!region) {
        return;
      }
      discoveredRegionRef.current = region;
      consecutiveMissesRef.current = 0;
    }

    const canvas = captureFrameToCanvas(discoveredRegionRef.current, 3);
    if (!canvas) {
      return;
    }

    const worker = await ensureWorker();
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
    const {
      data: { text },
    } = await worker.recognize(canvas);
    setLastOcrText(text.trim());

    const genes = parseGenesFromOcrText(text);
    if (genes && genes !== lastGenesRef.current) {
      lastGenesRef.current = genes;
      consecutiveMissesRef.current = 0;
      playPumSound();
      const response = await fetch("/api/genomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop: cropRef.current, genes }),
      });
      if (response.ok) {
        const created: SavedGenome = await response.json();
        setSavedGenomes((prev) => [created, ...prev]);
        setRecentlyAdded((prev) => [created, ...prev].slice(0, 20));
      }
    }
    if (!genes) {
      lastGenesRef.current = null;
      consecutiveMissesRef.current += 1;
      if (consecutiveMissesRef.current >= MAX_MISSES_BEFORE_RELOCATE) {
        discoveredRegionRef.current = null;
        consecutiveMissesRef.current = 0;
      }
    }
  }

  async function handleTestOcr() {
    setIsTestingOcr(true);
    await scanOnce();
    setIsTestingOcr(false);
  }

  async function scanLoop() {
    if (!isScanningRef.current) {
      return;
    }
    await scanOnce();
    if (isScanningRef.current) {
      scanLoopTimerRef.current = setTimeout(scanLoop, SCAN_DELAY_MS);
    }
  }

  function handleStartScanning() {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    isScanningRef.current = true;
    setIsScanning(true);
    scanLoop();
  }

  function handleStopScanning() {
    isScanningRef.current = false;
    if (scanLoopTimerRef.current) {
      clearTimeout(scanLoopTimerRef.current);
      scanLoopTimerRef.current = null;
    }
    setIsScanning(false);
  }

  async function handleDeleteSaved(id: string) {
    setSavedGenomes((prev) => prev.filter((g) => g.id !== id));
    setRecentlyAdded((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/genomes/${id}`, { method: "DELETE" });
  }

  const cropGenomes = useMemo(
    () => (isLoggedIn ? savedGenomes.filter((g) => g.crop === crop) : []),
    [isLoggedIn, savedGenomes, crop]
  );

  const arrangement = useMemo(() => {
    if (cropGenomes.length === 0) {
      return null;
    }
    const pool = cropGenomes.map((g) => parseGenome(g.genes));
    const result = findBestArrangement(pool, TARGET_GENOME);
    if (!result) {
      return null;
    }
    return {
      centerGenes: cropGenomes[result.centerIndex].genes,
      neighborGenesList: result.neighborIndices.map((i) => cropGenomes[i].genes),
      chance: result.chance,
      expectedAttempts: result.expectedAttempts,
    };
  }, [cropGenomes]);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-3xl">
        <Link href="/calculators/genetics" className="text-sm text-zinc-600 dark:text-zinc-400">
          ← Назад до генетики
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-zinc-50">
          Сканування клонів з екрана
        </h1>

        <div className="mt-2 rounded-xl border border-yellow-600/30 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-950 dark:text-yellow-200">
          Обов&apos;язкова умова: у налаштуваннях Rust (Settings → User Interface) виставити{" "}
          <strong>User Interface Scale = 1 (максимум)</strong> і мову інтерфейсу — English.
        </div>

        <ol className="mt-4 list-decimal pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>Захопи екран/вікно з грою — виділяти нічого не потрібно.</li>
          <li>Натисни «Почати сканування» і наведи курсор на будь-який клон, щоб з&apos;явилась підказка з геном.</li>
          <li>
            Перший скан повільніший — сайт шукає слово «Genetics» по всьому кадру. Далі він
            запам&apos;ятовує цю область і сканує тільки її — швидко й точно.
          </li>
          <li>Кожен розпізнаний клон одразу зберігається в базу зі звуком.</li>
          <li>Найкращі варіанти схрещування під ціль {DEFAULT_TARGET_GENOME} показуються автоматично нижче.</li>
        </ol>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          {errorMessage && <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
          {!isLoggedIn && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/login" className="font-medium text-black dark:text-zinc-50">
                Увійди
              </Link>{" "}
              щоб розпізнані клони зберігались у базу.
            </p>
          )}

          <label className="flex w-fit flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Культура
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value as Crop)}
              className="rounded-lg border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
            >
              {CROPS.map((c) => (
                <option key={c} value={c}>
                  {CROP_LABELS[c]}
                </option>
              ))}
            </select>
          </label>

          {!isCapturing && (
            <button
              type="button"
              onClick={handleStartCapture}
              className="h-11 self-start rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Захопити екран
            </button>
          )}

          {/* Always mounted (just hidden pre-capture) so videoRef exists before getDisplayMedia resolves. */}
          <div className={isCapturing ? "flex flex-col gap-4" : "hidden"}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="block w-full select-none rounded-lg border border-black/[.08] dark:border-white/[.145]"
            />

            <div className="flex flex-wrap items-center gap-3">
              {!isScanning ? (
                <button
                  type="button"
                  onClick={handleStartScanning}
                  className="h-11 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                >
                  Почати сканування
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopScanning}
                  className="h-11 rounded-full border border-solid border-black/[.08] px-6 text-sm font-medium transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                >
                  Зупинити сканування
                </button>
              )}
              <button
                type="button"
                disabled={isTestingOcr}
                onClick={handleTestOcr}
                className="h-11 rounded-full border border-solid border-black/[.08] px-6 text-sm font-medium transition-colors hover:border-transparent hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
              >
                {isTestingOcr ? "Перевіряю..." : "Тест OCR зараз"}
              </button>
              <button
                type="button"
                onClick={stopEverything}
                className="text-sm text-red-600 hover:underline dark:text-red-400"
              >
                Зупинити захоплення екрана
              </button>
            </div>

            {(isScanning || lastOcrText) && (
              <p className="font-mono text-xs text-zinc-500 dark:text-zinc-500">
                Останній OCR-текст: &quot;{lastOcrText || "…"}&quot;
              </p>
            )}
          </div>
        </div>

        {recentlyAdded.length > 0 && (
          <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <h2 className="text-lg font-medium text-black dark:text-zinc-50">
              Щойно додано ({recentlyAdded.length})
            </h2>
            {recentlyAdded.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-xl bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
                <span className="font-mono text-black dark:text-zinc-50">{g.genes}</span>
                <span className="text-xs text-zinc-500">{greenGeneCount(parseGenome(g.genes))}/6 зелених</span>
                <button
                  type="button"
                  onClick={() => handleDeleteSaved(g.id)}
                  className="ml-auto text-xs text-red-600 hover:underline dark:text-red-400"
                >
                  Видалити (помилка)
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">
            Найкраще схрещування під ціль {DEFAULT_TARGET_GENOME}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Рахується автоматично з усіх збережених клонів обраної культури ({CROP_LABELS[crop]}).
          </p>

          {!isLoggedIn ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-500">Увійди, щоб бачити цей розрахунок.</p>
          ) : cropGenomes.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              Ще немає збережених клонів цієї культури.
            </p>
          ) : arrangement ? (
            <div className="rounded-xl bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
              <p className="text-xs text-zinc-500">Центр</p>
              <p className="font-mono text-black dark:text-zinc-50">{arrangement.centerGenes}</p>
              <p className="mt-2 text-xs text-zinc-500">Сусіди ({arrangement.neighborGenesList.length}/8)</p>
              {arrangement.neighborGenesList.length === 0 ? (
                <p className="text-zinc-600 dark:text-zinc-400">Не потрібні.</p>
              ) : (
                <ul className="font-mono text-black dark:text-zinc-50">
                  {arrangement.neighborGenesList.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 font-medium text-black dark:text-zinc-50">
                Шанс за одне схрещування: {(arrangement.chance * 100).toFixed(1)}%
              </p>
              {arrangement.chance > 0 && arrangement.chance < 1 && (
                <p className="text-zinc-600 dark:text-zinc-400">
                  ~{arrangement.expectedAttempts} {arrangement.expectedAttempts === 1 ? "спроба" : "спроб"} в
                  середньому.
                </p>
              )}
              {arrangement.chance === 0 && (
                <p className="text-red-600 dark:text-red-400">З наявних клонів цю ціль отримати неможливо.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
