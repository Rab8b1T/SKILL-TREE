/**
 * Codeforces domain model: ranks, rating bands, and the shapes the public API
 * returns. Everything the UI knows about ratings comes from here so the
 * boundaries are stated exactly once.
 */

export interface CfUser {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
  avatar?: string;
  titlePhoto?: string;
  contribution?: number;
  friendOfCount?: number;
  organization?: string;
  country?: string;
  city?: string;
  registrationTimeSeconds?: number;
}

export interface CfProblem {
  contestId?: number;
  problemsetName?: string;
  index: string;
  name: string;
  type?: string;
  rating?: number;
  tags: string[];
  points?: number;
}

export type CfVerdict =
  | "OK"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "RUNTIME_ERROR"
  | "COMPILATION_ERROR"
  | "IDLENESS_LIMIT_EXCEEDED"
  | "CHALLENGED"
  | "SKIPPED"
  | "PARTIAL"
  | "TESTING"
  | "FAILED";

export interface CfSubmission {
  id: number;
  contestId?: number;
  creationTimeSeconds: number;
  relativeTimeSeconds?: number;
  problem: CfProblem;
  programmingLanguage: string;
  verdict?: CfVerdict;
  passedTestCount?: number;
  timeConsumedMillis?: number;
  memoryConsumedBytes?: number;
}

export interface CfRatingChange {
  contestId: number;
  contestName: string;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

export interface CfContest {
  id: number;
  name: string;
  type: string;
  phase: string;
  durationSeconds: number;
  startTimeSeconds?: number;
  relativeTimeSeconds?: number;
  difficulty?: number;
}

/* ------------------------------------------------------------------------- *
 * Ranks
 *
 * These bounds were derived empirically from user.ratedList across 47,108
 * active rated accounts (Aug 2026) rather than copied from the widely-shared
 * CF blog table, which is out of date on the upper ranks.
 * ------------------------------------------------------------------------- */

export interface CfRank {
  name: string;
  short: string;
  min: number;
  max: number;
  /** CSS variable holding this rank's colour. */
  color: string;
}

export const CF_RANKS: CfRank[] = [
  { name: "Newbie", short: "NB", min: 0, max: 1199, color: "var(--cf-newbie)" },
  { name: "Pupil", short: "PU", min: 1200, max: 1399, color: "var(--cf-pupil)" },
  { name: "Specialist", short: "SP", min: 1400, max: 1599, color: "var(--cf-specialist)" },
  { name: "Expert", short: "EX", min: 1600, max: 1899, color: "var(--cf-expert)" },
  { name: "Candidate Master", short: "CM", min: 1900, max: 2099, color: "var(--cf-cm)" },
  { name: "Master", short: "MS", min: 2100, max: 2299, color: "var(--cf-master)" },
  { name: "International Master", short: "IM", min: 2300, max: 2399, color: "var(--cf-master)" },
  { name: "Grandmaster", short: "GM", min: 2400, max: 2599, color: "var(--cf-gm)" },
  { name: "International Grandmaster", short: "IGM", min: 2600, max: 2999, color: "var(--cf-gm)" },
  { name: "Legendary Grandmaster", short: "LGM", min: 3000, max: Infinity, color: "var(--cf-lgm)" },
];

export function rankFor(rating: number | undefined | null): CfRank {
  if (rating == null) return CF_RANKS[0];
  return CF_RANKS.find((r) => rating >= r.min && rating <= r.max) ?? CF_RANKS[0];
}

/** Colour for an arbitrary rating — used for problem ratings too, not just users. */
export function ratingColor(rating: number | undefined | null): string {
  if (!rating) return "var(--faint)";
  return rankFor(rating).color;
}

/** Rating needed to reach the next rank, or null at Legendary Grandmaster. */
export function nextRankAt(rating: number): { rank: CfRank; needed: number } | null {
  const next = CF_RANKS.find((r) => r.min > rating);
  return next ? { rank: next, needed: next.min - rating } : null;
}

/**
 * The characteristic failure that keeps people stuck in each band. Shown on the
 * dashboard so the current constraint is named rather than guessed at.
 */
export const BAND_FOCUS: Record<string, string> = {
  Newbie:
    "Reading and rigour, not algorithms. Read the statement exactly, spot the invariant instead of simulating, and verify before submitting.",
  Pupil:
    "The standard toolkit: sorting, prefix sums, two pointers, binary search on array and on answer, greedy with a stated reason it works.",
  Specialist:
    "Observation. Div2 C is usually one rearrangement, one monotonicity or one counting identity away from easy.",
  Expert:
    "DP and graphs, fluent rather than recognised: intermediate DP, Dijkstra, 0-1 BFS, DSU, trees, Fenwick.",
  "Candidate Master": "Speed and stamina — solving D consistently inside the clock.",
  Master: "Breadth under time pressure across three hard problems.",
  "International Master": "Breadth under time pressure across three hard problems.",
  Grandmaster: "Original insight on unfamiliar problems.",
  "International Grandmaster": "Original insight on unfamiliar problems.",
  "Legendary Grandmaster": "Original insight on unfamiliar problems.",
};

/**
 * The practice band: rating+100 to rating+300, the growth floor.
 *
 * Clamped to 800 because that is the lowest rating Codeforces assigns — an
 * unclamped band for a very low or brand-new account comes out below every
 * problem that exists, which made the picker return nothing and made ordinary
 * 800-rated practice register as "above band" stretch work.
 */
export const MIN_PROBLEM_RATING = 800;

export function growthBand(rating: number): [number, number] {
  const floor = Math.max(
    MIN_PROBLEM_RATING,
    Math.round((rating + 100) / 100) * 100,
  );
  return [floor, floor + 200];
}

/** Problem rating buckets, 800..3500 in steps of 100. */
export function ratingBuckets(step = 100, lo = 800, hi = 3500): number[] {
  const out: number[] = [];
  for (let r = lo; r <= hi; r += step) out.push(r);
  return out;
}

/** The fixed Codeforces tag vocabulary, as used by problemset.problems. */
export const CF_TAGS = [
  "implementation",
  "math",
  "greedy",
  "dp",
  "data structures",
  "brute force",
  "constructive algorithms",
  "graphs",
  "sortings",
  "binary search",
  "dfs and similar",
  "trees",
  "strings",
  "number theory",
  "combinatorics",
  "geometry",
  "bitmasks",
  "two pointers",
  "dsu",
  "shortest paths",
  "probabilities",
  "divide and conquer",
  "hashing",
  "games",
  "flows",
  "interactive",
  "matrices",
  "string suffix structures",
  "fft",
  "graph matchings",
  "ternary search",
  "expression parsing",
  "meet-in-the-middle",
  "2-sat",
  "chinese remainder theorem",
  "schedules",
] as const;

export const VERDICT_LABEL: Record<string, string> = {
  OK: "Accepted",
  WRONG_ANSWER: "Wrong answer",
  TIME_LIMIT_EXCEEDED: "TLE",
  MEMORY_LIMIT_EXCEEDED: "MLE",
  RUNTIME_ERROR: "Runtime error",
  COMPILATION_ERROR: "Compile error",
  IDLENESS_LIMIT_EXCEEDED: "Idleness",
  CHALLENGED: "Hacked",
  SKIPPED: "Skipped",
  PARTIAL: "Partial",
  TESTING: "Testing",
  FAILED: "Failed",
};

export function verdictColor(v?: string): string {
  if (v === "OK") return "var(--positive)";
  if (!v || v === "TESTING") return "var(--faint)";
  if (v === "SKIPPED" || v === "PARTIAL") return "var(--warning)";
  return "var(--negative)";
}

export function problemUrl(p: {
  contestId?: number;
  index: string;
  problemsetName?: string;
}): string {
  if (!p.contestId) {
    return `https://codeforces.com/problemsets/acmsguru/problem/99999/${p.index}`;
  }
  // Gyms and problems from contests above 100000 live under a different path.
  const path = p.contestId >= 100000 ? "gym" : "contest";
  return `https://codeforces.com/${path}/${p.contestId}/problem/${p.index}`;
}

export function problemKey(p: { contestId?: number; index: string }): string {
  return `${p.contestId ?? 0}-${p.index}`;
}

export function handleUrl(handle: string): string {
  return `https://codeforces.com/profile/${encodeURIComponent(handle)}`;
}

/* ------------------------------------------------------------------------- *
 * Derived analytics
 * ------------------------------------------------------------------------- */

export interface SolvedProblem {
  key: string;
  contestId?: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
  solvedAt: number;
  attempts: number;
}

export interface SolveStats {
  solved: SolvedProblem[];
  byRating: Record<number, number>;
  byTag: Record<string, number>;
  byDate: Record<string, number>;
  /** Problems attempted but never accepted — the upsolve candidates. */
  unsolved: SolvedProblem[];
  totalSubmissions: number;
  acceptedSubmissions: number;
  /** Wrong submissions on problems that were eventually solved. */
  wastedSubmissions: number;
  languages: Record<string, number>;
}

/**
 * Collapses a raw submission list into per-problem facts. A problem counts as
 * solved on its *first* accepted submission; every earlier attempt on that
 * problem is a wasted submission, which is the number that tracks the
 * submit-before-verifying habit.
 */
export function analyseSubmissions(subs: CfSubmission[]): SolveStats {
  const firstAc = new Map<string, SolvedProblem>();
  const attemptCount = new Map<string, number>();
  const failedOnly = new Map<string, SolvedProblem>();
  const languages: Record<string, number> = {};
  let accepted = 0;

  // Oldest first, so "first AC" really is the first.
  const ordered = [...subs].sort(
    (a, b) => a.creationTimeSeconds - b.creationTimeSeconds,
  );

  for (const sub of ordered) {
    const key = problemKey(sub.problem);
    attemptCount.set(key, (attemptCount.get(key) ?? 0) + 1);
    languages[sub.programmingLanguage] =
      (languages[sub.programmingLanguage] ?? 0) + 1;

    if (sub.verdict === "OK") {
      accepted++;
      if (!firstAc.has(key)) {
        firstAc.set(key, {
          key,
          contestId: sub.problem.contestId,
          index: sub.problem.index,
          name: sub.problem.name,
          rating: sub.problem.rating ?? 0,
          tags: sub.problem.tags ?? [],
          solvedAt: sub.creationTimeSeconds * 1000,
          attempts: attemptCount.get(key) ?? 1,
        });
      }
    } else if (!firstAc.has(key)) {
      failedOnly.set(key, {
        key,
        contestId: sub.problem.contestId,
        index: sub.problem.index,
        name: sub.problem.name,
        rating: sub.problem.rating ?? 0,
        tags: sub.problem.tags ?? [],
        solvedAt: sub.creationTimeSeconds * 1000,
        attempts: attemptCount.get(key) ?? 1,
      });
    }
  }

  // Anything later accepted is no longer an upsolve candidate.
  for (const key of firstAc.keys()) failedOnly.delete(key);

  const byRating: Record<number, number> = {};
  const byTag: Record<string, number> = {};
  const byDate: Record<string, number> = {};
  let wasted = 0;

  for (const p of firstAc.values()) {
    if (p.rating > 0) {
      const bucket = Math.floor(p.rating / 100) * 100;
      byRating[bucket] = (byRating[bucket] ?? 0) + 1;
    }
    for (const tag of p.tags) byTag[tag] = (byTag[tag] ?? 0) + 1;
    const day = new Date(p.solvedAt).toISOString().slice(0, 10);
    byDate[day] = (byDate[day] ?? 0) + 1;
    wasted += Math.max(0, p.attempts - 1);
  }

  return {
    solved: [...firstAc.values()].sort((a, b) => b.solvedAt - a.solvedAt),
    byRating,
    byTag,
    byDate,
    unsolved: [...failedOnly.values()].sort((a, b) => b.solvedAt - a.solvedAt),
    totalSubmissions: subs.length,
    acceptedSubmissions: accepted,
    wastedSubmissions: wasted,
    languages,
  };
}

/** Consecutive days with at least one solve, counting back from today. */
export function solveStreak(byDate: Record<string, number>): number {
  const today = new Date().toISOString().slice(0, 10);
  let cursor = (byDate[today] ?? 0) > 0 ? today : shiftDay(today, -1);
  let streak = 0;
  while ((byDate[cursor] ?? 0) > 0) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

function shiftDay(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Tags with no solve at or above `floor`. A tag with zero solves in-band is a
 * genuine blind spot and outranks a topic that merely feels weak.
 */
export function tagGaps(
  solved: SolvedProblem[],
  floor: number,
): { tag: string; total: number; inBand: number }[] {
  const total = new Map<string, number>();
  const inBand = new Map<string, number>();
  for (const p of solved) {
    for (const tag of p.tags) {
      total.set(tag, (total.get(tag) ?? 0) + 1);
      if (p.rating >= floor) inBand.set(tag, (inBand.get(tag) ?? 0) + 1);
    }
  }
  return [...total.entries()]
    .map(([tag, t]) => ({ tag, total: t, inBand: inBand.get(tag) ?? 0 }))
    .sort((a, b) => a.inBand - b.inBand || b.total - a.total);
}
