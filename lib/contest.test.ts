import { describe, expect, it } from "vitest";
import {
  DIVISIONS,
  activeSecondsAt,
  codeforcesProblemPoints,
  countsAsWrongSubmission,
  finishContest,
  pauseContest,
  resumeContest,
  scoreboard,
  submissionActiveSeconds,
} from "./contest";
import type { VirtualContest } from "./types";

function round(overrides: Partial<VirtualContest> = {}): VirtualContest {
  return {
    id: "round-1",
    name: "Test round",
    division: "div3",
    scoringMode: "icpc",
    formatVariant: "standard",
    durationSeconds: 120 * 60,
    problems: [
      {
        contestId: 1,
        index: "A",
        slot: "A",
        name: "A",
        rating: 800,
        tags: [],
        points: 500,
      },
    ],
    createdAt: 1_000,
    startedAt: 1_000,
    pausedMs: 0,
    pausedAt: null,
    pauseSegments: [],
    finishedAt: null,
    states: {
      "1-A": {
        key: "1-A",
        state: "unsolved",
        wrongAttempts: 0,
      },
    },
    ...overrides,
  };
}

describe("division formats", () => {
  it("uses Codeforces scoring modes and sampled round lengths", () => {
    expect(DIVISIONS.div4).toMatchObject({
      scoringMode: "icpc",
      minutes: 135,
    });
    expect(DIVISIONS.div4.slots).toHaveLength(7);
    expect(DIVISIONS.div3).toMatchObject({
      scoringMode: "icpc",
      minutes: 150,
    });
    expect(DIVISIONS.div3.slots).toHaveLength(8);
    expect(DIVISIONS.div2).toMatchObject({
      scoringMode: "cf",
      minutes: 120,
    });
    expect(DIVISIONS.div2.slots).toHaveLength(7);
    expect(DIVISIONS.div1).toMatchObject({
      scoringMode: "cf",
      minutes: 150,
    });
    expect(DIVISIONS.div1.slots).toHaveLength(7);
  });
});

describe("Codeforces scoring", () => {
  it("uses completed minutes and the official integer decay", () => {
    expect(codeforcesProblemPoints(500, 4 * 60 + 59, 120 * 60)).toBe(492);
  });

  it("uses Codeforces wrong-attempt exclusions", () => {
    expect(countsAsWrongSubmission("cf", "COMPILATION_ERROR", 0)).toBe(false);
    expect(countsAsWrongSubmission("cf", "WRONG_ANSWER", 0)).toBe(false);
    expect(countsAsWrongSubmission("cf", "WRONG_ANSWER", 1)).toBe(true);
    expect(countsAsWrongSubmission("icpc", "WRONG_ANSWER", 0)).toBe(true);
    expect(countsAsWrongSubmission("cf", "OK", 10)).toBe(false);
  });

  it("charges 50 per wrong attempt without crossing the 30% floor", () => {
    expect(codeforcesProblemPoints(500, 4 * 60, 120 * 60, 1)).toBe(442);
    expect(codeforcesProblemPoints(500, 119 * 60, 120 * 60, 20)).toBe(150);
  });

  it("keeps ICPC solve count and penalty separate", () => {
    const contest = round({
      states: {
        "1-A": {
          key: "1-A",
          state: "solved",
          wrongAttempts: 2,
          solvedAtSeconds: 10 * 60 + 59,
        },
      },
    });
    expect(scoreboard(contest)).toMatchObject({
      mode: "icpc",
      solved: 1,
      points: 1,
      penaltyMinutes: 30,
      wrongAttempts: 2,
    });
  });

  it("uses decayed points for standard CF rounds", () => {
    const contest = round({
      division: "div2",
      scoringMode: "cf",
      states: {
        "1-A": {
          key: "1-A",
          state: "solved",
          wrongAttempts: 1,
          solvedAtSeconds: 4 * 60,
        },
      },
    });
    expect(scoreboard(contest)).toMatchObject({
      mode: "cf",
      solved: 1,
      points: 442,
      maxPoints: 500,
      lostToTime: 8,
      lostToWrong: 50,
    });
  });
});

describe("pause-aware time", () => {
  it("excludes complete pause segments from active time", () => {
    let contest = round();
    contest = pauseContest(contest, 11_000);
    contest = resumeContest(contest, 31_000);
    expect(activeSecondsAt(contest, 61_000)).toBe(40);
  });

  it("maps submissions during a pause to the pause-start clock", () => {
    const contest = pauseContest(round(), 11_000);
    expect(submissionActiveSeconds(contest, 25)).toBe(10);
  });

  it("closes an open pause when the round finishes", () => {
    const contest = finishContest(
      pauseContest(round(), 11_000),
      "manual",
      31_000,
    );
    expect(contest.pausedAt).toBeNull();
    expect(contest.pauseSegments).toEqual([{ from: 11_000, to: 31_000 }]);
    expect(activeSecondsAt(contest, 31_000)).toBe(10);
  });
});
