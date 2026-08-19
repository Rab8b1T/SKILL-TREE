/**
 * Time-series analysis of solve difficulty.
 *
 * Every other view in the app is cumulative, which cannot distinguish an account
 * that solved 200 easy problems last year from one solving harder problems this
 * week. These functions bucket solves by week or month so the question the whole
 * growth-band rule depends on — is the difficulty actually climbing? — has an
 * answer.
 *
 * All bucketing is UTC, matching `SolveStats.byDate`, so a period boundary means
 * the same thing here as it does on the heatmap.
 */
import { growthBand, type CfRatingChange, type SolvedProblem } from "./cf";

export type Granularity = "week" | "month";

export type RangeKey = "30d" | "90d" | "6m" | "1y" | "all";

export const RANGE_DAYS: Record<Exclude<RangeKey, "all">, number> = {
  "30d": 30,
  "90d": 90,
  "6m": 183,
  "1y": 365,
};

const DAY = 86_400_000;

/* ------------------------------------------------------------------------- *
 * Period boundaries
 * ------------------------------------------------------------------------- */

/** Monday 00:00 UTC of the week containing `ms`. */
export function startOfWeek(ms: number): number {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  // getUTCDay is 0 for Sunday, so Sunday belongs to the week that began 6 days ago.
  const shift = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - shift);
  return d.getTime();
}

export function startOfMonth(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

export function periodStart(ms: number, g: Granularity): number {
  return g === "week" ? startOfWeek(ms) : startOfMonth(ms);
}

export function nextPeriod(ms: number, g: Granularity): number {
  if (g === "week") return ms + 7 * DAY;
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

export function periodLabel(ms: number, g: Granularity): string {
  const d = new Date(ms);
  if (g === "month") {
    return d.toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/* ------------------------------------------------------------------------- *
 * Rating held at a point in time
 * ------------------------------------------------------------------------- */

/**
 * The rating the account actually held at `ms`, from its rated-round history.
 * This is what makes "was this practice in-band?" answerable historically: the
 * band depends on the rating at the time, not on today's rating.
 *
 * Returns null before the first rated round, where the account had no rating and
 * no band can honestly be claimed.
 */
export function ratingAt(
  history: CfRatingChange[],
  ms: number,
): number | null {
  let rating: number | null = null;
  for (const change of history) {
    if (change.ratingUpdateTimeSeconds * 1000 > ms) break;
    rating = change.newRating;
  }
  return rating;
}

/** History sorted oldest-first, which `ratingAt` assumes. */
export function sortRatingHistory(history: CfRatingChange[]): CfRatingChange[] {
  return [...history].sort(
    (a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds,
  );
}

/* ------------------------------------------------------------------------- *
 * Buckets
 * ------------------------------------------------------------------------- */

export interface Period {
  start: number;
  end: number;
  label: string;
  /** Every solve in the period, rated or not. */
  count: number;
  ratedCount: number;
  avgRating: number | null;
  medianRating: number | null;
  /** 90th percentile, the honest "top of my range" — one lucky solve shouldn't set it. */
  p90Rating: number | null;
  maxRating: number | null;
  /** Rating held at the end of the period, and the band that implied. */
  rating: number | null;
  band: [number, number] | null;
  /** Solves relative to the band that applied at the time. */
  belowBand: number;
  inBand: number;
  aboveBand: number;
  firstTry: number;
  distinctTags: number;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  if (sorted.length < 4) return sorted[sorted.length - 1];
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[idx];
}

/**
 * Continuous period axis over [from, to] — periods with no solves are emitted as
 * empty rather than skipped, because a month off is the most important thing a
 * consistency chart can show.
 */
export function buildPeriods(
  solved: SolvedProblem[],
  opts: {
    granularity: Granularity;
    from: number;
    to: number;
    ratingHistory?: CfRatingChange[];
  },
): Period[] {
  const { granularity: g, from, to } = opts;
  const history = opts.ratingHistory ? sortRatingHistory(opts.ratingHistory) : [];

  const buckets = new Map<number, SolvedProblem[]>();
  for (let cursor = periodStart(from, g); cursor <= to; cursor = nextPeriod(cursor, g)) {
    buckets.set(cursor, []);
  }

  for (const p of solved) {
    if (p.solvedAt < from || p.solvedAt > to) continue;
    const key = periodStart(p.solvedAt, g);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(p);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, items]) => {
      const end = nextPeriod(start, g) - 1;
      const ratings = items
        .map((p) => p.rating)
        .filter((r) => r > 0)
        .sort((a, b) => a - b);

      // The band is judged at the period's end, so a mid-period rating change
      // counts towards the level the user was actually at by then.
      const rating = history.length ? ratingAt(history, Math.min(end, Date.now())) : null;
      const band = rating != null ? growthBand(rating) : null;

      let below = 0;
      let inBand = 0;
      let above = 0;
      if (band) {
        for (const r of ratings) {
          if (r < band[0]) below++;
          else if (r <= band[1]) inBand++;
          else above++;
        }
      }

      const tags = new Set<string>();
      for (const p of items) for (const t of p.tags) tags.add(t);

      return {
        start,
        end,
        label: periodLabel(start, g),
        count: items.length,
        ratedCount: ratings.length,
        avgRating: ratings.length
          ? Math.round(ratings.reduce((s, r) => s + r, 0) / ratings.length)
          : null,
        medianRating: ratings.length ? percentile(ratings, 0.5) : null,
        p90Rating: ratings.length ? percentile(ratings, 0.9) : null,
        maxRating: ratings.length ? ratings[ratings.length - 1] : null,
        rating,
        band,
        belowBand: below,
        inBand,
        aboveBand: above,
        firstTry: items.filter((p) => p.attempts === 1).length,
        distinctTags: tags.size,
      };
    });
}

/* ------------------------------------------------------------------------- *
 * Window comparison
 * ------------------------------------------------------------------------- */

export interface WindowStats {
  from: number;
  to: number;
  count: number;
  avgRating: number | null;
  p90Rating: number | null;
  firstTryRate: number | null;
  distinctTags: number;
  inBandRate: number | null;
  activeDays: number;
}

export function windowStats(
  solved: SolvedProblem[],
  from: number,
  to: number,
  ratingHistory: CfRatingChange[] = [],
): WindowStats {
  const items = solved.filter((p) => p.solvedAt >= from && p.solvedAt <= to);
  const ratings = items.map((p) => p.rating).filter((r) => r > 0).sort((a, b) => a - b);
  const history = sortRatingHistory(ratingHistory);

  let inBand = 0;
  if (history.length) {
    for (const p of items) {
      if (p.rating <= 0) continue;
      const r = ratingAt(history, p.solvedAt);
      if (r == null) continue;
      const band = growthBand(r);
      if (p.rating >= band[0]) inBand++;
    }
  }

  const days = new Set(items.map((p) => new Date(p.solvedAt).toISOString().slice(0, 10)));
  const tags = new Set<string>();
  for (const p of items) for (const t of p.tags) tags.add(t);

  return {
    from,
    to,
    count: items.length,
    avgRating: ratings.length
      ? Math.round(ratings.reduce((s, r) => s + r, 0) / ratings.length)
      : null,
    p90Rating: ratings.length ? percentile(ratings, 0.9) : null,
    firstTryRate: items.length
      ? Math.round((items.filter((p) => p.attempts === 1).length / items.length) * 100)
      : null,
    distinctTags: tags.size,
    inBandRate: ratings.length ? Math.round((inBand / ratings.length) * 100) : null,
    activeDays: days.size,
  };
}

/**
 * The selected window against the equally long window immediately before it, so
 * "better than last month" is a measured claim rather than an impression.
 */
export function compareWindows(
  solved: SolvedProblem[],
  from: number,
  to: number,
  ratingHistory: CfRatingChange[] = [],
): { current: WindowStats; previous: WindowStats } {
  const span = to - from;
  return {
    current: windowStats(solved, from, to, ratingHistory),
    previous: windowStats(solved, from - span - 1, from - 1, ratingHistory),
  };
}

/* ------------------------------------------------------------------------- *
 * Topic recency
 * ------------------------------------------------------------------------- */

export interface TagRecency {
  tag: string;
  count: number;
  lastSolvedAt: number;
  daysSince: number;
  /** Highest rating solved carrying this tag — depth, not just exposure. */
  bestRating: number;
}

/**
 * When each topic was last practised. Volume alone (the radar) says nothing about
 * decay: a topic with 40 solves none of which happened this quarter is a topic
 * being forgotten, and that is what a spaced schedule needs to know.
 */
export function tagRecency(
  solved: SolvedProblem[],
  now = Date.now(),
): TagRecency[] {
  const map = new Map<string, { count: number; last: number; best: number }>();
  for (const p of solved) {
    for (const tag of p.tags) {
      const cur = map.get(tag);
      if (cur) {
        cur.count++;
        cur.last = Math.max(cur.last, p.solvedAt);
        cur.best = Math.max(cur.best, p.rating);
      } else {
        map.set(tag, { count: 1, last: p.solvedAt, best: p.rating });
      }
    }
  }

  return [...map.entries()]
    .map(([tag, v]) => ({
      tag,
      count: v.count,
      lastSolvedAt: v.last,
      daysSince: Math.floor((now - v.last) / DAY),
      bestRating: v.best,
    }))
    .sort((a, b) => b.daysSince - a.daysSince);
}

/* ------------------------------------------------------------------------- *
 * Range helpers
 * ------------------------------------------------------------------------- */

/** Inclusive [from, to] for a preset, clamped to the account's own first solve. */
export function resolveRange(
  key: RangeKey,
  solved: SolvedProblem[],
  now = Date.now(),
): { from: number; to: number } {
  const earliest = solved.length
    ? Math.min(...solved.map((p) => p.solvedAt))
    : now - 30 * DAY;
  if (key === "all") return { from: earliest, to: now };
  return { from: Math.max(earliest, now - RANGE_DAYS[key] * DAY), to: now };
}

/**
 * Week buckets over a multi-year range produce an unreadable axis, so a long
 * range implies months unless the user overrides it.
 */
export function suggestGranularity(from: number, to: number): Granularity {
  return to - from > 200 * DAY ? "month" : "week";
}

/**
 * Linear least-squares slope, in rating points per period. Empty periods keep
 * their index, so a gap widens the x-axis rather than compressing the fit.
 *
 * Four points minimum: three produce slopes of 60+ points a week off two weeks of
 * data, which is a coin flip presented as a trend.
 */
export function trendSlope(values: (number | null)[]): number | null {
  const points = values
    .map((v, i) => ({ x: i, y: v }))
    .filter((p): p is { x: number; y: number } => p.y != null);
  if (points.length < 4) return null;

  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  return den === 0 ? null : num / den;
}
