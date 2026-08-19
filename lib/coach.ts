/**
 * The coach layer: a published day plan, and the live runs that execute it.
 *
 * Two halves that deliberately live in different places:
 *
 * - **The plan** is static JSON committed to git (`public/data/coach/plan.json`).
 *   The coach writes it, Vercel ships it, the app only ever reads it. That means
 *   a session can never be silently edited from the browser mid-run, which is
 *   the whole point of a sealed set.
 * - **The run** is per-user state in MongoDB (`arena_data`). It records what
 *   actually happened: which minute each problem was opened, how long was spent
 *   genuinely working on it, and what the verdict was.
 *
 * The run is the evidence base for the next morning's coaching, so it measures
 * engaged time rather than wall-clock time. See `activeSeconds`.
 */

/* ------------------------------------------------------------------ plan --- */

export type CoachRole = "speed" | "core" | "upsolve" | "retention" | "contest";

export interface CoachProblem {
  /** `contestId-index`, matching `problemKey()` so verdict sync lines up. */
  key: string;
  contestId: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
  /** Hard cap in minutes. At the cap you stop, whatever state the code is in. */
  capMinutes: number;
  role: CoachRole;
  /**
   * Withholds the tag list until the problem is finished. A practice set that
   * captions each problem with its own technique is blocked practice with an
   * answer key attached, and trains nothing about choosing.
   */
  sealed?: boolean;
  /** The algorithm, sort key or invariant — revealed only once done. */
  reveal?: string;
  /** Why this problem is in today's set. Always safe to show. */
  why?: string;
}

export interface CoachBlock {
  id: string;
  label: string;
  minutes: number;
  /** What this block trains, in process terms rather than algorithmic ones. */
  note?: string;
  problems: CoachProblem[];
}

export interface CoachPractice {
  title: string;
  blocks: CoachBlock[];
}

export interface CoachContestProblem extends CoachProblem {
  /** Position in the round, A upwards — not the problem's real CF index. */
  slot: string;
  /** Maximum value before decay, mirroring Codeforces' 500-per-slot ladder. */
  points: number;
}

export interface CoachContest {
  title: string;
  minutes: number;
  /** The real round shape this imitates, e.g. "Div. 2 · 120 min". */
  mirrors: string;
  /** Read before the clock starts; the target for the night. */
  target?: string;
  problems: CoachContestProblem[];
}

/** The mentor panel — the CM tracker's read, carried into the app. */
export interface CoachMentor {
  rating: number;
  rank: string;
  goalRating: number;
  goalDate: string;
  /** Plain-language statement of the binding constraint right now. */
  headline: string;
  detail: string;
  /** Highest-severity open weaknesses, worst first. */
  weaknesses: { id: string; label: string; severity: number }[];
  /** Contest-pace targets, measured from real standings. */
  pace: { slot: string; targetMinutes: number; yourMinutes: number | null }[];
  checkpoints: { date: string; rounds: number; rating: number }[];
}

export interface CoachDay {
  day: number;
  /** `YYYY-MM-DD`, local. This is what selects "today". */
  date: string;
  focus: string;
  concept?: string;
  /** The single thing to watch for. Shown at the top of both runners. */
  watchFor?: string;
  practice?: CoachPractice;
  contest?: CoachContest;
}

export interface CoachPlan {
  updatedAt: string;
  handle: string;
  mentor: CoachMentor;
  days: CoachDay[];
}

/* ------------------------------------------------------------------- run --- */

/**
 * One stretch of genuinely engaged time. `to === null` means the segment is
 * still open. Time is derived from these rather than counted by a ticking
 * integer so a reload, a closed laptop or a crashed tab cannot inflate it.
 */
export interface Segment {
  from: number;
  to: number | null;
}

/**
 * A break you declared, rather than one inferred from silence.
 *
 * Time inside a break is removed from the session's wall clock, so the focus
 * ratio compares real work against real waste. Without this, twenty minutes of
 * breakfast and twenty minutes of scrolling are the same number, and the ratio
 * stops being worth reading over a five-hour morning.
 */
export interface BreakSpan {
  from: number;
  to: number | null;
  /** Problem that held the clock, so ending the break can put it back. */
  resumeKey?: string;
  /** Detected from a machine absence rather than declared by you. */
  auto?: boolean;
}

export type RunStatus = "todo" | "solved" | "failed" | "skipped";

export interface RunEntry {
  key: string;
  segments: Segment[];
  status: RunStatus;
  wrongAttempts: number;
  /** Epoch ms of the accept. */
  solvedAt?: number;
  /**
   * Engaged seconds at the moment of the accept. This — not wall clock — is
   * what gets compared against the cap and against Expert pace.
   */
  solvedAtSeconds?: number;
  /** The technique named before coding, on a sealed problem. */
  technique?: string;
  /** Whether that named technique turned out to be the right one. */
  techniqueRight?: boolean;
  note?: string;
}

export interface RunDoc {
  id: string;
  kind: "practice" | "contest";
  day: number;
  date: string;
  startedAt: number;
  finishedAt: number | null;
  /** Problem key currently on the clock; only ever one at a time. */
  activeKey: string | null;
  entries: Record<string, RunEntry>;
  /** Declared breaks, oldest first. The last one is open while resting. */
  breaks?: BreakSpan[];
  /**
   * Last time the running tab said it was alive. A tab that dies with a segment
   * open would otherwise leave it open forever and bill every hour since, so
   * `repairRun` trims dangling segments back to this instant.
   */
  heartbeat?: number;
  /** Free-text post-mortem, written at the end. */
  review?: string;
}

/** How long after the last heartbeat a dangling segment is assumed dead. */
export const HEARTBEAT_GRACE_MS = 60_000;

/**
 * Closes segments left open by a tab that never came back.
 *
 * Without this a laptop closed mid-problem reads as eight hours of engaged
 * effort the next morning, which would make the focus ratio a lie in exactly
 * the direction that flatters.
 */
export function repairRun(run: RunDoc, now = Date.now()): RunDoc {
  const deadline = Math.min(now, (run.heartbeat ?? run.startedAt) + HEARTBEAT_GRACE_MS);
  let touched = false;
  const entries: Record<string, RunEntry> = {};

  for (const [key, entry] of Object.entries(run.entries)) {
    const segments = entry.segments.map((s) => {
      if (s.to !== null) return s;
      touched = true;
      return { from: s.from, to: Math.max(s.from, deadline) };
    });
    entries[key] = touched ? { ...entry, segments } : entry;
  }

  if (!touched) return run;
  return { ...run, entries, activeKey: null };
}

export interface ArenaDataDoc {
  runs: Record<string, RunDoc>;
  savedAt?: string | null;
}

export function runId(kind: "practice" | "contest", day: number): string {
  return `${kind}-${day}`;
}

export function emptyEntry(key: string): RunEntry {
  return { key, segments: [], status: "todo", wrongAttempts: 0 };
}

export function emptyRun(
  kind: "practice" | "contest",
  day: CoachDay,
): RunDoc {
  return {
    id: runId(kind, day.day),
    kind,
    day: day.day,
    date: day.date,
    startedAt: Date.now(),
    finishedAt: null,
    activeKey: null,
    entries: {},
  };
}

/* ----------------------------------------------------------------- time --- */

/** Engaged seconds on one problem. An open segment is counted up to `now`. */
export function activeSeconds(entry: RunEntry | undefined, now: number): number {
  if (!entry) return 0;
  let total = 0;
  for (const s of entry.segments) {
    total += ((s.to ?? now) - s.from) / 1000;
  }
  return Math.max(0, Math.floor(total));
}

/** Engaged seconds across every problem in the run. */
export function totalActiveSeconds(run: RunDoc, now: number): number {
  return Object.values(run.entries).reduce(
    (sum, e) => sum + activeSeconds(e, now),
    0,
  );
}

/** True while a declared break is open. */
export function isOnBreak(run: RunDoc): boolean {
  const last = run.breaks?.[run.breaks.length - 1];
  return !!last && last.to === null;
}

/** Total declared break time. An open break is counted up to `now`. */
export function breakSeconds(run: RunDoc, now: number): number {
  const end = run.finishedAt ?? now;
  return Math.max(
    0,
    Math.floor(
      (run.breaks ?? []).reduce(
        (sum, b) => sum + (Math.min(b.to ?? end, end) - b.from) / 1000,
        0,
      ),
    ),
  );
}

/** Wall time since the session opened, with declared breaks removed. */
export function availableSeconds(run: RunDoc, now: number): number {
  const wall = ((run.finishedAt ?? now) - run.startedAt) / 1000;
  return Math.max(1, wall - breakSeconds(run, now));
}

/**
 * Engaged time as a share of the time you were actually at the desk.
 *
 * This is the number that answers "am I working or is the tab just open?". A
 * four-hour sitting at 45% is 108 minutes of work and 132 minutes of
 * self-deception, and it should read that way — but only time you did not
 * declare as a break counts against you.
 */
export function focusRatio(run: RunDoc, now: number): number {
  return Math.min(1, totalActiveSeconds(run, now) / availableSeconds(run, now));
}

export function isOverCap(problem: CoachProblem, seconds: number): boolean {
  return seconds > problem.capMinutes * 60;
}

/** Seconds left before the cap bites; negative once it has. */
export function capRemaining(problem: CoachProblem, seconds: number): number {
  return problem.capMinutes * 60 - seconds;
}

/* --------------------------------------------------------------- scoring --- */

/**
 * Codeforces' own decay: a problem loses value linearly across the round, down
 * to 30% of its maximum, and every rejected attempt costs a flat 50.
 *
 * The floor applies to the *time* decay only — wrong-submission penalties are
 * subtracted afterwards and can push a problem below 30%, which is exactly why
 * a spray of guesses is more expensive than one careful late submission.
 */
export const DECAY_FLOOR = 0.3;
export const WRONG_SUBMISSION_PENALTY = 50;

export function decayedPoints(
  maxPoints: number,
  elapsedSeconds: number,
  durationSeconds: number,
  wrongAttempts = 0,
): number {
  const share = Math.min(1, Math.max(0, elapsedSeconds / durationSeconds));
  const decayed = maxPoints - maxPoints * (1 - DECAY_FLOOR) * share;
  const floored = Math.max(maxPoints * DECAY_FLOOR, decayed);
  return Math.max(0, Math.round(floored - wrongAttempts * WRONG_SUBMISSION_PENALTY));
}

export interface ContestBoard {
  solved: number;
  total: number;
  points: number;
  /** What the same solves would have been worth at minute zero. */
  maxPoints: number;
  lostToTime: number;
  lostToWrong: number;
  wrongAttempts: number;
}

/**
 * The scoreboard. Elapsed time comes from the contest clock rather than from
 * per-problem engaged time: a real round charges you for the minutes you spent
 * staring at a different problem too.
 */
export function contestBoard(
  contest: CoachContest,
  run: RunDoc | undefined,
  elapsedSeconds: number,
): ContestBoard {
  const duration = contest.minutes * 60;
  let solved = 0;
  let points = 0;
  let maxPoints = 0;
  let lostToWrong = 0;
  let wrongAttempts = 0;

  for (const p of contest.problems) {
    const entry = run?.entries[p.key];
    wrongAttempts += entry?.wrongAttempts ?? 0;
    if (entry?.status !== "solved") continue;

    solved++;
    maxPoints += p.points;
    const at = entry.solvedAtSeconds ?? elapsedSeconds;
    const clean = decayedPoints(p.points, at, duration, 0);
    const actual = decayedPoints(p.points, at, duration, entry.wrongAttempts);
    points += actual;
    lostToWrong += clean - actual;
  }

  return {
    solved,
    total: contest.problems.length,
    points,
    maxPoints,
    lostToTime: Math.max(0, maxPoints - points - lostToWrong),
    lostToWrong,
    wrongAttempts,
  };
}

/** Live value of an unsolved problem right now — the decay you can watch. */
export function liveValue(
  problem: CoachContestProblem,
  contest: CoachContest,
  elapsedSeconds: number,
  wrongAttempts: number,
): number {
  return decayedPoints(
    problem.points,
    elapsedSeconds,
    contest.minutes * 60,
    wrongAttempts,
  );
}

/* -------------------------------------------------------------- analysis --- */

export interface ProblemVerdictLine {
  problem: CoachProblem;
  seconds: number;
  status: RunStatus;
  wrongAttempts: number;
  overCap: boolean;
  technique?: string;
  techniqueRight?: boolean;
}

export interface RunAnalysis {
  day: number;
  date: string;
  kind: "practice" | "contest";
  solved: number;
  total: number;
  engagedMinutes: number;
  wallMinutes: number;
  breakMinutes: number;
  breakCount: number;
  focus: number;
  overCap: number;
  wrongAttempts: number;
  /** Sealed problems where the named technique was wrong. */
  discriminationErrors: number;
  discriminationAttempts: number;
  lines: ProblemVerdictLine[];
}

export function problemsOf(day: CoachDay, kind: "practice" | "contest"): CoachProblem[] {
  if (kind === "contest") return day.contest?.problems ?? [];
  return (day.practice?.blocks ?? []).flatMap((b) => b.problems);
}

/**
 * Turns a finished run into the numbers the next morning's plan is built from.
 * Kept here rather than in the report script so the app can show the user the
 * same figures the coach will read.
 */
export function analyseRun(
  day: CoachDay,
  kind: "practice" | "contest",
  run: RunDoc | undefined,
  now = Date.now(),
): RunAnalysis {
  const problems = problemsOf(day, kind);
  const lines: ProblemVerdictLine[] = problems.map((problem) => {
    const entry = run?.entries[problem.key];
    const seconds = activeSeconds(entry, now);
    return {
      problem,
      seconds,
      status: entry?.status ?? "todo",
      wrongAttempts: entry?.wrongAttempts ?? 0,
      overCap: isOverCap(problem, seconds),
      technique: entry?.technique,
      techniqueRight: entry?.techniqueRight,
    };
  });

  const sealed = lines.filter((l) => l.problem.sealed && l.technique);
  const engaged = run ? totalActiveSeconds(run, now) : 0;
  const wall = run ? ((run.finishedAt ?? now) - run.startedAt) / 1000 : 0;

  return {
    day: day.day,
    date: day.date,
    kind,
    solved: lines.filter((l) => l.status === "solved").length,
    total: problems.length,
    engagedMinutes: Math.round(engaged / 60),
    wallMinutes: Math.round(wall / 60),
    breakMinutes: run ? Math.round(breakSeconds(run, now) / 60) : 0,
    breakCount: run?.breaks?.length ?? 0,
    focus: run ? focusRatio(run, now) : 0,
    overCap: lines.filter((l) => l.overCap).length,
    wrongAttempts: lines.reduce((s, l) => s + l.wrongAttempts, 0),
    discriminationErrors: sealed.filter((l) => l.techniqueRight === false).length,
    discriminationAttempts: sealed.length,
    lines,
  };
}

/** Today's entry, or the most recent one that is not in the future. */
export function dayFor(plan: CoachPlan | undefined, todayIso: string): CoachDay | null {
  if (!plan?.days?.length) return null;
  const exact = plan.days.find((d) => d.date === todayIso);
  if (exact) return exact;
  const past = plan.days.filter((d) => d.date <= todayIso);
  if (!past.length) return null;
  return past.reduce((a, b) => (a.date >= b.date ? a : b));
}
