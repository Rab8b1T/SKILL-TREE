"use client";

import { ArrowRight, Bell, Check, Pause, Play, SkipForward, Volume2, VolumeX } from "lucide-react";
import type { BlockId, ProgramAction, ProgramView } from "@/lib/program";
import type { ProgramTiming } from "@/lib/program-timing";
import { useProgramAlerts } from "@/lib/use-program-alerts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";

export function duration(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 3600).toString().padStart(2, "0")}:${Math.floor(seconds / 60 % 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

const allProblems = (data: ProgramView) => [
  ...data.day.contest.problems.map(p => p && ({...p, block: "contest"})),
  ...data.day.review.problems.map(p => p && ({...p, block: "review"})),
  ...data.day.core.problems.map(p => p && ({...p, block: "core"})),
  ...data.day.leetcode.problems.map(p => p && ({...p, block: "leetcode"})),
];

export function ProgramAlerts({data, timing, account, now}: {data: ProgramView; timing: ProgramTiming | null; account: string; now: number}) {
  const names: Record<string, string> = Object.fromEntries(data.blocks.map(b => [b.id, b.label]));
  for (const problem of allProblems(data)) if (problem) names[`${problem.block}:${problem.key}`] = problem.name;
  const notices = timing?.notices.filter(notice => {
    if (notice.kind === "accepted") return true;
    if (timing.currentBlock !== notice.block) return false;
    const phase = timing.phases[notice.block];
    return notice.kind === "phase-expired" ? phase.status === "expired" : phase.activeKey === notice.key && phase.problems.some(p => p.key === notice.key && p.status === "expired");
  }) ?? [];
  const alerts = useProgramAlerts(data.run ? `${account}.${data.run.sessionId}` : "", notices, names, now);
  return <Card className="mb-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><CardTitle>Timer and acceptance alerts</CardTitle><p className="mt-1 text-sm text-muted">A sound for verified accepts and finished timers. Enable alerts before opening a problem.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void alerts.toggleSound()}>{alerts.sound && alerts.audioReady ? <VolumeX/> : <Volume2/>}{alerts.sound && alerts.audioReady ? "Mute sound" : "Enable sound"}</Button>
        <Button size="sm" onClick={() => void alerts.test()}>Test alert</Button>
        {alerts.permission === "default" && <Button size="sm" onClick={() => void alerts.requestNotifications()}><Bell/>Enable desktop alerts</Button>}
        {alerts.permission === "granted" && <Badge variant="positive">Desktop alerts enabled</Badge>}
      </div>
    </div>
    <p className="mt-3 text-xs text-muted">Keep this page open for alerts. A closed tab or a disconnected device cannot guarantee a sound; missed deadlines appear when you return. The saved timers continue unless you pause them.</p>
    {alerts.permission === "denied" && <p className="mt-2 text-xs text-warning">Desktop alerts are blocked. Allow notifications in this site’s browser settings to receive them while another tab is open.</p>}
    {alerts.permission === "unsupported" && <p className="mt-2 text-xs text-muted">This browser supports on-page alerts only.</p>}
  </Card>;
}

export function SessionControls({data, timing, save, busy, offline, draftScope, onSelect}: {
  data: ProgramView;
  timing: ProgramTiming;
  save: (action: ProgramAction) => Promise<void>;
  busy: boolean;
  offline: boolean;
  draftScope: string;
  onSelect: (block: BlockId) => void;
}) {
  const current = timing.currentBlock, phases = Object.values(timing.phases);
  const used = phases.reduce((n, p) => n + p.elapsedMs, 0);
  const remaining = phases.reduce((n, p) => n + (p.status === "completed" ? 0 : Math.max(0, p.budgetMs - p.elapsedMs)), 0);
  const guided = phases.flatMap(p => p.problems).reduce((n, p) => n + p.guidedElapsedMs, 0);
  const breaks = phases.reduce((n, p) => n + p.pausedMs, 0);
  const phase = current ? timing.phases[current] : null;
  const active = phase?.problems.find(p => p.key === phase.activeKey);
  const problem = allProblems(data).find(p => p && p.block === current && p.key === active?.key);
  const accepted = current && active ? data.run?.attempts[`${current}:${active.key}`]?.verification === "verified" : false;
  const index = data.blocks.findIndex(b => b.id === current), next = data.blocks[index + 1];
  const guidedRunning = active?.status === "guided" && active.guidedSince !== undefined;
  const running = phase?.status === "running" || guidedRunning;
  const problemExpired = active?.status === "expired";
  const phaseExpired = phase?.status === "expired";
  const canResolve = active && !["completed", "incomplete", "queued"].includes(active.status);
  const invoke = (action: ProgramAction) => { void save(action).catch(() => {}); };
  const note = () => {
    const saved = data.run?.attempts[`${current}:${active?.key}`]?.note ?? "";
    try { return localStorage.getItem(`${draftScope}.${current}.${active?.key}.note`) ?? localStorage.getItem(`st.program.${data.program.programId}.${data.day.programDay}.${current}.${active?.key}.note`) ?? saved; } catch { return saved; }
  };
  const status = !phase ? "Day complete" : guidedRunning ? "Guided work · practice paused" : active?.status === "guided" ? "Guided work paused" : phaseExpired ? "Time finished · waiting for you" : problemExpired ? "Problem time finished · practice paused" : phase.status === "ready" ? "Ready when you are" : phase.pauseReason === "queue-complete" ? "Problem queue complete · practice paused" : phase.status === "running" ? "On the clock" : "Paused";

  return <Card className="mb-5 border-accent/35" data-testid="session-controls">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><SectionLabel>{current ? data.blocks[index].label : "Session complete"}</SectionLabel><p className="mt-2 font-mono text-4xl tabular-nums text-ink" aria-label="Phase time remaining">{duration(phase ? phase.budgetMs - phase.elapsedMs : 0)}</p><p className="mt-2 text-sm font-medium text-accent" role="status">{status}</p></div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm"><div><p className="text-faint">Practice used</p><p className="font-mono tabular-nums">{duration(used)} / {data.totalMinutes}m</p></div><div><p className="text-faint">Remaining planned</p><p className="font-mono tabular-nums">{duration(remaining)}</p></div><div><p className="text-faint">Extra guided time</p><p className="font-mono tabular-nums">{duration(guided)}</p></div><div><p className="text-faint">Paused / break time</p><p className="font-mono tabular-nums">{duration(breaks)}</p></div></div>
    </div>

    {current && phase && <>
      <div className="mt-5 flex flex-wrap gap-2">
        {running ? <Button disabled={busy || offline} onClick={() => invoke({type: "phase-pause", block: current})}><Pause/>{guidedRunning ? "Pause guided timer" : "Pause phase"}</Button>
          : <Button variant="accent" disabled={busy || offline || problemExpired || (phaseExpired && active?.status !== "guided")} onClick={() => invoke({type: "phase-start", block: current})}><Play/>{active?.status === "guided" ? "Resume guided timer" : phase.status === "ready" ? "Start phase" : "Resume phase"}</Button>}
        <Button className="h-auto min-h-10 max-w-full whitespace-normal py-2" variant="accent" disabled={busy || offline} onClick={() => invoke({type: "phase-next", block: current})}>{next ? `Next: ${next.label}` : "Finish day"}<ArrowRight/></Button>
        <Button variant="ghost" onClick={() => onSelect(current)}>Show current phase</Button>
      </div>
      <p className="mt-3 text-xs text-muted">You choose when to move to the next phase. It opens ready to start. Any unfinished attempts are saved as incomplete. {current === "contest" ? "Leaving the contest ends it permanently; later submissions count as review work." : "Unused time in a finished phase is not added to the next phase."}</p>
      {current === "leetcode" && phase.status !== "running" && <div className="mt-4 rounded-xl border border-line p-3"><p className="text-sm text-muted">{data.run?.lessonEvidence&&!data.run.lessonEvidence.recallPassed&&data.run.recallFeedback?data.run.recallFeedback.message:"If a prerequisite check blocks Start, return to the core lesson, repair and save your recall, then come back here."}</p><Button className="mt-2" size="sm" onClick={() => onSelect("core")}>Return to core lesson</Button></div>}

      {active && problem && <div className="mt-5 rounded-xl border border-line bg-sunken p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><SectionLabel>{active.status === "guided" ? "Guided work · outside your practice budget" : "Current problem"}</SectionLabel><p className="mt-2 font-semibold text-ink">{problem.name}</p><p className="mt-1 text-xs text-muted">Allocated {Math.round(active.capMs / 6000) / 10}m · {duration(active.elapsedMs)} practice used{accepted ? " · AC verified" : ""}</p></div><p className="font-mono text-2xl tabular-nums text-ink">{duration(active.status === "guided" ? active.guidedElapsedMs : active.capMs - active.elapsedMs)}</p></div>
        {(problemExpired || phaseExpired) && active.status !== "guided" && <div className="mt-4 space-y-3" role="alert"><p className="text-sm font-medium text-warning">{problemExpired ? "This problem’s attempt time has finished." : "This phase’s practice time has finished."} Your practice clock is paused.</p><p className="text-sm text-muted">Move on with this attempt marked incomplete, or use a separate guided timer to learn from hints and the explanation.</p><div className="flex flex-wrap gap-2"><Button disabled={busy || offline} onClick={() => invoke({type: "problem-skip", block: current, key: active.key})}><SkipForward/>Mark incomplete &amp; move on</Button><Button variant="accent" disabled={busy || offline} onClick={() => invoke({type: "problem-help", block: current, key: active.key})}>{current === "contest" ? "End contest & continue with help" : "Continue with help"}<ArrowRight/></Button></div>{current === "contest" && <p className="text-xs text-warning">Help ends the contest permanently and opens guided review. Contest hints stay hidden until that choice is saved.</p>}</div>}
        {active.status === "guided" && <p className="mt-3 text-sm text-muted">Read the progressive hints below. This timer measures extra learning time; your practice budget stays paused. Finish guided work to continue the queue.</p>}
        {canResolve && !problemExpired && !phaseExpired && <div className="mt-4 flex flex-wrap gap-2"><Button variant="accent" disabled={busy || offline} onClick={() => invoke({type: "problem-complete", block: current, key: active.key, reported: active.status === "guided" ? "aided" : "solved", note: note()})}><Check/>{active.status === "guided" ? "Finish guided work & next problem" : "Mark complete & next problem"}</Button>{active.status !== "guided" && <Button disabled={busy || offline} onClick={() => invoke({type: "problem-skip", block: current, key: active.key})}><SkipForward/>Skip as incomplete</Button>}</div>}
        {active.status === "guided" && phaseExpired && <Button className="mt-4" variant="accent" disabled={busy || offline} onClick={() => invoke({type: "problem-complete", block: current, key: active.key, reported: "aided", note: note()})}><Check/>Finish guided work</Button>}
        {canResolve && !accepted && <p className="mt-2 text-xs text-muted">Marking complete records your report. Judge acceptance is checked separately.</p>}
      </div>}
      {phaseExpired && !active && <p className="mt-4 text-sm text-warning" role="alert">This phase’s time is finished. Choose {next ? "Next" : "Finish day"} when you are ready.</p>}
    </>}
    {!current && <p className="mt-4 text-sm text-muted">Every phase is closed. Your attempts, review and recall remain available below. Completion does not imply that every problem was solved.</p>}
    {offline && <p className="mt-4 text-sm text-warning" role="status">Connection unavailable. The last acknowledged timers keep their saved behavior. Reconnect before starting, pausing or moving ahead; your written drafts stay on this device.</p>}
  </Card>;
}
