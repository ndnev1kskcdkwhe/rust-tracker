"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { createWorker, type Worker } from "tesseract.js";
import { CROPS, CROP_LABELS, DEFAULT_TARGET_GENOME, type Crop } from "@/lib/calculators/genetics/data";
import { classifyGenome, isValidGenome, parseGenome } from "@/lib/calculators/genetics/genetics";
import { findBestArrangement } from "@/lib/calculators/genetics/arrangement";
import { parseGenesFromOcrText } from "@/lib/calculators/genetics/ocr";

type Rect = { x: number; y: number; width: number; height: number };

interface QueuedClone {
  id: string;
  genes: string;
}

interface ResolvedArrangement {
  centerGenes: string;
  neighborGenesList: string[];
  chance: number;
  expectedAttempts: number;
}

const SCAN_INTERVAL_MS = 1200;

export default function GeneticsScanPage() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session?.user;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastGenesRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [calibration, setCalibration] = useState<Rect | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragRect, setDragRect] = useState<Rect | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastOcrText, setLastOcrText] = useState<string>("");
  const [isTestingOcr, setIsTestingOcr] = useState(false);
  const [crop, setCrop] = useState<Crop>("HEMP");
  const [queue, setQueue] = useState<QueuedClone[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [targetInput, setTargetInput] = useState(DEFAULT_TARGET_GENOME);
  const [arrangement, setArrangement] = useState<ResolvedArrangement | null>(null);
  const [arrangementError, setArrangementError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, []);

  function stopEverything() {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
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
      setCalibration(null);
    } catch {
      setErrorMessage("Не вдалося отримати доступ до екрана.");
    }
  }

  function getOverlayRect() {
    return overlayRef.current?.getBoundingClientRect() ?? null;
  }

  function handleMouseDown(e: React.MouseEvent) {
    const rect = getOverlayRect();
    if (!rect) return;
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragRect(null);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragStart) return;
    const rect = getOverlayRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragRect({
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      width: Math.abs(x - dragStart.x),
      height: Math.abs(y - dragStart.y),
    });
  }

  function handleMouseUp() {
    if (!dragRect || !videoRef.current) {
      setDragStart(null);
      return;
    }
    const overlay = getOverlayRect();
    const video = videoRef.current;
    if (!overlay || video.clientWidth === 0) {
      setDragStart(null);
      return;
    }
    const scaleX = video.videoWidth / overlay.width;
    const scaleY = video.videoHeight / overlay.height;
    setCalibration({
      x: dragRect.x * scaleX,
      y: dragRect.y * scaleY,
      width: dragRect.width * scaleX,
      height: dragRect.height * scaleY,
    });
    setDragStart(null);
  }

  async function ensureWorker(): Promise<Worker> {
    if (!workerRef.current) {
      workerRef.current = await createWorker("eng");
    }
    return workerRef.current;
  }

  async function scanOnce() {
    if (!calibration || !videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const scaleUp = 3;
    canvas.width = calibration.width * scaleUp;
    canvas.height = calibration.height * scaleUp;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      video,
      calibration.x,
      calibration.y,
      calibration.width,
      calibration.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const worker = await ensureWorker();
    const {
      data: { text },
    } = await worker.recognize(canvas);
    setLastOcrText(text.trim());

    const genes = parseGenesFromOcrText(text);
    if (genes && genes !== lastGenesRef.current) {
      lastGenesRef.current = genes;
      setQueue((prev) => [{ id: `${Date.now()}-${Math.random()}`, genes }, ...prev]);
      playPumSound();
    }
    if (!genes) {
      lastGenesRef.current = null;
    }
  }

  async function handleTestOcr() {
    setIsTestingOcr(true);
    await scanOnce();
    setIsTestingOcr(false);
  }

  function handleStartScanning() {
    if (!calibration) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    setIsScanning(true);
    scanTimerRef.current = setInterval(scanOnce, SCAN_INTERVAL_MS);
  }

  function handleStopScanning() {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    setIsScanning(false);
  }

  function updateQueueGenes(id: string, genes: string) {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, genes: genes.toUpperCase() } : item)));
  }

  function removeFromQueue(id: string) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }

  function handleFindBestArrangement() {
    setArrangementError(null);
    setArrangement(null);
    const validItems = queue.filter((item) => isValidGenome(item.genes));
    if (validItems.length === 0) {
      setArrangementError("Немає жодного коректного розпізнаного клону (6 літер G/Y/H/W/X).");
      return;
    }
    if (!isValidGenome(targetInput)) {
      setArrangementError("Цільовий геном має бути рівно 6 літер: G, Y, H, W, X.");
      return;
    }
    const pool = validItems.map((item) => parseGenome(item.genes));
    const result = findBestArrangement(pool, parseGenome(targetInput));
    if (!result) {
      setArrangementError("Не вдалося підібрати розстановку.");
      return;
    }
    setArrangement({
      centerGenes: validItems[result.centerIndex].genes,
      neighborGenesList: result.neighborIndices.map((i) => validItems[i].genes),
      chance: result.chance,
      expectedAttempts: result.expectedAttempts,
    });
  }

  async function handleSaveAll() {
    setIsSaving(true);
    const valid = queue.filter((item) => isValidGenome(item.genes));
    for (const item of valid) {
      await fetch("/api/genomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop, genes: item.genes }),
      });
    }
    setQueue((prev) => prev.filter((item) => !isValidGenome(item.genes)));
    setIsSaving(false);
  }

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
          Розпізнавання калібрується під ці параметри й не буде надійним при іншому масштабі.
        </div>

        <ol className="mt-4 list-decimal pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>Захопи екран/вікно з грою.</li>
          <li>Один раз виділи прямокутником рядок «Genetics ...» у підказці клону.</li>
          <li>Натисни «Почати сканування» і наводь курсор по черзі на кожен клон у грі.</li>
          <li>Перевір список розпізнаного нижче і збережи в базу.</li>
        </ol>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          {errorMessage && <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}

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
            <div
              ref={overlayRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="relative w-full cursor-crosshair overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]"
            >
              <video ref={videoRef} autoPlay muted playsInline className="block w-full select-none" />
              {dragRect && (
                <div
                  className="pointer-events-none absolute border-2 border-dashed border-green-500 bg-green-500/20"
                  style={{ left: dragRect.x, top: dragRect.y, width: dragRect.width, height: dragRect.height }}
                />
              )}
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              {calibration
                ? "Область для сканування вибрана. Можеш виділити її ще раз, якщо потрібно виправити."
                : "Виділи прямокутником рядок «Genetics ...» на відео вище."}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {!isScanning ? (
                <button
                  type="button"
                  disabled={!calibration}
                  onClick={handleStartScanning}
                  className="h-11 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
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
                disabled={!calibration || isTestingOcr}
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

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">
            Розпізнані клони ({queue.length})
          </h2>

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Культура (застосується до всіх збережень нижче)
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value as Crop)}
              className="w-fit rounded-lg border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
            >
              {CROPS.map((c) => (
                <option key={c} value={c}>
                  {CROP_LABELS[c]}
                </option>
              ))}
            </select>
          </label>

          {queue.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              Ще нічого не розпізнано. Почни сканування вище.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {[...queue]
                .sort((a, b) => {
                  const target = isValidGenome(targetInput) ? parseGenome(targetInput) : null;
                  const order = { target: 0, keep: 1, discard: 2 } as const;
                  const classA = isValidGenome(a.genes) ? classifyGenome(parseGenome(a.genes), target) : "discard";
                  const classB = isValidGenome(b.genes) ? classifyGenome(parseGenome(b.genes), target) : "discard";
                  return order[classA] - order[classB];
                })
                .map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl bg-zinc-100 p-3 dark:bg-zinc-900">
                    <input
                      type="text"
                      value={item.genes}
                      onChange={(e) => updateQueueGenes(item.id, e.target.value.slice(0, 6))}
                      className={`w-28 rounded-lg border px-2 py-1 font-mono text-sm ${
                        isValidGenome(item.genes)
                          ? "border-black/[.08] dark:border-white/[.145]"
                          : "border-red-500"
                      } text-black dark:bg-zinc-800 dark:text-zinc-50`}
                    />
                    {isValidGenome(item.genes) &&
                      isValidGenome(targetInput) &&
                      classifyGenome(parseGenome(item.genes), parseGenome(targetInput)) === "target" && (
                        <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                          Ціль
                        </span>
                      )}
                    {!isValidGenome(item.genes) && (
                      <span className="text-xs text-red-600 dark:text-red-400">невірний геном</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFromQueue(item.id)}
                      className="ml-auto text-xs text-red-600 hover:underline dark:text-red-400"
                    >
                      Видалити
                    </button>
                  </div>
                ))}
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-xl border border-black/[.08] p-4 dark:border-white/[.145]">
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Цільовий геном
              <input
                type="text"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value.toUpperCase().slice(0, 6))}
                className="w-40 rounded-lg border border-black/[.08] px-3 py-2 font-mono uppercase text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <button
              type="button"
              onClick={handleFindBestArrangement}
              className="h-11 self-start rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Показати найкращі варіанти схрещування
            </button>

            {arrangementError && (
              <p className="text-sm text-red-600 dark:text-red-400">{arrangementError}</p>
            )}

            {arrangement && (
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
                    ~{arrangement.expectedAttempts}{" "}
                    {arrangement.expectedAttempts === 1 ? "спроба" : "спроб"} в середньому.
                  </p>
                )}
                {arrangement.chance === 0 && (
                  <p className="text-red-600 dark:text-red-400">
                    З розпізнаних клонів цю ціль отримати неможливо.
                  </p>
                )}
              </div>
            )}
          </div>

          {!isLoggedIn ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/login" className="font-medium text-black dark:text-zinc-50">
                Увійди
              </Link>{" "}
              щоб зберегти розпізнані клони в базу.
            </p>
          ) : (
            <button
              type="button"
              disabled={isSaving || queue.filter((i) => isValidGenome(i.genes)).length === 0}
              onClick={handleSaveAll}
              className="h-11 self-start rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              Зберегти все в базу
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
