/**
 * Aggregate analysis of archived virtual rounds.
 *
 * The per-round scoreboard says how one contest went. What decides rating is the
 * pattern across rounds: which letter you reliably reach, which one you stall on,
 * and whether the letters are being reached faster than they used to be. That
 * pattern is what these functions extract.
 */
import { slotOf, type ContestResult, type ContestResultProblem } from "./types";

export interface SlotStats {
  index: string;
  attempts: number;
  solved: number;
  solveRate: number;
  /** Median seconds into the round, over solved instances only. */
  medianSolveSeconds: number | null;
  avgRating: number | null;
  wrongAttempts: number;
}

export interface ContestAggregate {
  rounds: number;
  /** Rounds carrying per-problem detail; slot analysis is limited to these. */
  detailedRounds: number;
  problemsSolved: number;
  problemsTotal: number;
  solveRate: number;
  avgSolved: number;
  bestRound: ContestResult | null;
  totalPenalty: number;
  slots: SlotStats[];
  /**
   * The first slot that is attempted regularly but solved less than half the
   * time — the point where rounds stop, and the only slot worth training.
   */
  wall: SlotStats | null;
  /** The hardest slot ever solved, across all rounds. */
  deepest: string | null;
  cleanSweeps: number;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function contestAggregate(history: ContestResult[]): ContestAggregate {
  const detailed = history.filter((r) => r.problems?.length);

  const bySlot = new Map<string, ContestResultProblem[]>();
  for (const round of detailed) {
    for (const p of round.problems!) {
      const slot = slotOf(p);
      const list = bySlot.get(slot);
      if (list) list.push(p);
      else bySlot.set(slot, [p]);
    }
  }

  const slots: SlotStats[] = [...bySlot.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([index, items]) => {
      const solvedItems = items.filter((p) => p.solved);
      const ratings = items.map((p) => p.rating).filter((r) => r > 0);
      return {
        index,
        attempts: items.length,
        solved: solvedItems.length,
        solveRate: items.length ? solvedItems.length / items.length : 0,
        medianSolveSeconds: median(
          solvedItems
            .map((p) => p.solvedAtSeconds)
            .filter((s): s is number => s != null),
        ),
        avgRating: ratings.length
          ? Math.round(ratings.reduce((s, r) => s + r, 0) / ratings.length)
          : null,
        wrongAttempts: items.reduce((s, p) => s + p.wrongAttempts, 0),
      };
    });

  // Two appearances minimum: one miss on a slot seen once is not a wall.
  const wall = slots.find((s) => s.attempts >= 2 && s.solveRate < 0.5) ?? null;

  const deepest =
    slots.filter((s) => s.solved > 0).map((s) => s.index).sort().at(-1) ?? null;

  const problemsSolved = history.reduce((s, r) => s + r.solved, 0);
  const problemsTotal = history.reduce((s, r) => s + r.total, 0);

  const bestRound =
    history.length === 0
      ? null
      : history.reduce((best, r) => {
          const score = (a: ContestResult) =>
            (a.total ? a.solved / a.total : 0) * 1000 - a.penaltyMinutes / 1000;
          return score(r) > score(best) ? r : best;
        });

  return {
    rounds: history.length,
    detailedRounds: detailed.length,
    problemsSolved,
    problemsTotal,
    solveRate: problemsTotal ? problemsSolved / problemsTotal : 0,
    avgSolved: history.length ? problemsSolved / history.length : 0,
    bestRound,
    totalPenalty: history.reduce((s, r) => s + r.penaltyMinutes, 0),
    slots,
    wall,
    deepest,
    cleanSweeps: history.filter((r) => r.total > 0 && r.solved === r.total).length,
  };
}

/** Oldest-first series for the trend chart. */
export interface RoundPoint {
  finishedAt: number;
  label: string;
  name: string;
  solved: number;
  total: number;
  rate: number;
  penaltyMinutes: number;
  avgRating: number | null;
}

export function roundSeries(history: ContestResult[]): RoundPoint[] {
  return [...history]
    .sort((a, b) => a.finishedAt - b.finishedAt)
    .map((r) => {
      const ratings = (r.problems ?? [])
        .map((p) => p.rating)
        .filter((v) => v > 0);
      return {
        finishedAt: r.finishedAt,
        label: new Date(r.finishedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        name: r.name,
        solved: r.solved,
        total: r.total,
        rate: r.total ? Math.round((r.solved / r.total) * 100) : 0,
        penaltyMinutes: r.penaltyMinutes,
        avgRating: ratings.length
          ? Math.round(ratings.reduce((s, v) => s + v, 0) / ratings.length)
          : null,
      };
    });
}

/**
 * Tags on problems left unsolved across rounds, most frequent first. Under a
 * clock, the topic you fail to recognise costs more than one you are merely slow
 * at, so this is the list worth drilling before the next round.
 */
export function unsolvedTags(
  history: ContestResult[],
): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const round of history) {
    for (const p of round.problems ?? []) {
      if (p.solved) continue;
      for (const tag of p.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
