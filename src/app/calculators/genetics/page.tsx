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
    return <span className="gene gene-empty">?</span>;
  }
  const isGreen = GENE_INFO[gene].category === "green";
  return (
    <span className={`gene ${isGreen ? "gene-good" : "gene-bad"}`} title={GENE_INFO[gene].label}>
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
        className="input mono uppercase tracking-widest"
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
    <div className="page">
      <div className="shell-wide">
        <Link href="/calculators" className="back-link">
          <span className="back-arrow">←</span> Усі калькулятори
        </Link>
        <h1 className="page-title rise">Генетика рослин</h1>
        <p className="page-lede rise" style={{ ["--d" as string]: "60ms" }}>
          Механіка схрещування — з rustbreeder.com і irust.ru/genetic (станом на 30.07.2026):
          зелені гени (G/Y/H) важать 0.6, червоні (W/X) — 1.0; ген сусідньої рослини перемагає
          в слоті, тільки якщо його вага більша за ген центральної; нічия — 50/50.
        </p>

        <Link
          href="/calculators/genetics/scan"
          className="btn btn-sm mt-5 rise"
          style={{ ["--d" as string]: "110ms" }}
        >
          Сканувати клони з екрана →
        </Link>

        {/* Cross predictor */}
        <div className="panel mt-5 flex flex-col gap-5 rise" style={{ ["--d" as string]: "160ms" }}>
          <h2 className="section-title">Прогноз схрещування (центр + 1 сусід)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="field">
              Центральна рослина
              <GenomeField value={centerInput} onChange={setCenterInput} />
            </label>
            <label className="field">
              Сусідня рослина
              <GenomeField value={neighborInput} onChange={setNeighborInput} />
            </label>
          </div>

          <label className="field">
            Цільовий геном
            <GenomeField value={targetInput} onChange={setTargetInput} />
          </label>

          <div className="flex flex-wrap gap-2">
            {GOD_CLONES.map((preset) => (
              <button
                key={preset.genes}
                type="button"
                onClick={() => setTargetInput(preset.genes)}
                className="badge cursor-pointer hover:border-[var(--accent-line)] transition-colors"
                title={preset.purpose}
              >
                <span className="mono">{preset.genes}</span> — {preset.label}
              </button>
            ))}
          </div>

          <div className="inset">
            {slots ? (
              <>
                <p className="label">Прогноз по слотах</p>
                <div className="mt-3 flex gap-4 overflow-x-auto pb-1">
                  {slots.map((outcomes, i) => (
                    <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
                      <span className="text-[0.6rem] faint">#{i + 1}</span>
                      {outcomes.map((o) => (
                        <div key={o.gene} className="flex items-center gap-1.5">
                          <GeneBadge gene={o.gene} />
                          <span className="mono text-xs faint">{Math.round(o.probability * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {target ? (
                  <div className="cost">
                    <span className="label">
                      Шанс на <span className="mono">{targetInput}</span>
                    </span>
                    <span className="cost-value mono">{((chanceOfTarget ?? 0) * 100).toFixed(1)}%</span>
                  </div>
                ) : (
                  <p className="note note-bad mt-3">
                    Введи коректний цільовий геном (6 літер G/Y/H/W/X).
                  </p>
                )}
              </>
            ) : (
              <p className="note note-bad">Введи два коректні геноми (по 6 літер G/Y/H/W/X) вище.</p>
            )}
          </div>
        </div>

        {/* My clones */}
        <div className="panel mt-4 flex flex-col gap-4 rise" style={{ ["--d" as string]: "220ms" }}>
          <h2 className="section-title">Мої клони</h2>

          <label className="field sm:max-w-xs">
            Культура
            <select value={crop} onChange={(e) => setCrop(e.target.value as Crop)} className="select">
              {CROPS.map((c) => (
                <option key={c} value={c}>
                  {CROP_LABELS[c]}
                </option>
              ))}
            </select>
          </label>

          {!isLoggedIn ? (
            <p className="text-sm muted">
              <Link href="/login" className="link-accent">
                Увійди
              </Link>{" "}
              щоб зберігати клони в базу й бачити, які з них варто лишити.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="field flex-1">
                  Новий клон
                  <GenomeField value={newGenomeInput} onChange={setNewGenomeInput} />
                </label>
                <label className="field flex-1">
                  Нотатка (необов&apos;язково)
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="input"
                  />
                </label>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveGenome}
                  className="btn btn-primary shrink-0"
                >
                  Зберегти
                </button>
              </div>
              {saveError && <p className="note note-bad">{saveError}</p>}

              <div className="flex flex-col gap-2">
                {cropGenomes.length === 0 && (
                  <p className="text-sm faint">Ще немає збережених клонів для цієї культури.</p>
                )}
                {sortedCropGenomes.map((g) => {
                  const genome = parseGenome(g.genes);
                  const classification = classifyGenome(genome, target);
                  const badgeClass =
                    classification === "target"
                      ? "badge-ok"
                      : classification === "keep"
                        ? "badge-warn"
                        : "";
                  const badgeText =
                    classification === "target" ? "Ціль" : classification === "keep" ? "Лишити" : "Викинути";
                  return (
                    <div key={g.id} className="queue-item flex-wrap">
                      <div className="flex gap-1">
                        {genome.map((gene, i) => (
                          <GeneBadge key={i} gene={gene} />
                        ))}
                      </div>
                      <span className="mono text-xs faint">{greenGeneCount(genome)}/6</span>
                      <span className={`badge ${badgeClass}`}>{badgeText}</span>
                      {g.label && <span className="text-sm muted">{g.label}</span>}
                      <button type="button" onClick={() => handleDelete(g.id)} className="link-danger ml-auto">
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
          <div className="panel mt-4 flex flex-col gap-4 rise" style={{ ["--d" as string]: "280ms" }}>
            <h2 className="section-title">Автопідбір розстановки</h2>
            <p className="text-sm muted leading-relaxed">
              Перебирає збережені клони обраної культури й шукає, який з них поставити в
              центр, а які — сусідами (до 8, з повторами), щоб максимізувати шанс отримати
              цільовий геном за одне схрещування.
            </p>

            {cropGenomes.length === 0 ? (
              <p className="text-sm faint">Потрібен хоча б один збережений клон цієї культури.</p>
            ) : !target ? (
              <p className="note note-bad">Введи коректний цільовий геном вище.</p>
            ) : arrangement ? (
              <div className="inset flex flex-col gap-4 text-sm">
                <div>
                  <p className="label">Центр</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="flex gap-1">
                      {parseGenome(arrangement.center.genes).map((gene, i) => (
                        <GeneBadge key={i} gene={gene} />
                      ))}
                    </div>
                    {arrangement.center.label && <span className="muted">{arrangement.center.label}</span>}
                  </div>
                </div>

                <div>
                  <p className="label">Сусіди ({arrangement.neighbors.length}/8)</p>
                  {arrangement.neighbors.length === 0 ? (
                    <p className="mt-2 muted">Не потрібні — центр вже підходить сам по собі.</p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2">
                      {arrangement.neighbors.map((n, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2">
                          <div className="flex gap-1">
                            {parseGenome(n.genes).map((gene, i) => (
                              <GeneBadge key={i} gene={gene} />
                            ))}
                          </div>
                          {n.label && <span className="muted">{n.label}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="label">Найімовірніший результат</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="flex gap-1">
                      {arrangement.likelyGenome.map((gene, i) => (
                        <GeneBadge key={i} gene={gene} />
                      ))}
                    </div>
                    <span className="mono text-xs faint">
                      {arrangement.expectedMatches.toFixed(1)}/6 співпадінь
                    </span>
                  </div>
                </div>

                <div className="cost">
                  <span className="label">
                    Шанс на <span className="mono">{targetInput}</span>
                  </span>
                  <span className="cost-value mono">{(arrangement.chance * 100).toFixed(1)}%</span>
                </div>

                {arrangement.chance > 0 && arrangement.chance < 1 && (
                  <p className="muted leading-relaxed">
                    В середньому знадобиться ~{arrangement.expectedAttempts}{" "}
                    {arrangement.expectedAttempts === 1 ? "спроба" : "спроб"} з цією ж
                    розстановкою (клонуй центр і повторюй, поки не вийде).
                  </p>
                )}
                {arrangement.chance === 0 && arrangement.expectedMatches < 6 && (
                  <p className="muted leading-relaxed">
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
