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
 *   actually happened: which minute each problem went on the clock, how long it
 *   stayed there, and what the verdict was.
 *
 * The run is the evidence base for the next morning's coaching, and it measures
 * exactly one thing: time you put on a problem yourself. See `activeSeconds`.
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
 * One stretch of time on the clock. `to === null` means it is still running.
 *
 * Storing a pair of timestamps rather than a ticking integer is what makes the
 * clock survive everything: a reload, a closed tab, a second machine and a slept
 * laptop all resolve to the same elapsed time, because the elapsed time was
 * never being counted anywhere in the first place.
 */
export interface Segment {
  from: number;
  to: number | null;
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
   * Seconds on the clock at the moment of the accept. This — not wall clock —
   * is what gets compared against the cap and against Expert pace.
   */
  solvedAtSeconds?: number;
  /** The technique named before coding, on a sealed problem. */
  technique?: string;
  /** Whether that named technique turned out to be the right one. */
  techniqueRight?: boolean;
  note?: string;
}

/**
 * A session, and the per-problem clocks inside it.
 *
 * The session itself is not timed. Nothing here measures how long the tab was
 * open, how attentive you were, or what share of the morning was "engaged" —
 * those numbers were guesses dressed as measurements, and the machinery that
 * produced them could only ever be wrong in the browser's favour. What is left
 * is a stopwatch per problem, started and stopped by hand.
 *
 * A clock therefore runs until you stop it. Reloading, closing the tab, sleeping
 * the laptop and switching machines all leave it running, because an open
 * segment is a pair of timestamps rather than a ticking integer, and nothing
 * trims it after the fact.
 */
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
  /**
   * The problem a break was taken from, so coming back is one click. Breaks
   * carry no timestamps: the time inside one is simply not on any clock, which
   * is the whole of what a break means now.
   */
  restingKey?: string | null;
  /** Free-text post-mortem, written at the end. */
  review?: string;
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

/** Seconds on the clock for one problem. An open segment runs up to `now`. */
export function activeSeconds(entry: RunEntry | undefined, now: number): number {
  if (!entry) return 0;
  let total = 0;
  for (const s of entry.segments) {
    total += ((s.to ?? now) - s.from) / 1000;
  }
  return Math.max(0, Math.floor(total));
}

/** Seconds on the clock across every problem in the run. */
export function totalActiveSeconds(run: RunDoc, now: number): number {
  return Object.values(run.entries).reduce(
    (sum, e) => sum + activeSeconds(e, now),
    0,
  );
}

export function isOverCap(problem: CoachProblem, seconds: number): boolean {
  return seconds > problem.capMinutes * 60;
}

/** Seconds left before the cap bites; negative once it has. */
export function capRemaining(problem: CoachProblem, seconds: number): number {
  return problem.capMinutes * 60 - seconds;
}

/* --------------------------------------------------------------- phases --- */

export type PhaseId = "trying" | "hints" | "tutorial";

export interface Phase {
  id: PhaseId;
  label: string;
  /** What you are allowed to open during this phase. */
  rule: string;
  /** Notification title when this phase begins. */
  announce: string;
  seconds: number;
  /** CSS custom property, so the ring and the row agree without a lookup. */
  color: string;
}

/**
 * The three phases of one attempt, derived from the problem's cap.
 *
 * The cap is how long the problem is yours alone. Past it the question stops
 * being "can I solve this" and becomes "how fast can I learn it", and the
 * answer to that is not more staring — so a third of the cap buys hints, and
 * whatever is left of a second cap is the editorial re-implementation. Every
 * attempt is therefore over at twice the cap, whatever state the code is in.
 *
 * A 30-minute problem is 30 trying, 10 on hints, 20 with the tutorial; a
 * 15-minute one is 15 / 5 / 10. The arithmetic is in seconds so the ratio holds
 * for caps that do not divide by three.
 */
export function phasesFor(capMinutes: number): Phase[] {
  const cap = Math.max(1, Math.round(capMinutes * 60));
  const hints = Math.round(cap / 3);
  return [
    {
      id: "trying",
      label: "Trying",
      rule: "Yours alone — no tags, no hints, no editorial.",
      announce: "On the clock",
      seconds: cap,
      color: "var(--accent)",
    },
    {
      id: "hints",
      label: "Hints",
      rule: "Tags and one hint are open. Not the solution.",
      announce: "Hint time",
      seconds: hints,
      color: "var(--warning)",
    },
    {
      id: "tutorial",
      label: "Tutorial",
      rule: "Read the editorial once, close it, re-implement from scratch.",
      announce: "Editorial time",
      seconds: cap * 2 - cap - hints,
      color: "var(--negative)",
    },
  ];
}

export interface PhaseState {
  phases: Phase[];
  /** Index into `phases`, or -1 once the whole budget is spent. */
  index: number;
  phase: Phase | null;
  /** Seconds left in the current phase. */
  remaining: number;
  /** The whole attempt budget — always twice the cap. */
  total: number;
  over: boolean;
}

export function phaseAt(capMinutes: number, seconds: number): PhaseState {
  const phases = phasesFor(capMinutes);
  const total = phases.reduce((sum, p) => sum + p.seconds, 0);
  let start = 0;

  for (let i = 0; i < phases.length; i++) {
    const end = start + phases[i].seconds;
    if (seconds < end) {
      return {
        phases,
        index: i,
        phase: phases[i],
        remaining: Math.ceil(end - seconds),
        total,
        over: false,
      };
    }
    start = end;
  }

  return { phases, index: -1, phase: null, remaining: 0, total, over: true };
}

/* ---------------------------------------------------------------- alarms --- */

export type AlertKind = "warn" | "enter" | "spent";

export interface PhaseAlert {
  id: string;
  /** Seconds on the clock at which this fires. */
  at: number;
  kind: AlertKind;
  title: string;
  /** The instruction, shown beneath the problem's name. */
  detail: string;
}

/** Longest heads-up before a boundary, and the shortest one worth sending. */
const MAX_LEAD_SECONDS = 300;
const MIN_LEAD_SECONDS = 60;

/** "5 minutes" when it is round, "3m 20s" when the scaled lead is not. */
function leadPhrase(seconds: number): string {
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  const m = Math.floor(seconds / 60);
  return m > 0 ? `${m}m ${String(seconds % 60).padStart(2, "0")}s` : `${seconds}s`;
}

const ENDING: Record<PhaseId, { suffix: string; detail: string }> = {
  trying: {
    suffix: "left on your own attempt",
    detail: "Wrap up what you have — hints open at the cap.",
  },
  hints: {
    suffix: "left with hints",
    detail: "The editorial opens after this. Get the idea now.",
  },
  tutorial: {
    suffix: "left in the budget",
    detail: "Submit it or mark it — the attempt ends at twice the cap.",
  },
};

/**
 * When to interrupt during an attempt.
 *
 * A phase change is worth nothing if it happens silently in a tab you are not
 * looking at, so every boundary is announced — and every boundary gets a
 * heads-up first, because you cannot wrap up an attempt at the instant it ends.
 * The lead scales with the phase it ends: five minutes' notice inside a
 * five-minute phase is not a warning, it is the whole phase.
 */
export function alertsFor(capMinutes: number): PhaseAlert[] {
  const phases = phasesFor(capMinutes);
  const alerts: PhaseAlert[] = [];
  let start = 0;

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const end = start + phase.seconds;
    const lead = Math.min(MAX_LEAD_SECONDS, Math.floor(phase.seconds / 3));

    // Entering the first phase is the Start button; you already know.
    if (i > 0) {
      alerts.push({
        id: `${phase.id}-enter`,
        at: start,
        kind: "enter",
        title: phase.announce,
        detail: phase.rule,
      });
    }

    if (lead >= MIN_LEAD_SECONDS) {
      alerts.push({
        id: `${phase.id}-warn`,
        at: end - lead,
        kind: "warn",
        title: `${leadPhrase(lead)} ${ENDING[phase.id].suffix}`,
        detail: ENDING[phase.id].detail,
      });
    }

    start = end;
  }

  alerts.push({
    id: "spent",
    at: start,
    kind: "spent",
    title: "Budget spent",
    detail: "Twice the cap is gone. Mark it however it stands and move on.",
  });

  return alerts.sort((a, b) => a.at - b.at);
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
  /** Sum of the per-problem clocks. Nothing measures the session itself. */
  clockedMinutes: number;
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

  return {
    day: day.day,
    date: day.date,
    kind,
    solved: lines.filter((l) => l.status === "solved").length,
    total: problems.length,
    clockedMinutes: run ? Math.round(totalActiveSeconds(run, now) / 60) : 0,
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
