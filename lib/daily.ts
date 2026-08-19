import type { SolvedProblem } from "./cf";

/**
 * Per-day activity: the calendar, the solves-per-day series and the weighted
 * daily score.
 *
 * Days here are **local**, not UTC. The rest of the codebase buckets by UTC,
 * which is right for period comparisons but wrong for a calendar: between
 * midnight and 05:30 IST every solve would land on "yesterday", so a late-night
 * session would show today as a blank day. A calendar is a local-time artifact.
 */

/**
 * Diminishing returns on repeating the same difficulty. Ten problems at 1200 is
 * worth roughly eight times one, not ten times, which is what stops the score
 * rewarding a grind at the floor.
 */
export const DAILY_SCORE_GAMMA = 0.9;

/** Local calendar day for a timestamp, as `YYYY-MM-DD`. */
export function localDayKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Midnight local time for a day key. */
export function dayKeyToMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Points for one problem at a rating: 100 at 800, doubling every 400. */
export function basePoints(rating: number): number {
  return 100 * Math.pow(2, (rating - 800) / 400);
}

export interface RatingBucket {
  rating: number;
  count: number;
  base: number;
}

export interface DayStats {
  date: string;
  count: number;
  score: number;
  /** Per-100 rating bucket, descending by rating. Unrated problems excluded. */
  buckets: RatingBucket[];
}

export function groupByLocalDay(
  solved: SolvedProblem[],
): Map<string, SolvedProblem[]> {
  const map = new Map<string, SolvedProblem[]>();
  for (const p of solved) {
    const key = localDayKey(p.solvedAt);
    const list = map.get(key);
    if (list) list.push(p);
    else map.set(key, [p]);
  }
  return map;
}

/** Solves per local day, for the calendar. */
export function countByLocalDay(solved: SolvedProblem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of solved) {
    const key = localDayKey(p.solvedAt);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/**
 * `score = Σ_r basePoints(r) × count_r^γ`, over 100-wide rating buckets.
 *
 * Unrated problems score nothing — there is no difficulty to weight — but they
 * still count towards the day's problem count.
 */
export function dayStats(
  date: string,
  problems: SolvedProblem[],
  gamma = DAILY_SCORE_GAMMA,
): DayStats {
  const counts = new Map<number, number>();
  for (const p of problems) {
    if (p.rating > 0) {
      const bucket = Math.floor(p.rating / 100) * 100;
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
  }

  let score = 0;
  const buckets: RatingBucket[] = [];
  for (const [rating, count] of counts) {
    const base = basePoints(rating);
    score += base * Math.pow(count, gamma);
    buckets.push({ rating, count, base });
  }
  buckets.sort((a, b) => b.rating - a.rating);

  return {
    date,
    count: problems.length,
    score: Math.round(score * 100) / 100,
    buckets,
  };
}

/**
 * One entry per day across the window, zero-filled. The gaps are the point —
 * a chart of only active days hides exactly the inconsistency worth seeing.
 */
export function dailySeries(
  solved: SolvedProblem[],
  fromMs: number,
  toMs: number,
  gamma = DAILY_SCORE_GAMMA,
): DayStats[] {
  const groups = groupByLocalDay(solved);
  const out: DayStats[] = [];

  const cursor = new Date(fromMs);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(toMs);
  end.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    const key = localDayKey(cursor.getTime());
    out.push(dayStats(key, groups.get(key) ?? [], gamma));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export interface SeriesSummary {
  /** Mean over **active** days only; including blanks would just restate them. */
  avgPerActiveDay: number;
  bestCount: number;
  avgScorePerActiveDay: number;
  bestScore: number;
  activeDays: number;
  totalDays: number;
  totalProblems: number;
}

export function summarise(series: DayStats[]): SeriesSummary {
  const active = series.filter((d) => d.count > 0);
  const scored = series.filter((d) => d.score > 0);
  const total = active.reduce((s, d) => s + d.count, 0);
  const totalScore = scored.reduce((s, d) => s + d.score, 0);

  return {
    avgPerActiveDay: active.length ? total / active.length : 0,
    bestCount: active.length ? Math.max(...active.map((d) => d.count)) : 0,
    avgScorePerActiveDay: scored.length ? totalScore / scored.length : 0,
    bestScore: scored.length ? Math.max(...scored.map((d) => d.score)) : 0,
    activeDays: active.length,
    totalDays: series.length,
    totalProblems: total,
  };
}

/* ---------------- Activity calendar ---------------- */

export type ActivityTier = "none" | "low" | "mid" | "high" | "future";

export const TIER_LABEL: Record<ActivityTier, string> = {
  none: "0 solved",
  low: "1–4 solved",
  mid: "5–9 solved",
  high: "10+ solved",
  future: "Upcoming",
};

export function tierFor(count: number, isFuture: boolean): ActivityTier {
  if (isFuture) return "future";
  if (count === 0) return "none";
  if (count < 5) return "low";
  if (count < 10) return "mid";
  return "high";
}

export interface CalendarCell {
  day: number;
  date: string;
  count: number;
  tier: ActivityTier;
  isToday: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number;
  /** Blank cells before the 1st, so the grid starts on the right weekday. */
  leading: number;
  cells: CalendarCell[];
  tally: Record<ActivityTier, number>;
  /** Problems solved this month, excluding future days. */
  total: number;
}

export function monthGrid(
  year: number,
  month: number,
  counts: Map<string, number>,
  nowMs: number,
): CalendarMonth {
  const today = new Date(nowMs);
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const leading = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CalendarCell[] = [];
  const tally: Record<ActivityTier, number> = {
    none: 0,
    low: 0,
    mid: 0,
    high: 0,
    future: 0,
  };
  let total = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const cellMs = new Date(year, month, day).getTime();
    const isFuture = cellMs > todayMs;
    const date = localDayKey(cellMs);
    const count = counts.get(date) ?? 0;
    const tier = tierFor(count, isFuture);

    tally[tier]++;
    if (!isFuture) total += count;

    cells.push({ day, date, count, tier, isToday: cellMs === todayMs });
  }

  return { year, month, leading, cells, tally, total };
}
