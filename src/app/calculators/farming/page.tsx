"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FARMING_DATA, RESOURCE_LABELS, type Resource } from "@/lib/calculators/farming/data";
import { averageYieldPerHit, hitsNeeded, timeNeededSeconds } from "@/lib/calculators/farming/farming";

const RESOURCE_IDS = Object.keys(RESOURCE_LABELS) as Resource[];

function formatDuration(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours} год`);
  if (hours > 0 || minutes > 0) parts.push(`${minutes} хв`);
  parts.push(`${secs} с`);
  return parts.join(" ");
}

export default function FarmingCalculatorPage() {
  const [resource, setResource] = useState<Resource>("wood");
  const toolIds = useMemo(() => Object.keys(FARMING_DATA[resource]), [resource]);
  const [toolId, setToolId] = useState(toolIds[0]);

  const handleResourceChange = (next: Resource) => {
    setResource(next);
    setToolId(Object.keys(FARMING_DATA[next])[0]);
  };
  const [quantity, setQuantity] = useState(1000);
  const [multiplier, setMultiplier] = useState(1);

  const yieldPerHit = averageYieldPerHit(resource, toolId) * multiplier;
  const hits = hitsNeeded(resource, toolId, quantity, multiplier);
  const timeSec = timeNeededSeconds(resource, toolId, quantity, multiplier);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-2xl">
        <Link href="/calculators" className="text-sm text-zinc-600 dark:text-zinc-400">
          ← Усі калькулятори
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-zinc-50">
          Калькулятор фермерства
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Вихід на удар — наближене значення, виведене з загального видобутку ноди та діапазону
          часу її виснаження (wiki.rustclash.com не публікує точну константу на удар).
        </p>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <div className="flex gap-4">
            <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Ресурс
              <select
                value={resource}
                onChange={(e) => handleResourceChange(e.target.value as Resource)}
                className="rounded-lg border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
              >
                {RESOURCE_IDS.map((r) => (
                  <option key={r} value={r}>
                    {RESOURCE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Інструмент
              <select
                value={toolId}
                onChange={(e) => setToolId(e.target.value)}
                className="rounded-lg border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
              >
                {toolIds.map((id) => (
                  <option key={id} value={id}>
                    {FARMING_DATA[resource][id].toolLabel}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex gap-4">
            <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Потрібна кількість
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="rounded-lg border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Множник збору сервера
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={multiplier}
                onChange={(e) => setMultiplier(Math.max(0.1, Number(e.target.value)))}
                className="rounded-lg border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          </div>

          <div className="rounded-xl bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">
              ≈ {yieldPerHit.toFixed(1)} за удар (з урахуванням множника)
            </p>
            <p className="mt-2 font-medium text-black dark:text-zinc-50">
              Ударів потрібно: {hits.toLocaleString("uk-UA")}
            </p>
            <p className="mt-1 font-medium text-black dark:text-zinc-50">
              Орієнтовний час: {formatDuration(timeSec)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
