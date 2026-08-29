import type { CfRatingChange, CfSubmission, CfUser, SolveStats } from "./cf";

export interface SessionUser {
  id: string;
  username: string;
  email?: string | null;
  cfHandle?: string | null;
}

/** Everything the dashboard and analytics pages need, in one fetch. */
export interface CfProfile {
  handle: string;
  user: CfUser;
  ratingHistory: CfRatingChange[];
  submissions: CfSubmission[];
  stats: SolveStats;
  fetchedAt: number;
}

/* ---------------- Virtual contest ---------------- */

export type ContestDivision = "div1" | "div2" | "div3" | "div4" | "custom";
export type ContestScoringMode = "cf" | "icpc";
export type ContestFormatVariant = "standard" | "customized" | "legacy";
export type ContestSource = "virtual" | "coach" | "legacy";
export type ContestSection = "standard" | "first-time-trials";
export type ContestFinishReason = "manual" | "expired" | "coach";

export interface ContestPauseSegment {
  from: number;
  to: number | null;
}

export interface ContestProblemRef {
  contestId: number;
  /**
   * The problem's real Codeforces index. This is what builds the URL and what
   * submissions are matched against, so it must not be replaced by the slot
   * letter — a problem sitting in slot A may well be 1300B.
   */
  index: string;
  /** Position in the virtual set, A upwards. Display and per-slot analysis only. */
  slot?: string;
  name: string;
  rating?: number;
  tags: string[];
  /** Points awarded, mirroring Codeforces' per-index scoring. */
  points: number;
}

/** Slot letter for display, falling back to the index on pre-slot records. */
export function slotOf(p: { slot?: string; index: string }): string {
  return p.slot ?? p.index;
}

export type ProblemState = "unsolved" | "solved" | "attempted";

export interface ContestProblemState {
  key: string;
  state: ProblemState;
  /** Wrong attempts before the accept; each costs a penalty. */
  wrongAttempts: number;
  solvedAtSeconds?: number;
  /** Manual verdicts remain available as an outage fallback, but are auditable. */
  verdictSource?: "codeforces" | "manual";
}

export interface VirtualContest {
  id: string;
  name: string;
  division: ContestDivision;
  scoringMode?: ContestScoringMode;
  formatVariant?: ContestFormatVariant;
  cfHandleAtStart?: string;
  durationSeconds: number;
  problems: ContestProblemRef[];
  createdAt: number;
  /** Epoch ms when the clock started; null while not yet begun. */
  startedAt: number | null;
  /** Accumulated paused milliseconds, subtracted from elapsed. */
  pausedMs: number;
  pausedAt: number | null;
  /** Complete pause history, used to map CF submission time onto active time. */
  pauseSegments?: ContestPauseSegment[];
  finishedAt: number | null;
  finishReason?: ContestFinishReason;
  states: Record<string, ContestProblemState>;
}

/**
 * Per-problem outcome kept on an archived round. Aggregates alone cannot answer
 * the question that decides contest rating — which letter you stop at — so the
 * slot, its rating and the minute it fell are recorded too.
 */
export interface ContestResultProblem {
  contestId: number;
  index: string;
  slot?: string;
  name: string;
  rating: number;
  tags: string[];
  solved: boolean;
  attempted?: boolean;
  state?: ProblemState;
  wrongAttempts: number;
  /** Seconds into the round when accepted; absent when never solved. */
  solvedAtSeconds?: number;
  verdictSource?: "codeforces" | "manual";
}

export interface ContestResult {
  id: string;
  name: string;
  division: ContestDivision;
  scoringMode?: ContestScoringMode;
  formatVariant?: ContestFormatVariant;
  source?: ContestSource;
  section?: ContestSection;
  programSequence?: number | null;
  coachDay?: number;
  cfHandleAtStart?: string;
  startedAt?: number;
  finishedAt: number;
  archivedAt?: number;
  durationSeconds: number;
  effectiveElapsedSeconds?: number;
  pausedMsTotal?: number;
  finishReason?: ContestFinishReason;
  solved: number;
  total: number;
  points: number;
  maxPoints?: number;
  penaltyMinutes: number;
  wrongAttempts?: number;
  upsolveKeys?: string[];
  schemaVersion?: number;
  /** Absent on rounds archived before per-problem detail was recorded. */
  problems?: ContestResultProblem[];
}

export interface ContestDataDoc {
  active: VirtualContest | null;
  history: ContestResult[];
  updatedAt?: string;
}

/** Hot mutable state. One document exists per authenticated account. */
export interface ContestActiveDoc {
  contest: VirtualContest | null;
  version: number;
  savedAt: string | null;
}

/** Immutable archived row returned by the contest APIs. */
export interface ContestRoundDoc extends ContestResult {
  roundId: string;
  ownerId?: string;
}

export interface ContestProgramDoc {
  targetRounds: number;
  completedRounds: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ContestRoundsPage {
  rounds: ContestRoundDoc[];
  nextCursor: string | null;
  total: number;
}

/* ---------------- Practice / picker ---------------- */

export interface PracticeEntry {
  key: string;
  contestId?: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
  addedAt: number;
  status: "todo" | "solved" | "skipped";
  solvedAt?: number;
  /** Seconds spent, when picked up from a timed rapid session. */
  seconds?: number;
  note?: string;
}

export interface PracticeDataDoc {
  entries: PracticeEntry[];
  /** Preferred rating band and tags, remembered between sessions. */
  prefs?: {
    minRating?: number;
    maxRating?: number;
    tags?: string[];
  };
  /** Ticked-off A2OJ problems, keyed by ladder or topic slug. */
  ladderProgress?: Record<string, string[]>;
  /** The running timed session, if one is open. */
  session?: RapidSession | null;
  sessionHistory?: RapidSessionResult[];
  updatedAt?: string;
}

/* ---------------- Rapid (timed) session ---------------- */

export interface RapidProblem {
  key: string;
  contestId?: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
}

export interface RapidSession {
  id: string;
  problems: RapidProblem[];
  /** Seconds allowed per problem; 900 is the rapid default. */
  perProblemSeconds: number;
  startedAt: number;
  currentIndex: number;
  /** Epoch ms the current problem's timer began. */
  currentStartedAt: number;
  results: RapidResult[];
}

export interface RapidResult {
  key: string;
  outcome: "solved" | "failed" | "skipped";
  seconds: number;
}

export interface RapidSessionResult {
  id: string;
  startedAt: number;
  finishedAt: number;
  total: number;
  solved: number;
  perProblemSeconds: number;
  results: RapidResult[];
}

/* ---------------- Upsolve ---------------- */

export interface UpsolveEntry {
  key: string;
  contestId?: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
  /** Where it came from: a rated round, a virtual, or plain practice. */
  source: "contest" | "virtual" | "practice";
  originRoundId?: string;
  originFinishedAt?: number;
  slot?: string;
  addedAt: number;
  attempts: number;
  status: "open" | "done" | "dropped";
  doneAt?: number;
  note?: string;
}

export interface UpsolveDataDoc {
  entries: UpsolveEntry[];
  updatedAt?: string;
}

/* ---------------- A2OJ ----------------
 * Per-problem keys are single letters because these files hold 12,738 problems
 * between them and the field names were a third of the payload.
 */

export interface LadderProblem {
  /** name */ n: string;
  /** url */ u: string;
  /** current Codeforces rating, when available */ r: number | null;
  /** A2OJ difficulty level (1-10), when supplied by the source */ d: number | null;
  /** judge/platform */ p: string;
  /** contestId */ c?: number;
  /** index */ i?: string;
}

export interface LadderMeta {
  slug: string;
  name: string;
  group: string;
  count: number;
  minRating: number | null;
  maxRating: number | null;
  avgRating: number | null;
  minDifficulty: number | null;
  maxDifficulty: number | null;
  platforms: string[];
}

export interface LadderIndex {
  lastUpdated: string;
  ladders: LadderMeta[];
}

export interface LadderDetail {
  slug: string;
  name: string;
  problems: LadderProblem[];
}

export interface CategoryProblem {
  /** name */ n: string;
  /** url */ u: string;
  /** platform */ p: string | null;
  /** difficulty */ d: number | null;
  /** year */ y: string | null;
  /** contestId */ c?: number;
  /** index */ i?: string;
}

export interface CategoryMeta {
  slug: string;
  name: string;
  count: number;
  platforms: { name: string; n: number }[];
}

export interface CategoryIndex {
  lastUpdated: string;
  categories: CategoryMeta[];
}

export interface CategoryDetail {
  slug: string;
  name: string;
  problems: CategoryProblem[];
}

/** Per-ladder progress, stored inside the practice document. */
export interface LadderProgress {
  [slug: string]: string[];
}
