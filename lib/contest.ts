import type {
  ContestDivision,
  ContestFinishReason,
  ContestProblemState,
  ContestScoringMode,
  VirtualContest,
} from "./types";
import type { CfVerdict } from "./cf";

/**
 * Stable generated shapes based on current Codeforces rounds. A generated set
 * cannot reproduce hacks or a live field, but its clock, scoring mode and
 * difficulty ladder should still match the selected division.
 */
export interface DivisionSlot {
  index: string;
  rating: [number, number];
  /** Used only by standard CF scoring. ICPC rounds count solved problems. */
  points: number;
}

export interface DivisionConfig {
  name: string;
  scoringMode: ContestScoringMode;
  slots: DivisionSlot[];
  minutes: number;
  tags: string[];
}

export const DIVISIONS: Record<Exclude<ContestDivision, "custom">, DivisionConfig> = {
  div4: {
    name: "Div. 4",
    scoringMode: "icpc",
    slots: [
      { index: "A", rating: [800, 900], points: 0 },
      { index: "B", rating: [900, 1000], points: 0 },
      { index: "C", rating: [1000, 1100], points: 0 },
      { index: "D", rating: [1100, 1200], points: 0 },
      { index: "E", rating: [1200, 1300], points: 0 },
      { index: "F", rating: [1300, 1400], points: 0 },
      { index: "G", rating: [1400, 1500], points: 0 },
    ],
    minutes: 135,
    tags: ["implementation", "math", "greedy", "brute force", "constructive algorithms"],
  },
  div3: {
    name: "Div. 3",
    scoringMode: "icpc",
    slots: [
      { index: "A", rating: [800, 1000], points: 0 },
      { index: "B", rating: [1000, 1100], points: 0 },
      { index: "C", rating: [1100, 1300], points: 0 },
      { index: "D", rating: [1300, 1400], points: 0 },
      { index: "E", rating: [1400, 1500], points: 0 },
      { index: "F1", rating: [1500, 1600], points: 0 },
      { index: "F2", rating: [1600, 1700], points: 0 },
      { index: "G", rating: [1700, 1800], points: 0 },
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
    scoringMode: "cf",
    slots: [
      { index: "A", rating: [1000, 1200], points: 500 },
      { index: "B", rating: [1200, 1400], points: 1000 },
      { index: "C", rating: [1400, 1600], points: 1500 },
      { index: "D", rating: [1600, 1800], points: 2000 },
      { index: "E", rating: [1800, 2000], points: 2500 },
      { index: "F1", rating: [2000, 2200], points: 3000 },
      { index: "F2", rating: [2200, 2400], points: 3000 },
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
    scoringMode: "cf",
    slots: [
      { index: "A", rating: [1500, 1700], points: 500 },
      { index: "B", rating: [1700, 1900], points: 1000 },
      { index: "C", rating: [1900, 2100], points: 1500 },
      { index: "D", rating: [2100, 2300], points: 2000 },
      { index: "E1", rating: [2300, 2500], points: 2500 },
      { index: "E2", rating: [2500, 2700], points: 2500 },
      { index: "F", rating: [2700, 3000], points: 3000 },
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
export const WRONG_SUBMISSION_PENALTY = 50;
export const CF_SCORE_FLOOR = 0.3;

export function countsAsWrongSubmission(
  mode: ContestScoringMode,
  verdict?: CfVerdict,
  passedTestCount?: number,
): boolean {
  if (!verdict || verdict === "TESTING" || verdict === "COMPILATION_ERROR") {
    return false;
  }
  if (mode === "cf" && passedTestCount === 0) return false;
  return verdict !== "OK";
}

/** Legacy/custom fallback. Standard templates carry an explicit point value. */
export function pointsForIndex(index: string): number {
  const position = index.charCodeAt(0) - 65;
  return 500 * (position + 1);
}

/**
 * Total paused milliseconds before `at`. New rounds use complete segments;
 * old persisted rounds fall back to the aggregate fields they already carry.
 */
export function pausedMilliseconds(c: VirtualContest, at = Date.now()): number {
  if (c.pauseSegments) {
    return c.pauseSegments.reduce((sum, segment) => {
      const end = Math.min(at, segment.to ?? at);
      return sum + Math.max(0, end - segment.from);
    }, 0);
  }
  return c.pausedMs + (c.pausedAt ? Math.max(0, at - c.pausedAt) : 0);
}

/** Active contest seconds at an arbitrary wall-clock timestamp. */
export function activeSecondsAt(c: VirtualContest, at = Date.now()): number {
  if (!c.startedAt) return 0;
  const end = Math.min(at, c.finishedAt ?? at);
  return Math.max(
    0,
    Math.floor((end - c.startedAt - pausedMilliseconds(c, end)) / 1000),
  );
}

/** Wall-clock seconds consumed, excluding all paused stretches. */
export function elapsedSeconds(c: VirtualContest, now = Date.now()): number {
  return activeSecondsAt(c, c.finishedAt ?? now);
}

/** Converts a Codeforces epoch timestamp into this contest's active clock. */
export function submissionActiveSeconds(
  c: VirtualContest,
  creationTimeSeconds: number,
): number {
  return activeSecondsAt(c, creationTimeSeconds * 1000);
}

export function pauseContest(c: VirtualContest, at = Date.now()): VirtualContest {
  if (c.finishedAt || c.pausedAt) return c;
  return {
    ...c,
    pausedAt: at,
    pauseSegments: [...(c.pauseSegments ?? []), { from: at, to: null }],
  };
}

export function resumeContest(c: VirtualContest, at = Date.now()): VirtualContest {
  if (!c.pausedAt) return c;
  const started = c.pausedAt;
  const segments = [...(c.pauseSegments ?? [{ from: started, to: null }])];
  const open = segments.findLastIndex((segment) => segment.to === null);
  if (open >= 0) segments[open] = { ...segments[open], to: at };
  return {
    ...c,
    pausedMs: c.pausedMs + Math.max(0, at - started),
    pausedAt: null,
    pauseSegments: segments,
  };
}

export function finishContest(
  c: VirtualContest,
  reason: ContestFinishReason,
  at = Date.now(),
): VirtualContest {
  const resumed = c.pausedAt ? resumeContest(c, at) : c;
  return { ...resumed, finishedAt: at, finishReason: reason };
}

export function remainingSeconds(c: VirtualContest, now = Date.now()): number {
  return Math.max(0, c.durationSeconds - elapsedSeconds(c, now));
}

export function isExpired(c: VirtualContest, now = Date.now()): boolean {
  return remainingSeconds(c, now) === 0;
}

export interface Scoreboard {
  mode: ContestScoringMode;
  solved: number;
  total: number;
  points: number;
  maxPoints: number;
  lostToTime: number;
  lostToWrong: number;
  penaltyMinutes: number;
  wrongAttempts: number;
}

/**
 * Official standard Codeforces formula. Time is measured in completed minutes;
 * the 30% floor applies after both time decay and wrong-submission penalties.
 */
export function codeforcesProblemPoints(
  maxPoints: number,
  solvedAtSeconds: number,
  durationSeconds: number,
  wrongAttempts = 0,
): number {
  // Codeforces defines decay as X/250 per completed minute. Contest duration
  // does not rescale that constant, but stays in the signature because callers
  // also use it when presenting the round format.
  void durationSeconds;
  const solveMinute = Math.max(0, Math.floor(solvedAtSeconds / 60));
  const timeLoss = Math.floor((maxPoints * solveMinute) / 250);
  return Math.max(
    Math.floor(maxPoints * CF_SCORE_FLOOR),
    maxPoints - timeLoss - wrongAttempts * WRONG_SUBMISSION_PENALTY,
  );
}

export function scoringMode(c: Pick<VirtualContest, "division" | "scoringMode">) {
  if (c.scoringMode) return c.scoringMode;
  return c.division === "custom" ? "cf" : DIVISIONS[c.division].scoringMode;
}

/** Computes both Codeforces and extended-ICPC boards from one saved state. */
export function scoreboard(c: VirtualContest): Scoreboard {
  const mode = scoringMode(c);
  let solved = 0;
  let points = 0;
  let maxPoints = 0;
  let lostToTime = 0;
  let lostToWrong = 0;
  let penalty = 0;
  let wrong = 0;

  for (const problem of c.problems) {
    const state = c.states[problem.contestId + "-" + problem.index];
    if (!state) continue;
    wrong += state.wrongAttempts;
    if (state.state === "solved") {
      solved++;
      const at = state.solvedAtSeconds ?? 0;
      if (mode === "cf") {
        const clean = codeforcesProblemPoints(
          problem.points,
          at,
          c.durationSeconds,
          0,
        );
        const actual = codeforcesProblemPoints(
          problem.points,
          at,
          c.durationSeconds,
          state.wrongAttempts,
        );
        points += actual;
        maxPoints += problem.points;
        lostToTime += problem.points - clean;
        lostToWrong += clean - actual;
      } else {
        // Keeping one point per solve makes archived ICPC rows self-describing;
        // the ranking remains solved count, then penalty.
        points += 1;
        maxPoints += 1;
        penalty +=
          Math.floor(at / 60) +
          state.wrongAttempts * WRONG_ATTEMPT_PENALTY_MIN;
      }
    }
  }

  return {
    mode,
    solved,
    total: c.problems.length,
    points,
    maxPoints,
    lostToTime,
    lostToWrong,
    penaltyMinutes: penalty,
    wrongAttempts: wrong,
  };
}

/** Value of an unsolved CF problem if accepted at `elapsed`. */
export function liveProblemPoints(
  c: VirtualContest,
  maxPoints: number,
  elapsed: number,
  wrongAttempts: number,
): number {
  return codeforcesProblemPoints(
    maxPoints,
    elapsed,
    c.durationSeconds,
    wrongAttempts,
  );
}

export function emptyState(key: string): ContestProblemState {
  return { key, state: "unsolved", wrongAttempts: 0 };
}

export function divisionLabel(d: ContestDivision): string {
  return d === "custom" ? "Custom" : DIVISIONS[d].name;
}
