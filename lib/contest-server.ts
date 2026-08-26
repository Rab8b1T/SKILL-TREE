import "server-only";

import crypto from "node:crypto";
import { problemKey } from "./cf";
import {
  DIVISIONS,
  countsAsWrongSubmission,
  elapsedSeconds,
  emptyState,
  finishContest,
  pausedMilliseconds,
  scoringMode,
  scoreboard,
  submissionActiveSeconds,
} from "./contest";
import {
  getContestList,
  getProblemset,
  getUserStatusPage,
  getUserStatusSince,
} from "./cf-server";
import { usedContestProblemKeys } from "./contest-store";
import { HttpError } from "./mongo";
import { slotOf } from "./types";
import type {
  ContestDivision,
  ContestProblemRef,
  ContestProblemState,
  ContestRoundDoc,
  UpsolveEntry,
  VirtualContest,
} from "./types";

type GeneratedDivision = Exclude<ContestDivision, "custom">;

function originDivision(name: string): GeneratedDivision | null {
  if (/\bdiv\.?\s*4\b/i.test(name)) return "div4";
  if (/\bdiv\.?\s*3\b/i.test(name)) return "div3";
  if (/\bdiv\.?\s*2\b/i.test(name) && !/div\.?\s*1\s*\+\s*div\.?\s*2/i.test(name)) {
    return "div2";
  }
  if (/\bdiv\.?\s*1\b/i.test(name) && !/div\.?\s*1\s*\+\s*div\.?\s*2/i.test(name)) {
    return "div1";
  }
  return null;
}

function weightedPick<T>(items: T[], weight: (item: T) => number): T {
  const weights = items.map((item) => Math.max(1, Math.round(weight(item))));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let target = crypto.randomInt(total);
  for (let i = 0; i < items.length; i++) {
    target -= weights[i];
    if (target < 0) return items[i];
  }
  return items.at(-1)!;
}

export async function assembleVirtualContest(input: {
  userId: string;
  handle: string;
  division: GeneratedDivision;
  slots?: number;
  minutes?: number;
}): Promise<VirtualContest> {
  const config = DIVISIONS[input.division];
  const slotCount = Math.min(
    config.slots.length,
    Math.max(2, input.slots ?? config.slots.length),
  );
  const durationMinutes = Math.min(
    300,
    Math.max(15, input.minutes ?? config.minutes),
  );
  const formatVariant =
    slotCount === config.slots.length && durationMinutes === config.minutes
      ? "standard"
      : "customized";

  const [{ problems, problemStatistics }, submissions, contests, used] =
    await Promise.all([
      getProblemset(),
      getUserStatusPage(input.handle, 1, 10_000),
      getContestList(false),
      usedContestProblemKeys(input.userId),
    ]);
  const solved = new Set(
    submissions
      .filter((submission) => submission.verdict === "OK")
      .map((submission) => problemKey(submission.problem)),
  );
  const solvedCount = new Map(
    problemStatistics.map((row) => [
      `${row.contestId}-${row.index}`,
      row.solvedCount,
    ]),
  );
  const contestDivision = new Map(
    contests.map((contest) => [contest.id, originDivision(contest.name)]),
  );
  const usedContests = new Set<number>();
  const picked: ContestProblemRef[] = [];

  for (const slot of config.slots.slice(0, slotCount)) {
    const stages = [
      { widen: 0, sameDivision: true, minimumSolved: input.division === "div1" ? 50 : 200 },
      { widen: 0, sameDivision: false, minimumSolved: input.division === "div1" ? 30 : 100 },
      { widen: 100, sameDivision: false, minimumSolved: 30 },
    ];
    let pool = [] as typeof problems;

    for (const stage of stages) {
      pool = problems.filter((problem) => {
        if (!problem.contestId || !problem.rating) return false;
        if (problem.type && problem.type !== "PROGRAMMING") return false;
        if (problem.rating < slot.rating[0] - stage.widen) return false;
        if (problem.rating > slot.rating[1] + stage.widen) return false;
        const key = problemKey(problem);
        if (solved.has(key) || used.has(key)) return false;
        if (usedContests.has(problem.contestId)) return false;
        if ((solvedCount.get(key) ?? 0) < stage.minimumSolved) return false;
        if (
          stage.sameDivision &&
          contestDivision.get(problem.contestId) !== input.division
        ) {
          return false;
        }
        return true;
      });
      if (pool.length) break;
    }

    if (!pool.length) {
      throw new HttpError(
        409,
        `Could not fill slot ${slot.index} without repeating a solved or previously used problem`,
      );
    }

    const onTopic = pool.filter((problem) =>
      problem.tags.some((tag) => config.tags.includes(tag)),
    );
    const candidates = onTopic.length >= 3 ? onTopic : pool;
    const chosen = weightedPick(candidates, (problem) =>
      Math.log10((solvedCount.get(problemKey(problem)) ?? 1) + 10) * 100,
    );
    usedContests.add(chosen.contestId!);
    picked.push({
      contestId: chosen.contestId!,
      index: chosen.index,
      slot: slot.index,
      name: chosen.name,
      rating: chosen.rating,
      tags: chosen.tags,
      points: slot.points,
    });
  }

  const now = Date.now();
  const id = `${input.division}-${now.toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  return {
    id,
    name: `${config.name} virtual`,
    division: input.division,
    scoringMode: config.scoringMode,
    formatVariant,
    cfHandleAtStart: input.handle,
    durationSeconds: durationMinutes * 60,
    problems: picked,
    createdAt: now,
    startedAt: now,
    pausedMs: 0,
    pausedAt: null,
    pauseSegments: [],
    finishedAt: null,
    states: Object.fromEntries(
      picked.map((problem) => {
        const key = `${problem.contestId}-${problem.index}`;
        return [key, emptyState(key)];
      }),
    ),
  };
}

export async function syncVirtualContestVerdicts(
  contest: VirtualContest,
  handle: string,
): Promise<VirtualContest> {
  if (!contest.startedAt) return contest;
  const since = Math.floor(contest.startedAt / 1000);
  const until = Math.floor((contest.finishedAt ?? Date.now()) / 1000);
  const wanted = new Set(
    contest.problems.map((problem) => `${problem.contestId}-${problem.index}`),
  );
  const submissions = (await getUserStatusSince(handle, since))
    .filter((submission) => submission.creationTimeSeconds <= until)
    .sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds);
  const fromCf = new Map<
    string,
    { solved: boolean; wrongAttempts: number; solvedAtSeconds?: number }
  >();
  for (const key of wanted) {
    fromCf.set(key, { solved: false, wrongAttempts: 0 });
  }

  for (const submission of submissions) {
    const key = problemKey(submission.problem);
    const state = fromCf.get(key);
    if (!state || state.solved) continue;
    if (submission.verdict === "OK") {
      state.solved = true;
      state.solvedAtSeconds = submissionActiveSeconds(
        contest,
        submission.creationTimeSeconds,
      );
    } else if (
      countsAsWrongSubmission(
        scoringMode(contest),
        submission.verdict,
        submission.passedTestCount,
      )
    ) {
      state.wrongAttempts += 1;
    }
  }

  let changed = false;
  const states: Record<string, ContestProblemState> = { ...contest.states };
  for (const [key, cf] of fromCf) {
    const previous = states[key] ?? emptyState(key);
    const solved = cf.solved || previous.state === "solved";
    const next: ContestProblemState = {
      ...previous,
      state: solved
        ? "solved"
        : cf.wrongAttempts > 0
          ? "attempted"
          : previous.state,
      wrongAttempts: Math.max(previous.wrongAttempts, cf.wrongAttempts),
      solvedAtSeconds:
        cf.solvedAtSeconds ?? previous.solvedAtSeconds,
      verdictSource: cf.solved
        ? "codeforces"
        : previous.verdictSource,
    };
    if (JSON.stringify(previous) !== JSON.stringify(next)) changed = true;
    states[key] = next;
  }
  return changed ? { ...contest, states } : contest;
}

export async function buildVirtualArchive(
  contest: VirtualContest,
  handle: string,
): Promise<{
  contest: VirtualContest;
  round: ContestRoundDoc;
  upsolve: UpsolveEntry[];
}> {
  const finished = contest.finishedAt
    ? contest
    : finishContest(contest, "manual");
  const synced = await syncVirtualContestVerdicts(finished, handle);
  const board = scoreboard(synced);
  const finishedAt = synced.finishedAt ?? Date.now();
  const archivedAt = Date.now();
  const problems = synced.problems.map((problem) => {
    const key = `${problem.contestId}-${problem.index}`;
    const state = synced.states[key] ?? emptyState(key);
    return {
      contestId: problem.contestId,
      index: problem.index,
      slot: slotOf(problem),
      name: problem.name,
      rating: problem.rating ?? 0,
      tags: problem.tags,
      solved: state.state === "solved",
      attempted: state.state !== "unsolved" || state.wrongAttempts > 0,
      state: state.state,
      wrongAttempts: state.wrongAttempts,
      ...(state.solvedAtSeconds !== undefined
        ? { solvedAtSeconds: state.solvedAtSeconds }
        : {}),
      ...(state.verdictSource ? { verdictSource: state.verdictSource } : {}),
    };
  });
  const unsolved = problems.filter((problem) => !problem.solved);
  const upsolveKeys = unsolved.map(
    (problem) => `${problem.contestId}-${problem.index}`,
  );
  const round: ContestRoundDoc = {
    roundId: synced.id,
    id: synced.id,
    name: synced.name,
    division: synced.division,
    scoringMode: board.mode,
    formatVariant: synced.formatVariant ?? "standard",
    source: "virtual",
    section: "standard",
    programSequence: null,
    cfHandleAtStart: synced.cfHandleAtStart ?? handle,
    startedAt: synced.startedAt ?? synced.createdAt,
    finishedAt,
    archivedAt,
    durationSeconds: synced.durationSeconds,
    effectiveElapsedSeconds: elapsedSeconds(synced, finishedAt),
    pausedMsTotal: pausedMilliseconds(synced, finishedAt),
    finishReason: synced.finishReason ?? "manual",
    solved: board.solved,
    total: board.total,
    points: board.points,
    maxPoints: board.maxPoints,
    penaltyMinutes: board.penaltyMinutes,
    wrongAttempts: board.wrongAttempts,
    upsolveKeys,
    schemaVersion: 2,
    problems,
  };
  const upsolve: UpsolveEntry[] = unsolved.map((problem) => ({
    key: `${problem.contestId}-${problem.index}`,
    contestId: problem.contestId,
    index: problem.index,
    name: problem.name,
    rating: problem.rating,
    tags: problem.tags,
    source: "virtual",
    originRoundId: synced.id,
    originFinishedAt: finishedAt,
    slot: slotOf(problem),
    addedAt: archivedAt,
    attempts: problem.wrongAttempts,
    status: "open",
  }));

  return { contest: synced, round, upsolve };
}
