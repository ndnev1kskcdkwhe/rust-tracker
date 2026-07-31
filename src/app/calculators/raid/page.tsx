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
import { ExplosiveIcon } from "./ExplosiveIcon";

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
    <div className="page">
      <div className="shell">
        <Link href="/calculators" className="back-link">
          <span className="back-arrow">←</span> Усі калькулятори
        </Link>
        <h1 className="page-title rise">Рейд-калькулятор</h1>
        <p className="page-lede rise" style={{ ["--d" as string]: "60ms" }}>
          Дані про HP та шкоду вибухівки — з wiki.rustclash.com (станом на 30.07.2026). Шанс на
          дад ігнорується (100% детонація).
        </p>

        <div className="panel mt-7 flex flex-col gap-5 rise" style={{ ["--d" as string]: "120ms" }}>
          <fieldset className="flex flex-col gap-2">
            <legend className="label mb-2">Що ламаємо</legend>
            <div className="seg grid-cols-2">
              <button
                type="button"
                onClick={() => setKind("generic")}
                aria-pressed={kind === "generic"}
                className="seg-item"
              >
                Стіна / фундамент
              </button>
              <button
                type="button"
                onClick={() => setKind("door")}
                aria-pressed={kind === "door"}
                className="seg-item"
              >
                Двері
              </button>
            </div>
          </fieldset>

          {kind === "generic" ? (
            <div className="flex flex-wrap gap-4">
              <label className="field flex-1 min-w-[9rem]">
                Тир
                <select value={tier} onChange={(e) => setTier(e.target.value as Tier)} className="select">
                  {(Object.keys(TIER_LABELS) as Tier[]).map((t) => (
                    <option key={t} value={t}>
                      {TIER_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field flex-1 min-w-[9rem]">
                Сторона
                <select value={side} onChange={(e) => setSide(e.target.value as Side)} className="select">
                  <option value="hard">Тверда</option>
                  <option value="soft">М&apos;яка (верх фундаменту)</option>
                </select>
              </label>
            </div>
          ) : (
            <label className="field">
              Тип дверей
              <select value={door} onChange={(e) => setDoor(e.target.value as DoorType)} className="select">
                {(Object.keys(DOOR_LABELS) as DoorType[]).map((d) => (
                  <option key={d} value={d}>
                    {DOOR_LABELS[d]}
                  </option>
                ))}
              </select>
            </label>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="label mb-2">Доступна вибухівка</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {EXPLOSIVE_IDS.map((id) => (
                <label key={id} className="pick">
                  <input type="checkbox" checked={available.has(id)} onChange={() => toggleExplosive(id)} />
                  <ExplosiveIcon id={id} />
                  {EXPLOSIVES[id].label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="inset">
            <div className="flex items-baseline justify-between">
              <span className="label">HP цілі</span>
              <span className="mono text-sm">{targetHp}</span>
            </div>

            {result ? (
              <>
                <p className="label mt-4">Найдешевша комбінація</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {Object.entries(result.combination).map(([id, count]) => (
                    <li key={id} className="flex items-center gap-2 text-sm">
                      <ExplosiveIcon id={id as ExplosiveId} />
                      <span className="flex-1">{EXPLOSIVES[id as ExplosiveId].label}</span>
                      <span className="mono text-[var(--accent)] font-semibold">×{count}</span>
                    </li>
                  ))}
                </ul>
                <div className="cost">
                  <span className="label">Собівартість</span>
                  <span className="cost-value mono">
                    {result.totalSulfurCost.toLocaleString("uk-UA")} <span className="faint text-sm">сірки</span>
                  </span>
                </div>
              </>
            ) : (
              <p className="note note-bad mt-3">Обери хоча б один вид вибухівки.</p>
            )}
          </div>

          <p className="text-xs faint leading-relaxed">
            Кількість влучень окремими видами:{" "}
            {EXPLOSIVE_IDS.map((id) => {
              const hits = hitsNeeded(target, id);
              return hits != null ? `${EXPLOSIVES[id].label}: ${hits}` : null;
            })
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {/* Multi-object queue: same target config above, but add several to one running total */}
        <div className="panel mt-4 flex flex-col gap-4 rise" style={{ ["--d" as string]: "180ms" }}>
          <h2 className="section-title">Порахувати кілька об&apos;єктів</h2>
          <p className="text-sm muted leading-relaxed">
            Додай ціль, обрану вище (наприклад «{getTargetLabel(target)}»), потрібну кількість
            разів — і порахуй загальну собівартість рейду на всі об&apos;єкти разом.
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <label className="field w-24">
              Кількість
              <input
                type="number"
                min={1}
                value={queueQuantity}
                onChange={(e) => setQueueQuantity(Math.max(1, Number(e.target.value)))}
                className="input"
              />
            </label>
            <button type="button" onClick={handleAddToQueue} className="btn btn-primary">
              Додати в список
            </button>
          </div>

          {queue.length > 0 && (
            <>
              <div className="flex flex-col gap-2">
                {queue.map((item) => (
                  <div key={item.id} className="queue-item rise">
                    <span className="flex-1 text-sm">
                      {item.label} <span className="mono faint">×{item.quantity}</span>
                    </span>
                    <button type="button" onClick={() => removeFromQueue(item.id)} className="link-danger">
                      Видалити
                    </button>
                  </div>
                ))}
              </div>

              <div className="inset">
                <p className="label">Загальна вибухівка</p>
                {Object.keys(queueTotals.totalExplosives).length === 0 ? (
                  <p className="mt-2 text-sm faint">—</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {Object.entries(queueTotals.totalExplosives).map(([id, count]) => (
                      <li key={id} className="flex items-center gap-2 text-sm">
                        <ExplosiveIcon id={id as ExplosiveId} />
                        <span className="flex-1">{EXPLOSIVES[id as ExplosiveId].label}</span>
                        <span className="mono text-[var(--accent)] font-semibold">×{count}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="cost">
                  <span className="label">Загалом</span>
                  <span className="cost-value mono">
                    {queueTotals.totalCost.toLocaleString("uk-UA")} <span className="faint text-sm">сірки</span>
                  </span>
                </div>
                {queueTotals.hasUnreachable && (
                  <p className="note note-bad mt-3">
                    Один чи декілька об&apos;єктів у списку неможливо знести обраною вибухівкою —
                    вони не враховані в сумі.
                  </p>
                )}
              </div>

              <button type="button" onClick={() => setQueue([])} className="link-danger self-start">
                Очистити список
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
