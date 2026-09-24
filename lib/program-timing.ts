import type { BlockId, ProgramDay, ProgramRun } from "./program";

export const PHASE_ORDER: BlockId[] = ["contest", "review", "core", "leetcode"];
export type TimerInterval = { start: number; end: number };
export type ProblemClock = {
  key: string; optional?: boolean; capMs: number; elapsedMs: number; runningSince?: number;
  status: "queued" | "running" | "paused" | "expired" | "guided" | "incomplete" | "completed";
  guidedElapsedMs: number; guidedSince?: number; guidedIntervals?: TimerInterval[]; completedAt?: number;
};
export type PhaseClock = {
  status: "ready" | "running" | "paused" | "expired" | "completed";
  budgetMs: number; elapsedMs: number; runningSince?: number;
  startedAt?: number; finishedAt?: number;
  pauseReason?: "manual" | "problem-expired" | "guided" | "queue-complete";
  pausedMs: number; pausedSince?: number; blockedReason?: string;
  activeKey?: string; intervals: TimerInterval[]; problems: ProblemClock[];
};
export type TimingNotice = { id: string; kind: "phase-expired" | "problem-expired" | "accepted"; block: BlockId; key?: string; at: number };
export type ProgramTiming = { version: 1; currentBlock: BlockId | null; phases: Record<BlockId, PhaseClock>; notices: TimingNotice[]; migratedAt?: number };

/** Keep the tighter of the authored cap and the difficulty target, then scale
 * the queue to fit its available practice budget (core lesson time is reserved). */
export function problemCaps(day: ProgramDay, block: BlockId): { key: string; capMs: number }[] {
  const entries = block === "leetcode" ? day.leetcode.problems.map(p => ({ key: p.slug, cap: p.capMinutes, weight: p.difficulty === "Hard" ? 40 : p.difficulty === "Medium" ? 30 : 15 }))
    : (block === "core" ? day.core.practice.blocks.flatMap(b => b.problems) : day.contest.problems).map(p => ({ key: p.key, cap: p.capMinutes, weight: p.rating <= 800 ? 10 : p.rating <= 1000 ? 15 : p.rating <= 1200 ? 20 : p.rating <= 1400 ? 30 : p.rating <= 1600 ? 40 : p.rating <= 1800 ? 50 : 60 }));
  const available = (block === "core" ? day.core.practice.blocks.reduce((n, b) => n + b.minutes, 0) : day[block].minutes) * 60000;
  const desired = entries.map(p => Math.max(1, Math.min(p.cap || p.weight, p.weight)) * 60000);
  const total = desired.reduce((a, b) => a + b, 0), scale = total > available ? available / total : 1;
  return entries.map((p, i) => ({ key: p.key, capMs: Math.max(1, Math.floor(desired[i] * scale)) }));
}
export function timingForDay(day: ProgramDay): ProgramTiming {
  const phases = {} as ProgramTiming["phases"];
  for (const block of PHASE_ORDER) phases[block] = {
    status: "ready", budgetMs: day[block].minutes * 60000, elapsedMs: 0, pausedMs: 0, intervals: [],
    problems: problemCaps(day, block).map(p => ({ ...p, elapsedMs: 0, guidedElapsedMs: 0, status: "queued" })),
  };
  return { version: 1, currentBlock: "contest", phases, notices: [] };
}
function interval(phase: PhaseClock, start: number, end: number) {
  if (end <= start) return;
  const previous = phase.intervals.at(-1);
  if (previous?.end === start) previous.end = end;
  else phase.intervals.push({ start, end });
}
export function addTimingNotice(timing: ProgramTiming, notice: Omit<TimingNotice, "id">) {
  const id = `${notice.kind}:${notice.block}:${notice.key ?? "phase"}:${notice.at}`;
  if (!timing.notices.some(n => n.id === id)) timing.notices.push({ ...notice, id });
}
/** The saved anchor, not a browser interval, decides when time expires. Calling
 * this tomorrow produces the same deadline and consumed budget as calling at it. */
export function projectTiming(original: ProgramTiming, now: number): ProgramTiming {
  const timing = structuredClone(original);
  for (const block of PHASE_ORDER) {
    const phase = timing.phases[block], problem = phase.problems.find(p => p.key === phase.activeKey);
    if (phase.pausedSince !== undefined) {
      phase.pausedMs += Math.max(0, now - phase.pausedSince); phase.pausedSince = now;
    }
    if (problem?.guidedSince !== undefined) {
      const start = problem.guidedSince;
      problem.guidedElapsedMs += Math.max(0, now - start);
      problem.guidedIntervals ??= [];
      const last = problem.guidedIntervals.at(-1);
      if (now > start) { if (last?.end === start) last.end = now; else problem.guidedIntervals.push({ start, end: now }); }
      problem.guidedSince = now;
    }
    if (phase.status !== "running" || phase.runningSince === undefined) continue;
    const phaseDeadline = phase.runningSince + Math.max(0, phase.budgetMs - phase.elapsedMs);
    const problemDeadline = problem?.status === "running" && problem.runningSince !== undefined
      ? problem.runningSince + Math.max(0, problem.capMs - problem.elapsedMs) : Infinity;
    const end = Math.max(phase.runningSince, Math.min(now, phaseDeadline, problemDeadline));
    phase.elapsedMs = Math.min(phase.budgetMs, phase.elapsedMs + end - phase.runningSince);
    interval(phase, phase.runningSince, end); phase.runningSince = end;
    if (problem?.status === "running" && problem.runningSince !== undefined) {
      problem.elapsedMs = Math.min(problem.capMs, problem.elapsedMs + Math.max(0, end - problem.runningSince)); problem.runningSince = end;
    }
    if (now < Math.min(phaseDeadline, problemDeadline)) continue;
    delete phase.runningSince;
    if (problem?.status === "running") { delete problem.runningSince; problem.status = "paused"; }
    if (phaseDeadline <= problemDeadline) {
      phase.status = "expired"; phase.pausedSince = phaseDeadline;
      addTimingNotice(timing, { kind: "phase-expired", block, at: phaseDeadline });
    } else {
      phase.status = "paused"; phase.pauseReason = "problem-expired"; phase.pausedSince = problemDeadline;
    }
    if (problem && problemDeadline <= phaseDeadline) {
      problem.status = "expired";
      addTimingNotice(timing, { kind: "problem-expired", block, key: problem.key, at: problemDeadline });
    }
    // Time after a deadline is a visible break, never consumed work time.
    if (phase.pausedSince !== undefined) {
      phase.pausedMs += Math.max(0, now - phase.pausedSince); phase.pausedSince = now;
    }
  }
  return timing;
}
export function pausePhase(timing: ProgramTiming, block: BlockId, now: number, reason: PhaseClock["pauseReason"] = "manual") {
  const phase = timing.phases[block];
  delete phase.runningSince;
  const problem = phase.problems.find(p => p.key === phase.activeKey);
  if (problem?.status === "running") { problem.status = "paused"; delete problem.runningSince; }
  if (problem?.guidedSince !== undefined) delete problem.guidedSince;
  if (phase.status !== "expired" && phase.status !== "completed") phase.status = "paused";
  phase.pauseReason = reason;
  if (reason !== "guided") phase.pausedSince ??= now;
  else delete phase.pausedSince;
}
export function startPhase(timing: ProgramTiming, block: BlockId, now: number) {
  if (timing.currentBlock !== block) throw new Error("Open the current phase before starting its timer.");
  const phase = timing.phases[block], problem = phase.problems.find(p => p.key === phase.activeKey);
  if (phase.status === "completed") throw new Error("This phase is already complete.");
  if (problem?.status === "guided") {
    problem.guidedSince ??= now; phase.pauseReason = "guided"; delete phase.pausedSince; return;
  }
  if (phase.elapsedMs >= phase.budgetMs) throw new Error("This phase's time is finished. Choose Next phase when ready.");
  if (problem?.status === "expired") throw new Error("Choose Skip or Continue with help for the expired problem first.");
  phase.status = "running"; phase.startedAt ??= now; phase.runningSince ??= now;
  delete phase.pauseReason; delete phase.pausedSince; delete phase.blockedReason;
  if (problem?.status === "paused") { problem.status = "running"; problem.runningSince = now; }
}
export function startProblem(timing: ProgramTiming, block: BlockId, key: string, now: number) {
  const phase = timing.phases[block], problem = phase.problems.find(p => p.key === key);
  if (!problem) throw new Error("This problem is not in the phase queue.");
  if (timing.currentBlock !== block) throw new Error("This is not the current phase.");
  const previous = phase.problems.find(p => p.key === phase.activeKey);
  if (previous?.status === "expired") throw new Error("Resolve the expired problem before moving on.");
  if (previous?.status === "guided" && previous.key !== key) throw new Error("Finish or skip the guided problem before moving on.");
  if (["completed", "incomplete"].includes(problem.status)) throw new Error("This attempt is already closed. Its result is saved.");
  if (previous?.status === "running" && previous.key !== key) { previous.status = "paused"; delete previous.runningSince; }
  phase.activeKey = key; startPhase(timing, block, now);
  if (problem.status !== "guided") { problem.status = "running"; problem.runningSince = now; }
}
export function nextQueuedProblem(timing: ProgramTiming, block: BlockId, now: number): string | undefined {
  const phase = timing.phases[block]; delete phase.activeKey;
  const next = phase.problems.find(p => !p.optional && (p.status === "queued" || p.status === "paused"));
  if (phase.elapsedMs >= phase.budgetMs) { phase.status = "expired"; delete phase.runningSince; return; }
  if (next) { startProblem(timing, block, next.key, now); return next.key; }
  pausePhase(timing, block, now, "queue-complete");
}
export function finishPhase(timing: ProgramTiming, block: BlockId, now: number) {
  if (timing.currentBlock !== block) throw new Error("Only the current phase can move to the next stage.");
  const phase = timing.phases[block]; pausePhase(timing, block, now);
  phase.status = "completed"; phase.finishedAt = now; delete phase.pausedSince;
  for (const problem of phase.problems) {
    delete problem.runningSince; delete problem.guidedSince;
    if (!["completed", "incomplete"].includes(problem.status)) problem.status = "incomplete";
  }
  delete phase.activeKey;
  timing.currentBlock = PHASE_ORDER[PHASE_ORDER.indexOf(block) + 1] ?? null;
  if(timing.currentBlock)timing.phases[timing.currentBlock].pausedSince=now;
}
/** An old wall-clock plan is not proof that unseen lessons were completed. Keep
 * its original windows as history and resume at the last actually engaged phase. */
export function ensureTiming(original: ProgramRun, now: number): ProgramRun {
  const run = structuredClone(original);
  if (run.timing) { run.timing = projectTiming(run.timing, now); return run; }
  const timing = timingForDay(run.snapshot); timing.migratedAt = now;
  let current: BlockId = "contest";
  if (run.contestCompletion || run.review || Object.values(run.attempts).some(a => a.block === "review")) current = "review";
  if (run.lessonEvidence || Object.values(run.attempts).some(a => a.block === "core")) current = "core";
  if (Object.values(run.attempts).some(a => a.block === "leetcode")) current = "leetcode";
  timing.currentBlock = current;
  for (const problem of timing.phases.review.problems) if (run.attempts[`contest:${problem.key}`]?.verification === "verified") problem.optional = true;
  for (const block of PHASE_ORDER) {
    const phase = timing.phases[block], index = PHASE_ORDER.indexOf(block), currentIndex = PHASE_ORDER.indexOf(current);
    if (index > currentIndex) continue;
    const old = run.blocks[block];
    const evidence = [old.startedAt, ...Object.values(run.attempts).filter(a => a.block === block).flatMap(a => [a.startedAt, a.finishedAt ?? a.startedAt, a.solvedAt ?? a.startedAt]), ...(block === "review" && run.review ? [run.review.submittedAt] : []), ...(block === "core" && run.lessonEvidence ? [run.lessonEvidence.submittedAt] : [])];
    const end = Math.max(old.startedAt, Math.min(old.endsAt, index < currentIndex ? block === "contest" ? run.contestCompletion?.finishedAt ?? old.endsAt : old.endsAt : block === "contest" ? now : Math.max(...evidence)));
    phase.startedAt = old.startedAt; phase.elapsedMs = Math.min(phase.budgetMs, end - old.startedAt); interval(phase, old.startedAt, end);
    phase.status = index < currentIndex ? "completed" : phase.elapsedMs >= phase.budgetMs ? "expired" : "paused";
    if (index < currentIndex) phase.finishedAt = end;
    else { phase.pauseReason = "manual"; phase.pausedSince = now; }
    for (const problem of phase.problems) {
      const a = run.attempts[`${block}:${problem.key}`]; if (!a) continue;
      problem.elapsedMs = Math.min(problem.capMs, Math.max(0, (a.finishedAt ?? a.solvedAt ?? end) - a.startedAt));
      problem.status = a.verification === "verified" || a.reported === "solved" || a.reported === "aided" ? "completed" : a.reported === "incomplete" || index < currentIndex ? "incomplete" : problem.elapsedMs >= problem.capMs ? "expired" : "paused";
      if (problem.status === "completed") problem.completedAt = a.finishedAt ?? a.solvedAt ?? end;
      if (index === currentIndex && ["paused", "expired"].includes(problem.status) && !phase.activeKey) phase.activeKey = problem.key;
    }
  }
  run.timing = timing; return run;
}
export function activeElapsedAt(phase: PhaseClock, at: number): number {
  return phase.intervals.reduce((sum, i) => sum + Math.max(0, Math.min(at, i.end) - i.start), 0) + (phase.runningSince === undefined ? 0 : Math.max(0, at - phase.runningSince));
}
export function duringActivePhase(run: ProgramRun, block: BlockId, at: number, now: number): boolean {
  if (!run.timing) return at >= run.blocks[block].startedAt && at < Math.min(now, run.blocks[block].endsAt);
  const phase = projectTiming(run.timing, now).phases[block];
  return phase.intervals.some(i => at >= i.start && at < i.end) || phase.runningSince !== undefined && at >= phase.runningSince && at < now;
}

export function duringProblemWork(run: ProgramRun, block: BlockId, key: string, at: number, now: number): boolean {
  if (duringActivePhase(run, block, at, now)) return true;
  if (block === "contest" || !run.timing) return false;
  const problem = projectTiming(run.timing, now).phases[block].problems.find(p => p.key === key);
  return Boolean(problem?.guidedIntervals?.some(i => at >= i.start && at < i.end) || problem?.guidedSince !== undefined && at >= problem.guidedSince && at < now);
}
