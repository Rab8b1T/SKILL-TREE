import type {
  ContestDivision,
  ContestProblemState,
  VirtualContest,
} from "./types";

/**
 * Division shapes carried over from the previous implementation: per-index
 * rating windows and the official round length, so a virtual feels like the
 * real thing rather than an arbitrary set.
 */
export interface DivisionConfig {
  name: string;
  slots: { index: string; rating: [number, number] }[];
  minutes: number;
  tags: string[];
}

export const DIVISIONS: Record<Exclude<ContestDivision, "custom">, DivisionConfig> = {
  div4: {
    name: "Div. 4",
    slots: [
      { index: "A", rating: [800, 900] },
      { index: "B", rating: [900, 1000] },
      { index: "C", rating: [1000, 1100] },
      { index: "D", rating: [1100, 1200] },
      { index: "E", rating: [1200, 1300] },
      { index: "F", rating: [1300, 1400] },
      { index: "G", rating: [1400, 1500] },
    ],
    minutes: 120,
    tags: ["implementation", "math", "greedy", "brute force", "constructive algorithms"],
  },
  div3: {
    name: "Div. 3",
    slots: [
      { index: "A", rating: [800, 1000] },
      { index: "B", rating: [1000, 1200] },
      { index: "C", rating: [1200, 1300] },
      { index: "D", rating: [1300, 1400] },
      { index: "E", rating: [1400, 1500] },
      { index: "F", rating: [1500, 1600] },
      { index: "G", rating: [1600, 1700] },
    ],
    minutes: 150,
    tags: [
      "implementation",
      "math",
      "greedy",
      "dp",
      "data structures",
      "graphs",
      "sortings",
      "binary search",
      "constructive algorithms",
      "dfs and similar",
    ],
  },
  div2: {
    name: "Div. 2",
    slots: [
      { index: "A", rating: [1000, 1200] },
      { index: "B", rating: [1200, 1400] },
      { index: "C", rating: [1400, 1600] },
      { index: "D", rating: [1600, 1800] },
      { index: "E", rating: [1800, 2000] },
      { index: "F", rating: [2000, 2200] },
    ],
    minutes: 120,
    tags: [
      "dp",
      "greedy",
      "graphs",
      "data structures",
      "math",
      "number theory",
      "sortings",
      "binary search",
      "constructive algorithms",
      "two pointers",
    ],
  },
  div1: {
    name: "Div. 1",
    slots: [
      { index: "A", rating: [1500, 1700] },
      { index: "B", rating: [1700, 1900] },
      { index: "C", rating: [1900, 2100] },
      { index: "D", rating: [2100, 2300] },
      { index: "E", rating: [2300, 2500] },
      { index: "F", rating: [2500, 2800] },
    ],
    minutes: 150,
    tags: [
      "dp",
      "graphs",
      "data structures",
      "number theory",
      "combinatorics",
      "geometry",
      "binary search",
      "constructive algorithms",
      "bitmasks",
      "trees",
    ],
  },
};

/**
 * Minutes added to the penalty total per rejected attempt on a problem that is
 * eventually solved. This is Codeforces' own ICPC-mode figure; the point of the
 * virtual is to rehearse the real scoreboard, so the constant matches it.
 */
export const WRONG_ATTEMPT_PENALTY_MIN = 10;

/** Points per index, mirroring the ascending value of later problems. */
export function pointsForIndex(index: string): number {
  const position = index.charCodeAt(0) - 65;
  return 500 * (position + 1);
}

/**
 * Wall-clock seconds consumed, excluding paused stretches. Reading the pause
 * state at call time means a tab reopened after a pause resumes at the right
 * offset instead of jumping forward by however long it was closed.
 */
export function elapsedSeconds(c: VirtualContest, now = Date.now()): number {
  if (!c.startedAt) return 0;
  const end = c.finishedAt ?? now;
  const pausedNow = c.pausedAt ? end - c.pausedAt : 0;
  return Math.max(0, Math.floor((end - c.startedAt - c.pausedMs - pausedNow) / 1000));
}

export function remainingSeconds(c: VirtualContest, now = Date.now()): number {
  return Math.max(0, c.durationSeconds - elapsedSeconds(c, now));
}

export function isExpired(c: VirtualContest, now = Date.now()): boolean {
  return remainingSeconds(c, now) === 0;
}

export interface Scoreboard {
  solved: number;
  total: number;
  points: number;
  penaltyMinutes: number;
  wrongAttempts: number;
}

/**
 * ICPC-style: only solved problems contribute. Each contributes the minute it
 * was accepted plus a fixed charge per earlier rejection, which is why a fast
 * wrong-answer spree is more expensive than one careful late submission.
 */
export function scoreboard(c: VirtualContest): Scoreboard {
  let solved = 0;
  let points = 0;
  let penalty = 0;
  let wrong = 0;

  for (const problem of c.problems) {
    const state = c.states[problem.contestId + "-" + problem.index];
    if (!state) continue;
    wrong += state.wrongAttempts;
    if (state.state === "solved") {
      solved++;
      points += problem.points;
      penalty +=
        Math.floor((state.solvedAtSeconds ?? 0) / 60) +
        state.wrongAttempts * WRONG_ATTEMPT_PENALTY_MIN;
    }
  }

  return {
    solved,
    total: c.problems.length,
    points,
    penaltyMinutes: penalty,
    wrongAttempts: wrong,
  };
}

export function emptyState(key: string): ContestProblemState {
  return { key, state: "unsolved", wrongAttempts: 0 };
}

export function divisionLabel(d: ContestDivision): string {
  return d === "custom" ? "Custom" : DIVISIONS[d].name;
}
