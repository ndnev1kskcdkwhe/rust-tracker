"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DOOR_HP,
  EXPLOSIVES,
  TIER_HP,
  type DoorType,
  type ExplosiveId,
  type RaidTarget,
  type Side,
  type Tier,
} from "@/lib/calculators/raid/data";
import { cheapestCombination, hitsNeeded } from "@/lib/calculators/raid/raid";

const TIER_LABELS: Record<Tier, string> = {
  twig: "Гілки (Twig)",
  wood: "Дерево",
  stone: "Камінь",
  metal: "Метал",
  armored: "Бронь",
};

const DOOR_LABELS: Record<DoorType, string> = {
  woodenDoor: "Дерев'яні двері",
  sheetMetalDoor: "Металеві двері",
  garageDoor: "Гаражні ворота",
  armoredDoor: "Броньовані двері",
};

const EXPLOSIVE_IDS = Object.keys(EXPLOSIVES) as ExplosiveId[];

function getTargetLabel(target: RaidTarget): string {
  if (target.kind === "generic") {
    return `${TIER_LABELS[target.tier]} (${target.side === "hard" ? "тверда" : "м'яка"})`;
  }
  return DOOR_LABELS[target.door];
}

interface QueueItem {
  id: string;
  target: RaidTarget;
  label: string;
  quantity: number;
}

export default function RaidCalculatorPage() {
  const [kind, setKind] = useState<"generic" | "door">("generic");
  const [tier, setTier] = useState<Tier>("stone");
  const [side, setSide] = useState<Side>("hard");
  const [door, setDoor] = useState<DoorType>("sheetMetalDoor");
  const [available, setAvailable] = useState<Set<ExplosiveId>>(new Set(EXPLOSIVE_IDS));
  const [queueQuantity, setQueueQuantity] = useState(1);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const target: RaidTarget = useMemo(
    () => (kind === "generic" ? { kind, tier, side } : { kind, door }),
    [kind, tier, side, door]
  );

  const availableList = useMemo(() => Array.from(available), [available]);

  const result = useMemo(
    () => cheapestCombination(target, availableList),
    [target, availableList]
  );

  const targetHp = kind === "generic" ? TIER_HP[tier] : DOOR_HP[door];

  const toggleExplosive = (id: ExplosiveId) => {
    setAvailable((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddToQueue = () => {
    setQueue((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, target, label: getTargetLabel(target), quantity: queueQuantity },
    ]);
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const queueTotals = useMemo(() => {
    let totalCost = 0;
    const totalExplosives: Partial<Record<ExplosiveId, number>> = {};
    let hasUnreachable = false;

    for (const item of queue) {
      const itemResult = cheapestCombination(item.target, availableList);
      if (!itemResult) {
        hasUnreachable = true;
        continue;
      }
      totalCost += itemResult.totalSulfurCost * item.quantity;
      for (const [id, count] of Object.entries(itemResult.combination)) {
        const key = id as ExplosiveId;
        totalExplosives[key] = (totalExplosives[key] ?? 0) + count * item.quantity;
      }
    }

    return { totalCost, totalExplosives, hasUnreachable };
  }, [queue, availableList]);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-2xl">
        <Link href="/calculators" className="text-sm text-zinc-600 dark:text-zinc-400">
          ← Усі калькулятори
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-zinc-50">
          Рейд-калькулятор
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Дані про HP та шкоду вибухівки — з wiki.rustclash.com (станом на 30.07.2026). Шанс на
          дад ігнорується (100% детонація).
        </p>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Що ламаємо</legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={kind === "generic"}
                  onChange={() => setKind("generic")}
                />
                Стіна / фундамент / підлога
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={kind === "door"} onChange={() => setKind("door")} />
                Двері
              </label>
            </div>
          </fieldset>

          {kind === "generic" ? (
            <div className="flex gap-4">
              <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                Тир
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as Tier)}
                  className="rounded-lg border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
                >
                  {(Object.keys(TIER_LABELS) as Tier[]).map((t) => (
                    <option key={t} value={t}>
                      {TIER_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                Сторона
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as Side)}
                  className="rounded-lg border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
                >
                  <option value="hard">Тверда</option>
                  <option value="soft">М&apos;яка (верх фундаменту)</option>
                </select>
              </label>
            </div>
          ) : (
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Тип дверей
              <select
                value={door}
                onChange={(e) => setDoor(e.target.value as DoorType)}
                className="rounded-lg border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
              >
                {(Object.keys(DOOR_LABELS) as DoorType[]).map((d) => (
                  <option key={d} value={d}>
                    {DOOR_LABELS[d]}
                  </option>
                ))}
              </select>
            </label>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Доступна вибухівка
            </legend>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {EXPLOSIVE_IDS.map((id) => (
                <label key={id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={available.has(id)}
                    onChange={() => toggleExplosive(id)}
                  />
                  {EXPLOSIVES[id].label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="rounded-xl bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">HP цілі: {targetHp}</p>
            {result ? (
              <>
                <p className="mt-2 font-medium text-black dark:text-zinc-50">Найдешевша комбінація:</p>
                <ul className="mt-1 list-disc pl-5 text-zinc-700 dark:text-zinc-300">
                  {Object.entries(result.combination).map(([id, count]) => (
                    <li key={id}>
                      {EXPLOSIVES[id as ExplosiveId].label} × {count}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-medium text-black dark:text-zinc-50">
                  Собівартість: {result.totalSulfurCost.toLocaleString("uk-UA")} сірки
                </p>
              </>
            ) : (
              <p className="mt-2 text-red-600 dark:text-red-400">
                Обери хоча б один вид вибухівки.
              </p>
            )}
          </div>

          <div className="text-xs text-zinc-500 dark:text-zinc-500">
            Кількість влучень окремими видами вибухівки:{" "}
            {EXPLOSIVE_IDS.map((id) => {
              const hits = hitsNeeded(target, id);
              return hits != null ? `${EXPLOSIVES[id].label}: ${hits}` : null;
            })
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>

        {/* Multi-object queue: same target config above, but add several to one running total */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">Порахувати кілька об&apos;єктів</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Додай ціль, обрану вище (наприклад «{getTargetLabel(target)}»), потрібну кількість
            разів — і порахуй загальну собівартість рейду на всі об&apos;єкти разом.
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Кількість
              <input
                type="number"
                min={1}
                value={queueQuantity}
                onChange={(e) => setQueueQuantity(Math.max(1, Number(e.target.value)))}
                className="w-24 rounded-lg border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <button
              type="button"
              onClick={handleAddToQueue}
              className="h-11 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Додати «{getTargetLabel(target)}» у список
            </button>
          </div>

          {queue.length > 0 && (
            <>
              <div className="flex flex-col gap-2">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl bg-zinc-100 p-3 text-sm dark:bg-zinc-900"
                  >
                    <span className="flex-1 text-black dark:text-zinc-50">
                      {item.label} × {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromQueue(item.id)}
                      className="text-xs text-red-600 hover:underline dark:text-red-400"
                    >
                      Видалити
                    </button>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
                <p className="font-medium text-black dark:text-zinc-50">Загальна вибухівка:</p>
                {Object.keys(queueTotals.totalExplosives).length === 0 ? (
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">—</p>
                ) : (
                  <ul className="mt-1 list-disc pl-5 text-zinc-700 dark:text-zinc-300">
                    {Object.entries(queueTotals.totalExplosives).map(([id, count]) => (
                      <li key={id}>
                        {EXPLOSIVES[id as ExplosiveId].label} × {count}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 font-medium text-black dark:text-zinc-50">
                  Загальна собівартість: {queueTotals.totalCost.toLocaleString("uk-UA")} сірки
                </p>
                {queueTotals.hasUnreachable && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Один чи декілька об&apos;єктів у списку неможливо знести обраною вибухівкою —
                    вони не враховані в сумі.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setQueue([])}
                className="self-start text-xs text-red-600 hover:underline dark:text-red-400"
              >
                Очистити список
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
