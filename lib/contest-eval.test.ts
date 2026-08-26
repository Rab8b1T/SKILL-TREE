import { describe, expect, it } from "vitest";
import { buildContestEvaluation } from "./contest-eval";
import type { ContestRoundDoc } from "./types";

function archived(
  sequence: number,
  overrides: Partial<ContestRoundDoc> = {},
): ContestRoundDoc {
  return {
    roundId: `round-${sequence}`,
    id: `round-${sequence}`,
    name: `Round ${sequence}`,
    division: "div3",
    scoringMode: "icpc",
    formatVariant: "standard",
    source: "virtual",
    section: "standard",
    programSequence: sequence,
    startedAt: Date.UTC(2026, 7, 25, sequence),
    finishedAt: Date.UTC(2026, 7, 25, sequence, 30),
    durationSeconds: 9_000,
    effectiveElapsedSeconds: 3_600,
    pausedMsTotal: 0,
    solved: 1,
    total: 2,
    points: 1,
    penaltyMinutes: 20,
    wrongAttempts: 1,
    problems: [
      {
        contestId: sequence,
        index: "A",
        slot: "A",
        name: "A",
        rating: 900,
        tags: ["implementation"],
        solved: true,
        attempted: true,
        state: "solved",
        wrongAttempts: 0,
        solvedAtSeconds: 600,
      },
      {
        contestId: sequence,
        index: "B",
        slot: "B",
        name: "B",
        rating: 1100,
        tags: ["greedy"],
        solved: false,
        attempted: true,
        state: "attempted",
        wrongAttempts: 1,
      },
    ],
    ...overrides,
  };
}

describe("contest evaluation", () => {
  it("summarizes counted rounds and excludes trial rows", () => {
    const result = buildContestEvaluation({
      rounds: [
        archived(1),
        archived(2, {
          section: "first-time-trials",
          programSequence: null,
        }),
      ],
      program: {
        targetRounds: 200,
        completedRounds: 1,
        createdAt: null,
        updatedAt: null,
      },
      upsolve: [],
      timezone: "Asia/Kolkata",
    });
    expect(result.summary).toMatchObject({
      completed: 1,
      target: 200,
      solved: 1,
      problems: 2,
      solveRate: 0.5,
      deepestSolved: "A",
      virtualRounds: 1,
    });
    expect(result.slots.find((slot) => slot.slot === "B")).toMatchObject({
      seen: 1,
      attempted: 1,
      solved: 0,
      wrongAttempts: 1,
    });
    expect(result.unsolvedTags).toEqual([{ tag: "greedy", count: 1 }]);
  });

  it("joins contest-origin upsolve completion", () => {
    const result = buildContestEvaluation({
      rounds: [archived(1)],
      program: {
        targetRounds: 200,
        completedRounds: 1,
        createdAt: null,
        updatedAt: null,
      },
      upsolve: [
        {
          key: "1-B",
          contestId: 1,
          index: "B",
          name: "B",
          rating: 1100,
          tags: ["greedy"],
          source: "virtual",
          originRoundId: "round-1",
          addedAt: 1_000,
          doneAt: 86_401_000,
          attempts: 1,
          status: "done",
        },
      ],
    });
    expect(result.upsolve).toEqual({
      queued: 1,
      cleared: 1,
      open: 0,
      medianClearDays: 1,
    });
  });

  it("compares equal 20-contest windows", () => {
    const rounds = Array.from({ length: 40 }, (_, index) =>
      archived(index + 1, {
        solved: index < 20 ? 1 : 2,
        wrongAttempts: index < 20 ? 2 : 1,
      }),
    );
    const result = buildContestEvaluation({
      rounds,
      program: {
        targetRounds: 200,
        completedRounds: 40,
        createdAt: null,
        updatedAt: null,
      },
      upsolve: [],
    });
    expect(result.comparison).toMatchObject({
      size: 20,
      previousSolveRate: 0.5,
      currentSolveRate: 1,
      solveRateDelta: 0.5,
      wrongPerRoundDelta: -1,
    });
  });
});
