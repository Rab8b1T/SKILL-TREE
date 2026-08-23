"use client";

import { useMemo, useState } from "react";
import {
  AlarmClock,
  BellOff,
  BellRing,
  Check,
  ChevronRight,
  Coffee,
  Eye,
  Flag,
  Play,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { problemUrl, ratingColor } from "@/lib/cf";
import {
  activeSeconds,
  alertsFor,
  phaseAt,
  totalActiveSeconds,
  type CoachBlock,
  type CoachDay,
  type CoachProblem,
  type RunDoc,
} from "@/lib/coach";
import type { RunController } from "@/lib/use-run";
import { cn, formatClock, formatDuration } from "@/lib/utils";
import { useNow } from "@/lib/use-now";
import { usePhaseAlerts, type Alarm } from "@/lib/use-phase-alerts";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhaseRing, Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

export function PracticeRunner({
  day,
  ctl,
}: {
  day: CoachDay;
  ctl: RunController;
}) {
  const now = useNow(1000);
  const run = ctl.run;
  const blocks = day.practice?.blocks ?? [];

  const alarms = useMemo(() => buildAlarms(run, day), [run, day]);
  const alerts = usePhaseAlerts(alarms);

  if (!run) {
    return <StartCard day={day} onStart={ctl.begin} />;
  }

  const t = now ?? run.startedAt;
  const done = run.finishedAt != null;

  const all = blocks.flatMap((b) => b.problems);
  const solved = all.filter((p) => run.entries[p.key]?.status === "solved").length;
  const overCap = all.filter(
    (p) => activeSeconds(run.entries[p.key], t) > p.capMinutes * 60,
  ).length;
  const clocked = totalActiveSeconds(run, t);

  const active = all.find((p) => p.key === run.activeKey) ?? null;
  const resting = ctl.restingKey
    ? (all.find((p) => p.key === ctl.restingKey) ?? null)
    : null;

  return (
    <div className="space-y-4">
      {active && !done && (
        <OnTheClock
          problem={active}
          seconds={activeSeconds(run.entries[active.key], t)}
          ctl={ctl}
        />
      )}

      {!active && resting && !done && (
        <Card className="flex flex-wrap items-center gap-3 border-line-strong bg-elevated">
          <Coffee className="size-4 shrink-0 text-muted" />
          <div className="grow">
            <p className="text-[13px] font-medium text-ink">
              On a break — {resting.name} is stopped at{" "}
              {formatClock(activeSeconds(run.entries[resting.key], t))}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              Nothing is being timed. Take as long as you need; the break itself
              is not recorded anywhere.
            </p>
          </div>
          <Button variant="accent" onClick={() => ctl.startProblem(resting.key)}>
            <Play />
            Back to work
          </Button>
        </Card>
      )}

      {!done && alerts.permission === "default" && (
        <Card className="flex flex-wrap items-center gap-3 border-info/30 bg-info/5">
          <BellRing className="size-4 shrink-0 text-info" />
          <div className="min-w-0 grow">
            <p className="text-[13px] font-medium text-ink">
              Let the phases interrupt you
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              This tab is hidden for most of a session, so the ring changes
              colour where you cannot see it. Allow notifications and you get a
              heads-up before each boundary, then hint time, editorial time and
              the end of the budget — on time, with the tab in the background.
            </p>
          </div>
          <Button variant="accent" onClick={alerts.request}>
            <BellRing />
            Allow
          </Button>
        </Card>
      )}

      {!done && alerts.permission === "denied" && (
        <Card className="flex flex-wrap items-center gap-3 border-line-strong bg-elevated">
          <BellOff className="size-4 shrink-0 text-muted" />
          <p className="min-w-0 grow text-[12px] text-muted">
            Notifications are blocked for this site, so every phase change will
            pass in silence. Re-allow them in Chrome&rsquo;s site settings, and
            check System Settings → Notifications → Chrome as well: macOS
            swallows them without a word when Chrome is not enabled there.
          </p>
        </Card>
      )}

      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <div>
            <SectionLabel>Solved</SectionLabel>
            <p className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums text-positive">
              {solved}
              <span className="text-base text-faint">/{all.length}</span>
            </p>
          </div>
          <div>
            <SectionLabel>On the clock</SectionLabel>
            <p className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums text-ink">
              {Math.round(clocked / 60)}
              <span className="text-base text-faint">m</span>
            </p>
          </div>
          <div>
            <SectionLabel>Past cap</SectionLabel>
            <p
              className={cn(
                "mt-1 font-mono text-2xl font-semibold leading-none tabular-nums",
                overCap ? "text-negative" : "text-faint",
              )}
            >
              {overCap}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!done && alerts.permission === "granted" && (
            <>
              <Button
                size="icon"
                variant="ghost"
                title={
                  alerts.sound
                    ? "Alerts chime — click to make them silent"
                    : "Alerts are silent — click to turn the chime on"
                }
                onClick={() => alerts.setSound(!alerts.sound)}
              >
                {alerts.sound ? <Volume2 /> : <VolumeX />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Send a test alert — check macOS is not swallowing them"
                onClick={alerts.demo}
              >
                <BellRing />
              </Button>
            </>
          )}
          {!done && active && (
            <Button variant="secondary" onClick={ctl.takeBreak}>
              <Coffee />
              Break
            </Button>
          )}
          {done ? (
            <Button variant="secondary" onClick={ctl.reopen}>
              <Play />
              Reopen
            </Button>
          ) : (
            <Button variant="danger" onClick={() => ctl.finish()}>
              <Flag />
              End session
            </Button>
          )}
        </div>
      </Card>

      {done && (
        <Card className="border-accent/30 bg-accent-soft">
          <CardTitle>Session closed</CardTitle>
          <p className="mt-1 text-[13px] text-muted">
            {solved} of {all.length} solved, {formatDuration(clocked)} on the
            clock across {all.length} problems
            {overCap > 0 &&
              `, ${overCap} of them past the cap`}
            . This is what the coach reads in the morning — nothing else needs
            doing tonight.
          </p>
        </Card>
      )}

      {blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          run={run}
          now={t}
          ctl={ctl}
          locked={done}
        />
      ))}
    </div>
  );
}

/**
 * Absolute times for the boundaries still ahead of the running problem.
 *
 * A clock is a sum of segments, so the threshold at X seconds lands at
 * `openedAt + (X − banked) × 1000`. Anything already behind is dropped rather
 * than scheduled: reloading halfway through an attempt must not replay hint
 * time, and breaking then restarting must push the rest of the schedule out by
 * exactly the length of the break, which falls out of recomputing from the new
 * open segment.
 */
function buildAlarms(run: RunDoc | null, day: CoachDay): Alarm[] | null {
  if (!run || run.finishedAt != null || !run.activeKey) return null;

  const problem = (day.practice?.blocks ?? [])
    .flatMap((b) => b.problems)
    .find((p) => p.key === run.activeKey);
  if (!problem) return null;

  const segments = run.entries[problem.key]?.segments ?? [];
  const open = segments.find((s) => s.to === null);
  if (!open) return null;

  const banked = segments.reduce(
    (sum, s) => sum + (s.to === null ? 0 : (s.to - s.from) / 1000),
    0,
  );
  const floor = Date.now() + 1000;

  return alertsFor(problem.capMinutes)
    .map((alert) => ({
      id: alert.id,
      at: open.from + (alert.at - banked) * 1000,
      kind: alert.kind,
      title: alert.title,
      body: `${problem.name} · ${alert.detail}`,
    }))
    .filter((alarm) => alarm.at > floor);
}

/**
 * The attempt clock for whichever problem is running.
 *
 * This is the only clock in the session, and it is the one thing worth looking
 * at mid-problem: how long you have been on this, which phase that puts you in,
 * and how long before the rule changes.
 */
function OnTheClock({
  problem,
  seconds,
  ctl,
}: {
  problem: CoachProblem;
  seconds: number;
  ctl: RunController;
}) {
  const state = phaseAt(problem.capMinutes, seconds);
  const phase = state.phase;

  return (
    <Card
      className={cn(
        "flex flex-col gap-6 sm:flex-row sm:items-center",
        state.over ? "border-negative/40 bg-negative/5" : "border-accent/40",
      )}
    >
      <PhaseRing phases={state.phases} elapsed={seconds} size={152}>
        <span className="font-mono text-[27px] font-bold leading-none tabular-nums text-ink">
          {formatClock(seconds)}
        </span>
        <span
          className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: phase?.color ?? "var(--negative)" }}
        >
          {phase?.label ?? "over"}
        </span>
      </PhaseRing>

      <div className="min-w-0 grow">
        <SectionLabel>On the clock</SectionLabel>
        <a
          href={problemUrl(problem)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate text-[17px] font-semibold text-ink hover:text-accent"
        >
          {problem.name}
        </a>

        <p className="mt-2 text-[13px] text-ink">
          {phase
            ? phase.rule
            : "Twice the cap is gone. Mark it however it stands and move on — nothing after this point is learning."}
        </p>
        <p className="mt-1 text-[12.5px] text-muted">
          {phase
            ? `${formatDuration(state.remaining)} left in ${phase.label}, then ${
                state.index === 0
                  ? "tags and a hint open up"
                  : state.index === 1
                    ? "the editorial opens up"
                    : "the attempt is over"
              }.`
            : `${formatDuration(seconds - state.total)} past the whole budget.`}
        </p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {state.phases.map((p, i) => (
            <span
              key={p.id}
              className={cn(
                "text-[11.5px]",
                i === state.index ? "font-semibold" : "text-faint",
              )}
              style={i === state.index ? { color: p.color } : undefined}
            >
              {p.label} {Math.round(p.seconds / 60)}m
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 gap-2 sm:flex-col">
        <Button variant="secondary" onClick={ctl.takeBreak}>
          <Coffee />
          Break
        </Button>
        <Button
          variant="accent"
          onClick={() => ctl.setStatus(problem.key, "solved")}
        >
          <Check />
          Solved
        </Button>
        <Button variant="ghost" onClick={() => ctl.addWrong(problem.key)}>
          <X />
          Wrong
        </Button>
      </div>
    </Card>
  );
}

function StartCard({ day, onStart }: { day: CoachDay; onStart: () => void }) {
  const blocks = day.practice?.blocks ?? [];
  const total = blocks.reduce((s, b) => s + b.minutes, 0);
  const count = blocks.reduce((s, b) => s + b.problems.length, 0);

  return (
    <Card className="text-center">
      <AlarmClock className="mx-auto size-7 text-accent" />
      <CardTitle className="mt-3">{day.practice?.title ?? "Practice"}</CardTitle>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] text-muted">
        {count} problems across {blocks.length} blocks, {total} minutes of planned
        work.
      </p>
      <div className="mx-auto mt-4 max-w-md space-y-1.5 text-left text-[12.5px] text-muted">
        <p>
          <span className="font-medium text-ink">The session is not timed.</span>{" "}
          Only problems are. Pressing Start on one puts it on the clock; nothing
          else in here measures you.
        </p>
        <p>
          <span className="font-medium text-ink">Every attempt has three
          phases.</span>{" "}
          The cap is yours alone, then a third of it for hints, then the rest of
          a second cap for the editorial. A 30-minute problem is 30 trying, 10 on
          hints, 20 with the tutorial.
        </p>
        <p>
          <span className="font-medium text-ink">The clock only stops by
          hand.</span>{" "}
          Break stops it, a verdict stops it, nothing else does. Reloading,
          closing the tab and sleeping the laptop all leave it running.
        </p>
        <p>
          <span className="font-medium text-ink">Each phase change comes to
          you.</span>{" "}
          You will be in the editor, not here, so the boundaries arrive as
          desktop notifications — a heads-up before each one, then hint time,
          editorial time, and the end of the budget.
        </p>
      </div>
      <Button variant="accent" size="lg" className="mx-auto mt-5" onClick={onStart}>
        <Play />
        Start the session
      </Button>
    </Card>
  );
}

function BlockCard({
  block,
  run,
  now,
  ctl,
  locked,
}: {
  block: CoachBlock;
  run: RunDoc;
  now: number;
  ctl: RunController;
  locked: boolean;
}) {
  const clocked = block.problems.reduce(
    (s, p) => s + activeSeconds(run.entries[p.key], now),
    0,
  );

  return (
    <Card flush>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
        <div>
          <CardTitle>{block.label}</CardTitle>
          {block.note && (
            <p className="mt-1 max-w-2xl text-[13px] text-muted">{block.note}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={clocked > block.minutes * 60 ? "warning" : "neutral"}>
            {formatDuration(clocked)} / {block.minutes}m
          </Badge>
        </div>
      </div>

      <div className="divide-y divide-line">
        {block.problems.map((p) => (
          <ProblemRow
            key={p.key}
            problem={p}
            run={run}
            now={now}
            ctl={ctl}
            locked={locked}
            blocked={!!run.activeKey && run.activeKey !== p.key}
          />
        ))}
      </div>
    </Card>
  );
}

function ProblemRow({
  problem,
  run,
  now,
  ctl,
  locked,
  blocked,
}: {
  problem: CoachProblem;
  run: RunDoc;
  now: number;
  ctl: RunController;
  locked: boolean;
  /** Another problem holds the clock, so this one cannot be started yet. */
  blocked: boolean;
}) {
  const entry = run.entries[problem.key];
  const seconds = activeSeconds(entry, now);
  const active = run.activeKey === problem.key;
  const status = entry?.status ?? "todo";
  const solved = status === "solved";
  const settled = status !== "todo";
  const state = phaseAt(problem.capMinutes, seconds);

  const [technique, setTechniqueLocal] = useState(entry?.technique ?? "");
  const [revealed, setRevealed] = useState(false);

  // A sealed problem still owes a technique line — naming it wrong is the whole
  // measurement — but it does not gate the clock. Reading the statement and
  // finding the idea *is* the attempt, and you cannot name a technique before
  // you have done that, so making Start wait for it just hid the first minutes
  // of every problem from the timer.
  const owesTechnique = !!problem.sealed && !entry?.technique;

  function commitTechnique() {
    const value = technique.trim();
    if (value.length < 3) {
      toast.error("Name the technique in a few words first");
      return;
    }
    ctl.setTechnique(problem.key, value);
    toast.success("Called it — mark it right or wrong when you know");
  }

  return (
    <div className={cn("p-4 transition-colors", active && "bg-accent-soft/50")}>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="w-12 shrink-0 rounded-lg px-2 py-1 text-center font-mono text-[11px] font-bold"
          style={{
            color: ratingColor(problem.rating),
            backgroundColor: `color-mix(in srgb, ${ratingColor(problem.rating)} 12%, transparent)`,
          }}
        >
          {problem.rating || "?"}
        </span>

        <div className="min-w-0 grow">
          <div className="flex items-center gap-2">
            <a
              href={problemUrl(problem)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "truncate text-[14px] font-medium hover:text-accent",
                solved ? "text-faint line-through" : "text-ink",
              )}
            >
              {problem.name}
            </a>
            <Badge variant="outline" size="sm">
              {problem.role}
            </Badge>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-faint">
            <span className="font-mono">{problem.key.replace("-", "")}</span>
            <span>·</span>
            <span>{problem.capMinutes}m cap</span>
            {entry?.wrongAttempts ? (
              <>
                <span>·</span>
                <span className="text-negative">
                  {entry.wrongAttempts} wrong
                </span>
              </>
            ) : null}
            {problem.sealed && !settled ? (
              <>
                <span>·</span>
                <span className="text-info">tags withheld</span>
              </>
            ) : (
              problem.tags.length > 0 && (
                <>
                  <span>·</span>
                  <span className="truncate">{problem.tags.join(", ")}</span>
                </>
              )
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={cn(
              "font-mono text-lg font-semibold leading-none tabular-nums",
              active ? "text-accent" : seconds > 0 ? "text-muted" : "text-faint",
            )}
          >
            {formatClock(seconds)}
          </p>
          {settled ? (
            <p className="mt-0.5 text-[10.5px] text-faint">{status}</p>
          ) : active || seconds > 0 ? (
            <p
              className="mt-0.5 text-[10.5px]"
              style={{ color: state.phase?.color ?? "var(--negative)" }}
            >
              {state.phase
                ? `${state.phase.label} · ${formatDuration(state.remaining)} left`
                : "budget spent"}
            </p>
          ) : (
            <p className="mt-0.5 text-[10.5px] text-faint">
              {Math.round(state.total / 60)}m budget
            </p>
          )}
        </div>

        {!locked && (
          <div className="flex shrink-0 items-center gap-1.5">
            {!settled && (
              <Button
                size="icon-sm"
                variant="ghost"
                title="Log a wrong submission"
                onClick={() => ctl.addWrong(problem.key)}
              >
                <X />
              </Button>
            )}
            {!settled && (
              <Button
                size="icon-sm"
                variant="ghost"
                title="Skip — moving on without solving"
                onClick={() => ctl.setStatus(problem.key, "skipped")}
              >
                <SkipForward />
              </Button>
            )}
            {!settled && (
              <Button
                size="sm"
                variant={active ? "primary" : "secondary"}
                disabled={blocked}
                title={
                  blocked
                    ? "Break the running problem first — one at a time"
                    : undefined
                }
                onClick={() =>
                  active ? ctl.takeBreak() : ctl.startProblem(problem.key)
                }
              >
                {active ? <Coffee /> : <Play />}
                {active ? "Break" : "Start"}
              </Button>
            )}
            <Button
              size="icon-sm"
              variant={solved ? "accent" : "secondary"}
              title={solved ? "Unmark" : "Mark solved"}
              onClick={() => ctl.setStatus(problem.key, solved ? "todo" : "solved")}
            >
              <Check />
            </Button>
          </div>
        )}
      </div>

      {(active || seconds > 0) && (
        <Progress
          value={(seconds / state.total) * 100}
          color={state.phase?.color ?? "var(--negative)"}
          size="sm"
          className="mt-3"
        />
      )}

      {owesTechnique && !settled && !locked && (
        <div className="mt-3 rounded-xl border border-info/30 bg-info/5 p-3">
          <p className="text-[12px] font-medium text-ink">
            Name the technique before you code
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted">
            One line: the method, and the invariant or sort key it turns on.
            Write it the moment you have the idea — it does not hold the clock,
            and a wrong line here is the most useful thing this session records.
          </p>
          <div className="mt-2.5 flex gap-2">
            <Input
              value={technique}
              onChange={(e) => setTechniqueLocal(e.target.value)}
              placeholder="e.g. two pointers — l only moves right because the sum is monotone"
              onKeyDown={(e) => e.key === "Enter" && commitTechnique()}
            />
            <Button variant="accent" onClick={commitTechnique}>
              <ChevronRight />
              Save
            </Button>
          </div>
        </div>
      )}

      {entry?.technique && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-sunken px-3 py-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-faint">
            Called it
          </span>
          <span className="grow text-[12.5px] text-ink">{entry.technique}</span>
          {!locked && (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={entry.techniqueRight === true ? "accent" : "outline"}
                onClick={() => ctl.setTechniqueRight(problem.key, true)}
              >
                Right
              </Button>
              <Button
                size="sm"
                variant={entry.techniqueRight === false ? "danger" : "outline"}
                onClick={() => ctl.setTechniqueRight(problem.key, false)}
              >
                Wrong
              </Button>
            </div>
          )}
        </div>
      )}

      {problem.reveal && settled && (
        <div className="mt-2">
          {revealed ? (
            <p className="rounded-xl border border-line bg-elevated px-3 py-2 text-[12.5px] text-ink">
              {problem.reveal}
            </p>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setRevealed(true)}>
              <Eye />
              Reveal the intended idea
            </Button>
          )}
        </div>
      )}

      {problem.why && !settled && (
        <p className="mt-2 text-[12px] text-muted">{problem.why}</p>
      )}
    </div>
  );
}
