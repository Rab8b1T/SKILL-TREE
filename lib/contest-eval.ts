import type {
  ContestDivision,
  ContestProgramDoc,
  ContestRoundDoc,
  UpsolveEntry,
} from "./types";

export interface ContestEvalSummary {
  completed: number;
  target: number;
  solved: number;
  problems: number;
  solveRate: number;
  activeMinutes: number;
  wrongAttempts: number;
  deepestSolved: string | null;
  virtualRounds: number;
  coachRounds: number;
}

export interface DivisionEvaluation {
  division: Exclude<ContestDivision, "custom">;
  rounds: number;
  solved: number;
  problems: number;
  solveRate: number;
  deepestSolved: string | null;
  averageWrong: number;
}

export interface SlotEvaluation {
  slot: string;
  seen: number;
  attempted: number;
  solved: number;
  solveRate: number;
  medianSolveSeconds: number | null;
  wrongAttempts: number;
}

export interface ContestDayEvaluation {
  date: string;
  rounds: number;
  solved: number;
  problems: number;
  activeMinutes: number;
}

export interface ContestWindowComparison {
  size: number;
  currentSolveRate: number;
  previousSolveRate: number;
  solveRateDelta: number;
  currentWrongPerRound: number;
  previousWrongPerRound: number;
  wrongPerRoundDelta: number;
}

export interface ContestEvaluation {
  summary: ContestEvalSummary;
  divisions: DivisionEvaluation[];
  slots: SlotEvaluation[];
  days: ContestDayEvaluation[];
  rounds: {
    roundId: string;
    sequence: number | null;
    finishedAt: number;
    division: ContestDivision;
    source: string;
    solved: number;
    total: number;
    solveRate: number;
    deepestSolved: string | null;
    points: number;
    penaltyMinutes: number;
  }[];
  unsolvedTags: { tag: string; count: number }[];
  comparison: ContestWindowComparison | null;
  upsolve: {
    queued: number;
    cleared: number;
    open: number;
    medianClearDays: number | null;
  };
}

function slotRank(slot: string): number {
  const letter = slot.toUpperCase().charCodeAt(0) - 64;
  const suffix = Number(slot.slice(1)) || 0;
  return letter * 10 + suffix;
}

function deepest(slots: string[]): string | null {
  return [...slots].sort((a, b) => slotRank(a) - slotRank(b)).at(-1) ?? null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function dateInTimezone(timestamp: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(timestamp);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function roundDeepest(round: ContestRoundDoc): string | null {
  return deepest(
    (round.problems ?? [])
      .filter((problem) => problem.solved)
      .map((problem) => problem.slot ?? problem.index),
  );
}

function solveRate(rounds: ContestRoundDoc[]): number {
  const solved = rounds.reduce((sum, round) => sum + round.solved, 0);
  const total = rounds.reduce((sum, round) => sum + round.total, 0);
  return total ? solved / total : 0;
}

function comparison(rounds: ContestRoundDoc[], size = 20): ContestWindowComparison | null {
  if (rounds.length < size * 2) return null;
  const ordered = [...rounds].sort(
    (a, b) => (a.programSequence ?? 0) - (b.programSequence ?? 0),
  );
  const current = ordered.slice(-size);
  const previous = ordered.slice(-size * 2, -size);
  const wrongPerRound = (items: ContestRoundDoc[]) =>
    items.reduce((sum, round) => sum + (round.wrongAttempts ?? 0), 0) /
    items.length;
  const currentRate = solveRate(current);
  const previousRate = solveRate(previous);
  const currentWrong = wrongPerRound(current);
  const previousWrong = wrongPerRound(previous);
  return {
    size,
    currentSolveRate: currentRate,
    previousSolveRate: previousRate,
    solveRateDelta: currentRate - previousRate,
    currentWrongPerRound: currentWrong,
    previousWrongPerRound: previousWrong,
    wrongPerRoundDelta: currentWrong - previousWrong,
  };
}

export function buildContestEvaluation(input: {
  rounds: ContestRoundDoc[];
  program: ContestProgramDoc;
  upsolve: UpsolveEntry[];
  timezone?: string;
}): ContestEvaluation {
  const timezone = input.timezone ?? "UTC";
  const rounds = input.rounds.filter((round) => round.section !== "first-time-trials");
  const solved = rounds.reduce((sum, round) => sum + round.solved, 0);
  const problems = rounds.reduce((sum, round) => sum + round.total, 0);
  const activeSeconds = rounds.reduce(
    (sum, round) => sum + (round.effectiveElapsedSeconds ?? 0),
    0,
  );
  const wrongAttempts = rounds.reduce(
    (sum, round) => sum + (round.wrongAttempts ?? 0),
    0,
  );

  const divisions = (["div4", "div3", "div2", "div1"] as const).map(
    (division) => {
      const items = rounds.filter(
        (round) =>
          round.division === division &&
          round.source === "virtual" &&
          round.formatVariant !== "customized",
      );
      const divisionSolved = items.reduce((sum, round) => sum + round.solved, 0);
      const divisionProblems = items.reduce((sum, round) => sum + round.total, 0);
      return {
        division,
        rounds: items.length,
        solved: divisionSolved,
        problems: divisionProblems,
        solveRate: divisionProblems ? divisionSolved / divisionProblems : 0,
        deepestSolved: deepest(
          items.flatMap((round) =>
            (round.problems ?? [])
              .filter((problem) => problem.solved)
              .map((problem) => problem.slot ?? problem.index),
          ),
        ),
        averageWrong: items.length
          ? items.reduce(
              (sum, round) => sum + (round.wrongAttempts ?? 0),
              0,
            ) / items.length
          : 0,
      };
    },
  );

  const bySlot = new Map<
    string,
    {
      seen: number;
      attempted: number;
      solved: number;
      solveSeconds: number[];
      wrongAttempts: number;
    }
  >();
  const tagCounts = new Map<string, number>();
  for (const round of rounds.filter((item) => item.source === "virtual")) {
    for (const problem of round.problems ?? []) {
      const slot = problem.slot ?? problem.index;
      const row = bySlot.get(slot) ?? {
        seen: 0,
        attempted: 0,
        solved: 0,
        solveSeconds: [],
        wrongAttempts: 0,
      };
      row.seen += 1;
      if (problem.attempted || problem.solved || problem.wrongAttempts > 0) {
        row.attempted += 1;
      }
      if (problem.solved) {
        row.solved += 1;
        if (problem.solvedAtSeconds != null) {
          row.solveSeconds.push(problem.solvedAtSeconds);
        }
      } else {
        for (const tag of problem.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }
      row.wrongAttempts += problem.wrongAttempts;
      bySlot.set(slot, row);
    }
  }
  const slots = [...bySlot.entries()]
    .sort((a, b) => slotRank(a[0]) - slotRank(b[0]))
    .map(([slot, row]) => ({
      slot,
      seen: row.seen,
      attempted: row.attempted,
      solved: row.solved,
      solveRate: row.seen ? row.solved / row.seen : 0,
      medianSolveSeconds: median(row.solveSeconds),
      wrongAttempts: row.wrongAttempts,
    }));

  const byDay = new Map<string, ContestDayEvaluation>();
  for (const round of rounds) {
    const date = dateInTimezone(round.finishedAt, timezone);
    const row = byDay.get(date) ?? {
      date,
      rounds: 0,
      solved: 0,
      problems: 0,
      activeMinutes: 0,
    };
    row.rounds += 1;
    row.solved += round.solved;
    row.problems += round.total;
    row.activeMinutes += Math.round((round.effectiveElapsedSeconds ?? 0) / 60);
    byDay.set(date, row);
  }

  const roundIds = new Set(rounds.map((round) => round.roundId));
  const debt = input.upsolve.filter(
    (entry) => entry.originRoundId && roundIds.has(entry.originRoundId),
  );
  const cleared = debt.filter((entry) => entry.status === "done");
  const clearDays = cleared
    .map((entry) =>
      entry.doneAt
        ? Math.max(0, (entry.doneAt - entry.addedAt) / 86_400_000)
        : null,
    )
    .filter((value): value is number => value != null);

  return {
    summary: {
      completed: input.program.completedRounds,
      target: input.program.targetRounds,
      solved,
      problems,
      solveRate: problems ? solved / problems : 0,
      activeMinutes: activeSeconds / 60,
      wrongAttempts,
      deepestSolved: deepest(
        rounds.flatMap((round) =>
          (round.problems ?? [])
            .filter((problem) => problem.solved)
            .map((problem) => problem.slot ?? problem.index),
        ),
      ),
      virtualRounds: rounds.filter((round) => round.source === "virtual").length,
      coachRounds: rounds.filter((round) => round.source === "coach").length,
    },
    divisions,
    slots,
    days: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    rounds: [...rounds]
      .sort((a, b) => (a.programSequence ?? 0) - (b.programSequence ?? 0))
      .map((round) => ({
        roundId: round.roundId,
        sequence: round.programSequence ?? null,
        finishedAt: round.finishedAt,
        division: round.division,
        source: round.source ?? "legacy",
        solved: round.solved,
        total: round.total,
        solveRate: round.total ? round.solved / round.total : 0,
        deepestSolved: roundDeepest(round),
        points: round.points,
        penaltyMinutes: round.penaltyMinutes,
      })),
    unsolvedTags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 12),
    comparison: comparison(rounds),
    upsolve: {
      queued: debt.length,
      cleared: cleared.length,
      open: debt.filter((entry) => entry.status === "open").length,
      medianClearDays: median(clearDays),
    },
  };
}
