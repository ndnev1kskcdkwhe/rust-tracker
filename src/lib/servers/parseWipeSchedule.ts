export type WipeCycle = "weekly" | "biweekly" | "monthly";

const CYCLE_DAYS: Record<WipeCycle, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

/**
 * Best-effort detection of a server's wipe cycle from its name — there's no API field for
 * this, some admins just say it outright (e.g. "Monthly", "Weekly wipe"). Returns null when
 * the name says nothing about it, rather than guessing a default cycle.
 */
export function parseWipeCycleFromText(text: string): WipeCycle | null {
  const lower = text.toLowerCase();
  if (/\bbi[\s-]?weekly\b/.test(lower)) {
    return "biweekly";
  }
  if (/\bmonthly\b/.test(lower)) {
    return "monthly";
  }
  if (/\bweekly\b/.test(lower)) {
    return "weekly";
  }
  return null;
}

/**
 * Rough next-wipe estimate: last wipe + detected cycle length. This is explicitly an estimate
 * (real schedules can slip, force-wipes happen, etc.) — callers should label it as such, never
 * present it as a confirmed time.
 */
export function estimateNextWipe(wipedAt: string | null, cycle: WipeCycle | null): string | null {
  if (!wipedAt || !cycle) {
    return null;
  }
  const lastWipe = new Date(wipedAt).getTime();
  return new Date(lastWipe + CYCLE_DAYS[cycle] * 24 * 60 * 60 * 1000).toISOString();
}
