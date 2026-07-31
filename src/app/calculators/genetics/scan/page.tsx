"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PSM, createWorker, type Line, type Page, type Word, type Worker } from "tesseract.js";
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

  function findWordMatching(
    data: Page,
    predicate: (normalizedText: string) => boolean
  ): { word: Word; line: Line } | null {
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        for (const line of paragraph.lines ?? []) {
          for (const word of line.words ?? []) {
            if (predicate(word.text.toLowerCase().replace(/[^a-z]/g, ""))) {
              return { word, line };
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Full-frame pass, run once per capture session (or after several consecutive misses) —
   * full-frame OCR is too slow to run every tick, and small colored UI text (like the
   * "Genetics" row itself) tends to get lost in a compressed screen-share video stream even
   * when Tesseract can read it just fine once cropped tightly and upscaled (see below).
   *
   * Two strategies, in order:
   * 1. Look for a word matching "genetics" directly — cheap, works if the stream quality
   *    happens to be good enough.
   * 2. Fall back to the plain white "A clipping of a ... plant." line, which reads reliably
   *    even when "Genetics" itself doesn't, and derive a generous region below/around it
   *    that should contain the Genetics row (same panel, a few lines down). This region is
   *    then cropped + upscaled on every read tick, same as the old manual-calibration flow —
   *    the upscale is what makes the compressed small text legible, not the locate step.
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

    const geneticsMatch = findWordMatching(data, (t) => t.includes("genetic"));
    if (geneticsMatch) {
      const { word, line } = geneticsMatch;
      const wordHeight = word.bbox.y1 - word.bbox.y0;
      const lineWidth = line.bbox.x1 - line.bbox.x0;
      return {
        x: word.bbox.x0,
        y: word.bbox.y0 - wordHeight * 0.4,
        // Extend to the right edge of the whole line (not just the "Genetics" word itself),
        // since the gene letters are separate words following it on the same line.
        width: Math.max(lineWidth - (word.bbox.x0 - line.bbox.x0), (word.bbox.x1 - word.bbox.x0) * 5),
        height: wordHeight * 1.8,
      };
    }

    const clippingMatch = findWordMatching(data, (t) => t.includes("clipping") || t.includes("cutting"));
    if (clippingMatch) {
      const { word, line } = clippingMatch;
      const anchorHeight = word.bbox.y1 - word.bbox.y0;
      const lineWidth = line.bbox.x1 - line.bbox.x0;
      return {
        x: Math.max(0, line.bbox.x0 - anchorHeight),
        y: word.bbox.y1,
        // The "Genetics"/"Harvests"/"Resiliences" rows sit in the same info panel as this
        // description line — use the whole line's width (not just the "clipping" word) plus
        // margin, since label+value pairs on those rows can run wider than the description.
        width: lineWidth * 1.3,
        height: anchorHeight * 12,
      };
    }

    // Diagnostic fallback so a failed locate still tells us something useful.
    const plainText = (data.text ?? "").trim();
    setLastOcrText(`Не знайшов орієнтир на екрані. Розпізнано: "${plainText.slice(0, 250)}"`);
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
    // SINGLE_BLOCK rather than SINGLE_LINE: the region may span several lines (Harvests /
    // Genetics / Resiliences) when it came from the "clipping" anchor fallback, not just the
    // tight one-line box from a direct "genetics" word match.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
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
      expectedMatches: result.expectedMatches,
      likelyGenome: result.likelyGenome.join(""),
    };
  }, [cropGenomes]);

  return (
    <div className="page">
      <div className="shell-wide">
        <Link href="/calculators/genetics" className="back-link">
          <span className="back-arrow">←</span> Назад до генетики
        </Link>
        <h1 className="page-title rise">Сканування клонів з екрана</h1>

        <div className="note note-warn mt-4 rise" style={{ ["--d" as string]: "60ms" }}>
          Обов&apos;язкова умова: у налаштуваннях Rust (Settings → User Interface) виставити{" "}
          <strong>User Interface Scale = 1 (максимум)</strong> і мову інтерфейсу — English.
        </div>

        <ol className="steps mt-4 rise" style={{ ["--d" as string]: "110ms" }}>
          <li>Захопи екран/вікно з грою — виділяти нічого не потрібно.</li>
          <li>Натисни «Почати сканування» і наведи курсор на будь-який клон, щоб з&apos;явилась підказка з геном.</li>
          <li>
            Перший скан повільніший — сайт шукає слово «Genetics» по всьому кадру. Далі він
            запам&apos;ятовує цю область і сканує тільки її — швидко й точно.
          </li>
          <li>Кожен розпізнаний клон одразу зберігається в базу зі звуком.</li>
          <li>Найкращі варіанти схрещування під ціль {DEFAULT_TARGET_GENOME} показуються автоматично нижче.</li>
        </ol>

        <div className="panel mt-6 flex flex-col gap-4 rise" style={{ ["--d" as string]: "160ms" }}>
          {errorMessage && <p className="note note-bad">{errorMessage}</p>}
          {!isLoggedIn && (
            <p className="text-sm muted">
              <Link href="/login" className="link-accent">
                Увійди
              </Link>{" "}
              щоб розпізнані клони зберігались у базу.
            </p>
          )}

          <label className="field w-fit min-w-[12rem]">
            Культура
            <select value={crop} onChange={(e) => setCrop(e.target.value as Crop)} className="select">
              {CROPS.map((c) => (
                <option key={c} value={c}>
                  {CROP_LABELS[c]}
                </option>
              ))}
            </select>
          </label>

          {!isCapturing && (
            <button type="button" onClick={handleStartCapture} className="btn btn-primary self-start">
              Захопити екран
            </button>
          )}

          {/* Always mounted (just hidden pre-capture) so videoRef exists before getDisplayMedia resolves. */}
          <div className={isCapturing ? "flex flex-col gap-4" : "hidden"}>
            <video ref={videoRef} autoPlay muted playsInline className="scan-video" />

            <div className="flex flex-wrap items-center gap-3">
              {!isScanning ? (
                <button type="button" onClick={handleStartScanning} className="btn btn-primary">
                  Почати сканування
                </button>
              ) : (
                <button type="button" onClick={handleStopScanning} className="btn">
                  <span className="dot dot-live" /> Зупинити сканування
                </button>
              )}
              <button type="button" disabled={isTestingOcr} onClick={handleTestOcr} className="btn">
                {isTestingOcr ? "Перевіряю..." : "Тест OCR зараз"}
              </button>
              <button type="button" onClick={stopEverything} className="link-danger">
                Зупинити захоплення екрана
              </button>
            </div>

            {(isScanning || lastOcrText) && (
              <p className="mono text-xs faint break-all">
                Останній OCR-текст: &quot;{lastOcrText || "…"}&quot;
              </p>
            )}
          </div>
        </div>

        {recentlyAdded.length > 0 && (
          <div className="panel mt-4 flex flex-col gap-2 rise">
            <h2 className="section-title">Щойно додано ({recentlyAdded.length})</h2>
            {recentlyAdded.map((g) => (
              <div key={g.id} className="queue-item rise">
                <span className="mono tracking-widest text-sm">{g.genes}</span>
                <span className="mono text-xs faint">{greenGeneCount(parseGenome(g.genes))}/6</span>
                <button type="button" onClick={() => handleDeleteSaved(g.id)} className="link-danger ml-auto">
                  Видалити (помилка)
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="panel mt-4 flex flex-col gap-3 rise" style={{ ["--d" as string]: "220ms" }}>
          <h2 className="section-title">
            Найкраще схрещування під ціль <span className="mono text-[var(--accent)]">{DEFAULT_TARGET_GENOME}</span>
          </h2>
          <p className="text-sm muted">
            Рахується автоматично з усіх збережених клонів обраної культури ({CROP_LABELS[crop]}).
          </p>

          {!isLoggedIn ? (
            <p className="text-sm faint">Увійди, щоб бачити цей розрахунок.</p>
          ) : cropGenomes.length === 0 ? (
            <p className="text-sm faint">Ще немає збережених клонів цієї культури.</p>
          ) : arrangement ? (
            <div className="inset flex flex-col gap-3 text-sm">
              <div>
                <p className="label">Центр</p>
                <p className="mono mt-1 tracking-widest">{arrangement.centerGenes}</p>
              </div>
              <div>
                <p className="label">Сусіди ({arrangement.neighborGenesList.length}/8)</p>
                {arrangement.neighborGenesList.length === 0 ? (
                  <p className="mt-1 muted">Не потрібні.</p>
                ) : (
                  <ul className="mono mt-1 tracking-widest">
                    {arrangement.neighborGenesList.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="label">Найімовірніший результат</p>
                <p className="mono mt-1 tracking-widest">
                  {arrangement.likelyGenome}{" "}
                  <span className="text-xs faint tracking-normal">
                    ({arrangement.expectedMatches.toFixed(1)}/6)
                  </span>
                </p>
              </div>

              <div className="cost">
                <span className="label">
                  Шанс на <span className="mono">{DEFAULT_TARGET_GENOME}</span>
                </span>
                <span className="cost-value mono">{(arrangement.chance * 100).toFixed(1)}%</span>
              </div>

              {arrangement.chance > 0 && arrangement.chance < 1 && (
                <p className="muted">
                  ~{arrangement.expectedAttempts} {arrangement.expectedAttempts === 1 ? "спроба" : "спроб"} в
                  середньому.
                </p>
              )}
              {arrangement.chance === 0 && arrangement.expectedMatches < 6 && (
                <p className="muted leading-relaxed">
                  Ідеальний збіг наразі неможливий — з наявних клонів це найкраще, чого можна
                  досягти. Дозбирай клони, ближчі до {DEFAULT_TARGET_GENOME}, щоб покращити результат.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
