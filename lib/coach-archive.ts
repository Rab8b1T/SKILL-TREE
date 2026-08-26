import { contestBoard, type CoachDay, type RunDoc } from "./coach";
import type {
  ContestDivision,
  ContestRoundDoc,
  UpsolveEntry,
} from "./types";

function coachDivision(mirrors: string): ContestDivision {
  if (/div\.?\s*4/i.test(mirrors)) return "div4";
  if (/div\.?\s*3/i.test(mirrors)) return "div3";
  if (/div\.?\s*2/i.test(mirrors)) return "div2";
  if (/div\.?\s*1/i.test(mirrors)) return "div1";
  return "custom";
}

export function buildCoachArchive(
  day: CoachDay,
  run: RunDoc,
  handle: string,
  now = Date.now(),
): { round: ContestRoundDoc; upsolve: UpsolveEntry[] } {
  const contest = day.contest;
  if (!contest) throw new Error("This coach day has no contest");
  if (run.kind !== "contest" || run.day !== day.day || !run.finishedAt) {
    throw new Error("The coach contest is not finished");
  }
  const elapsed = Math.min(
    contest.minutes * 60,
    Math.max(0, Math.floor((run.finishedAt - run.startedAt) / 1000)),
  );
  const board = contestBoard(contest, run, elapsed);
  const roundId = `coach-${day.day}`;
  const problems = contest.problems.map((problem) => {
    const entry = run.entries[problem.key];
    const solved = entry?.status === "solved";
    return {
      contestId: problem.contestId,
      index: problem.index,
      slot: problem.slot,
      name: problem.name,
      rating: problem.rating,
      tags: problem.tags,
      solved,
      attempted:
        Boolean(entry) &&
        (entry.status !== "todo" ||
          entry.wrongAttempts > 0 ||
          entry.segments.length > 0),
      state: solved
        ? ("solved" as const)
        : entry?.wrongAttempts
          ? ("attempted" as const)
          : ("unsolved" as const),
      wrongAttempts: entry?.wrongAttempts ?? 0,
      ...(entry?.solvedAtSeconds !== undefined
        ? { solvedAtSeconds: entry.solvedAtSeconds }
        : {}),
      verdictSource: "manual" as const,
    };
  });
  const unsolved = problems.filter((problem) => !problem.solved);
  const upsolveKeys = unsolved.map(
    (problem) => `${problem.contestId}-${problem.index}`,
  );
  const round: ContestRoundDoc = {
    roundId,
    id: roundId,
    name: contest.title,
    division: coachDivision(contest.mirrors),
    scoringMode: "cf",
    formatVariant: "standard",
    source: "coach",
    section: "standard",
    programSequence: null,
    coachDay: day.day,
    cfHandleAtStart: handle,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    archivedAt: now,
    durationSeconds: contest.minutes * 60,
    effectiveElapsedSeconds: elapsed,
    pausedMsTotal: 0,
    finishReason: "coach",
    solved: board.solved,
    total: board.total,
    points: board.points,
    maxPoints: board.maxPoints,
    penaltyMinutes: 0,
    wrongAttempts: board.wrongAttempts,
    upsolveKeys,
    schemaVersion: 2,
    problems,
  };
  return {
    round,
    upsolve: unsolved.map((problem) => ({
      key: `${problem.contestId}-${problem.index}`,
      contestId: problem.contestId,
      index: problem.index,
      name: problem.name,
      rating: problem.rating,
      tags: problem.tags,
      source: "contest",
      originRoundId: roundId,
      originFinishedAt: run.finishedAt!,
      slot: problem.slot,
      addedAt: now,
      attempts: problem.wrongAttempts,
      status: "open",
    })),
  };
}
