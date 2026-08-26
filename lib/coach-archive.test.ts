import { describe, expect, it } from "vitest";
import { buildCoachArchive } from "./coach-archive";
import type { CoachDay, RunDoc } from "./coach";

const day: CoachDay = {
  day: 9,
  date: "2026-08-25",
  focus: "Contest",
  contest: {
    title: "Coach Div. 2",
    minutes: 120,
    mirrors: "Div. 2 · 120 min",
    problems: [
      {
        key: "1-A",
        contestId: 1,
        index: "A",
        slot: "A",
        name: "A",
        rating: 1000,
        tags: ["implementation"],
        capMinutes: 20,
        role: "contest",
        points: 500,
      },
      {
        key: "2-B",
        contestId: 2,
        index: "B",
        slot: "B",
        name: "B",
        rating: 1300,
        tags: ["greedy"],
        capMinutes: 40,
        role: "contest",
        points: 1000,
      },
    ],
  },
};

const run: RunDoc = {
  id: "contest-9",
  kind: "contest",
  day: 9,
  date: "2026-08-25",
  startedAt: 1_000,
  finishedAt: 3_601_000,
  activeKey: null,
  entries: {
    "1-A": {
      key: "1-A",
      segments: [],
      status: "solved",
      wrongAttempts: 1,
      solvedAtSeconds: 600,
    },
    "2-B": {
      key: "2-B",
      segments: [],
      status: "todo",
      wrongAttempts: 0,
    },
  },
};

describe("coach contest archive", () => {
  it("normalizes a finished coach run into the shared round store", () => {
    const result = buildCoachArchive(day, run, "tourist", 5_000_000);
    expect(result.round).toMatchObject({
      roundId: "coach-9",
      source: "coach",
      section: "standard",
      division: "div2",
      scoringMode: "cf",
      solved: 1,
      total: 2,
      points: 430,
      maxPoints: 500,
      wrongAttempts: 1,
      effectiveElapsedSeconds: 3600,
    });
    expect(result.round.problems?.[0]).toMatchObject({
      solved: true,
      solvedAtSeconds: 600,
      wrongAttempts: 1,
    });
    expect(result.upsolve).toEqual([
      expect.objectContaining({
        key: "2-B",
        originRoundId: "coach-9",
        source: "contest",
        status: "open",
      }),
    ]);
  });
});
