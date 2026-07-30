"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  CROPS,
  CROP_LABELS,
  DEFAULT_TARGET_GENOME,
  GENE_INFO,
  GENOME_LENGTH,
  GOD_CLONES,
  type Crop,
  type Gene,
} from "@/lib/calculators/genetics/data";
import {
  chanceOfExactGenome,
  classifyGenome,
  greenGeneCount,
  isValidGenome,
  parseGenome,
  predictCross,
  type GenomeClassification,
  type SlotOutcome,
} from "@/lib/calculators/genetics/genetics";
import { findBestArrangement } from "@/lib/calculators/genetics/arrangement";

const CLASSIFICATION_ORDER: Record<GenomeClassification, number> = { target: 0, keep: 1, discard: 2 };

interface SavedGenome {
  id: string;
  crop: Crop;
  genes: string;
  label: string | null;
  createdAt: string;
}

function GeneBadge({ gene }: { gene: Gene | null }) {
  if (!gene) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-zinc-400 text-xs text-zinc-400">
        ?
      </span>
    );
  }
  const isGreen = GENE_INFO[gene].category === "green";
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white ${
        isGreen ? "bg-green-600" : "bg-red-600"
      }`}
      title={GENE_INFO[gene].label}
    >
      {gene}
    </span>
  );
}

function GenomeField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const chars = value.toUpperCase().padEnd(GENOME_LENGTH, " ").slice(0, GENOME_LENGTH).split("");
  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={value}
        placeholder={placeholder ?? "напр. GGGYYY"}
        onChange={(e) => onChange(e.target.value.toUpperCase().slice(0, GENOME_LENGTH))}
        className="rounded-lg border border-black/[.08] px-3 py-2 font-mono uppercase text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
      />
      <div className="flex gap-1">
        {chars.map((ch, i) => (
          <GeneBadge key={i} gene={(["G", "Y", "H", "W", "X"] as Gene[]).includes(ch as Gene) ? (ch as Gene) : null} />
        ))}
      </div>
    </div>
  );
}

export default function GeneticsCalculatorPage() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session?.user;

  const [centerInput, setCenterInput] = useState("GGGYYY");
  const [neighborInput, setNeighborInput] = useState("WWWWWW");
  const [targetInput, setTargetInput] = useState(DEFAULT_TARGET_GENOME);

  const [crop, setCrop] = useState<Crop>("HEMP");
  const [newGenomeInput, setNewGenomeInput] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [savedGenomes, setSavedGenomes] = useState<SavedGenome[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    fetch("/api/genomes")
      .then((res) => res.json())
      .then((data) => setSavedGenomes(Array.isArray(data) ? data : []));
  }, [isLoggedIn]);

  const targetValid = isValidGenome(targetInput);
  const target = targetValid ? parseGenome(targetInput) : null;

  const slots: SlotOutcome[][] | null = useMemo(() => {
    if (!isValidGenome(centerInput) || !isValidGenome(neighborInput)) {
      return null;
    }
    return predictCross(parseGenome(centerInput), [parseGenome(neighborInput)]);
  }, [centerInput, neighborInput]);

  const chanceOfTarget = slots && target ? chanceOfExactGenome(slots, target) : null;

  const cropGenomes = useMemo(
    () => (isLoggedIn ? (savedGenomes ?? []).filter((g) => g.crop === crop) : []),
    [isLoggedIn, savedGenomes, crop]
  );

  const sortedCropGenomes = useMemo(() => {
    return [...cropGenomes].sort((a, b) => {
      const classA = classifyGenome(parseGenome(a.genes), target);
      const classB = classifyGenome(parseGenome(b.genes), target);
      return CLASSIFICATION_ORDER[classA] - CLASSIFICATION_ORDER[classB];
    });
  }, [cropGenomes, target]);

  const arrangement = useMemo(() => {
    if (!target || cropGenomes.length === 0) {
      return null;
    }
    const pool = cropGenomes.map((g) => parseGenome(g.genes));
    const result = findBestArrangement(pool, target);
    if (!result) {
      return null;
    }
    return {
      center: cropGenomes[result.centerIndex],
      neighbors: result.neighborIndices.map((i) => cropGenomes[i]),
      chance: result.chance,
      expectedAttempts: result.expectedAttempts,
      expectedMatches: result.expectedMatches,
      likelyGenome: result.likelyGenome,
    };
  }, [cropGenomes, target]);

  const handleSaveGenome = async () => {
    setSaveError(null);
    if (!isValidGenome(newGenomeInput)) {
      setSaveError("Геном має бути рівно 6 літер: G, Y, H, W, X");
      return;
    }
    setIsSaving(true);
    const response = await fetch("/api/genomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crop, genes: newGenomeInput, label: newLabel }),
    });
    setIsSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setSaveError(data.error ?? "Не вдалося зберегти клон");
      return;
    }
    const created: SavedGenome = await response.json();
    setSavedGenomes((prev) => [created, ...(prev ?? [])]);
    setNewGenomeInput("");
    setNewLabel("");
  };

  const handleDelete = async (id: string) => {
    setSavedGenomes((prev) => (prev ?? []).filter((g) => g.id !== id));
    await fetch(`/api/genomes/${id}`, { method: "DELETE" });
  };

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-3xl">
        <Link href="/calculators" className="text-sm text-zinc-600 dark:text-zinc-400">
          ← Усі калькулятори
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-zinc-50">
          Генетика рослин
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Механіка схрещування — з rustbreeder.com і irust.ru/genetic (станом на 30.07.2026):
          зелені гени (G/Y/H) важать 0.6, червоні (W/X) — 1.0; ген сусідньої рослини перемагає
          в слоті, тільки якщо його вага більша за ген центральної; нічия — 50/50.
        </p>

        <Link
          href="/calculators/genetics/scan"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-solid border-black/[.08] px-6 text-sm font-medium transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Сканувати клони з екрана →
        </Link>

        {/* Cross predictor */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">
            Прогноз схрещування (центр + 1 сусід)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Центральна рослина
              <GenomeField value={centerInput} onChange={setCenterInput} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Сусідня рослина
              <GenomeField value={neighborInput} onChange={setNeighborInput} />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Цільовий геном
            <GenomeField value={targetInput} onChange={setTargetInput} />
          </label>

          <div className="flex flex-wrap gap-2">
            {GOD_CLONES.map((preset) => (
              <button
                key={preset.genes}
                type="button"
                onClick={() => setTargetInput(preset.genes)}
                className="rounded-full border border-black/[.08] px-3 py-1 text-xs text-zinc-700 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]"
                title={preset.purpose}
              >
                {preset.genes} — {preset.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
            {slots ? (
              <>
                <p className="font-medium text-black dark:text-zinc-50">Прогноз по слотах:</p>
                <div className="mt-2 flex gap-3 overflow-x-auto">
                  {slots.map((outcomes, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-xs text-zinc-500">#{i + 1}</span>
                      {outcomes.map((o) => (
                        <div key={o.gene} className="flex items-center gap-1">
                          <GeneBadge gene={o.gene} />
                          <span className="text-xs text-zinc-600 dark:text-zinc-400">
                            {Math.round(o.probability * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {target ? (
                  <p className="mt-3 font-medium text-black dark:text-zinc-50">
                    Шанс отримати цільовий геном {targetInput}: {((chanceOfTarget ?? 0) * 100).toFixed(1)}%
                  </p>
                ) : (
                  <p className="mt-3 text-red-600 dark:text-red-400">
                    Введи коректний цільовий геном (6 літер G/Y/H/W/X).
                  </p>
                )}
              </>
            ) : (
              <p className="text-red-600 dark:text-red-400">
                Введи два коректні геноми (по 6 літер G/Y/H/W/X) вище.
              </p>
            )}
          </div>
        </div>

        {/* My clones */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">Мої клони</h2>

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
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

          {!isLoggedIn ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/login" className="font-medium text-black dark:text-zinc-50">
                Увійди
              </Link>{" "}
              щоб зберігати клони в базу й бачити, які з них варто лишити.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                  Новий клон
                  <GenomeField value={newGenomeInput} onChange={setNewGenomeInput} />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                  Нотатка (необов&apos;язково)
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="rounded-lg border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </label>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveGenome}
                  className="h-11 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
                >
                  Зберегти
                </button>
              </div>
              {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}

              <div className="flex flex-col gap-2">
                {cropGenomes.length === 0 && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-500">
                    Ще немає збережених клонів для цієї культури.
                  </p>
                )}
                {sortedCropGenomes.map((g) => {
                  const genome = parseGenome(g.genes);
                  const classification = classifyGenome(genome, target);
                  const badgeClass =
                    classification === "target"
                      ? "bg-green-600 text-white"
                      : classification === "keep"
                        ? "bg-yellow-500 text-black"
                        : "bg-zinc-400 text-black";
                  const badgeText =
                    classification === "target" ? "Ціль" : classification === "keep" ? "Лишити" : "Викинути";
                  return (
                    <div
                      key={g.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl bg-zinc-100 p-3 dark:bg-zinc-900"
                    >
                      <div className="flex gap-1">
                        {genome.map((gene, i) => (
                          <GeneBadge key={i} gene={gene} />
                        ))}
                      </div>
                      <span className="text-xs text-zinc-500">{greenGeneCount(genome)}/6 зелених</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                        {badgeText}
                      </span>
                      {g.label && <span className="text-sm text-zinc-600 dark:text-zinc-400">{g.label}</span>}
                      <button
                        type="button"
                        onClick={() => handleDelete(g.id)}
                        className="ml-auto text-xs text-red-600 hover:underline dark:text-red-400"
                      >
                        Видалити
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Auto-arrangement */}
        {isLoggedIn && (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <h2 className="text-lg font-medium text-black dark:text-zinc-50">
              Автопідбір розстановки
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Перебирає збережені клони обраної культури й шукає, який з них поставити в
              центр, а які — сусідами (до 8, з повторами), щоб максимізувати шанс отримати
              цільовий геном за одне схрещування.
            </p>

            {cropGenomes.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-500">
                Потрібен хоча б один збережений клон цієї культури.
              </p>
            ) : !target ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                Введи коректний цільовий геном вище.
              </p>
            ) : arrangement ? (
              <div className="flex flex-col gap-3 rounded-xl bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
                <div>
                  <p className="text-xs text-zinc-500">Центр</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex gap-1">
                      {parseGenome(arrangement.center.genes).map((gene, i) => (
                        <GeneBadge key={i} gene={gene} />
                      ))}
                    </div>
                    {arrangement.center.label && (
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {arrangement.center.label}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">
                    Сусіди ({arrangement.neighbors.length}/8)
                  </p>
                  {arrangement.neighbors.length === 0 ? (
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                      Не потрібні — центр вже підходить сам по собі.
                    </p>
                  ) : (
                    <div className="mt-1 flex flex-col gap-2">
                      {arrangement.neighbors.map((n, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {parseGenome(n.genes).map((gene, i) => (
                              <GeneBadge key={i} gene={gene} />
                            ))}
                          </div>
                          {n.label && (
                            <span className="text-zinc-600 dark:text-zinc-400">{n.label}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-zinc-500">Найімовірніший результат</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex gap-1">
                    {arrangement.likelyGenome.map((gene, i) => (
                      <GeneBadge key={i} gene={gene} />
                    ))}
                  </div>
                  <span className="text-xs text-zinc-500">
                    ({arrangement.expectedMatches.toFixed(1)}/6 співпадінь)
                  </span>
                </div>

                <p className="mt-2 font-medium text-black dark:text-zinc-50">
                  Шанс отримати ідеальний {targetInput}: {(arrangement.chance * 100).toFixed(1)}%
                </p>
                {arrangement.chance > 0 && arrangement.chance < 1 && (
                  <p className="text-zinc-600 dark:text-zinc-400">
                    В середньому знадобиться ~{arrangement.expectedAttempts}{" "}
                    {arrangement.expectedAttempts === 1 ? "спроба" : "спроб"} з цією ж
                    розстановкою (клонуй центр і повторюй, поки не вийде).
                  </p>
                )}
                {arrangement.chance === 0 && arrangement.expectedMatches < 6 && (
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Ідеальний збіг наразі неможливий — це найкраще, чого можна досягти з наявних
                    клонів. Дозбирай клони, ближчі до цілі, щоб покращити результат.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
