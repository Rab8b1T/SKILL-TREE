"use client";

import { useState } from "react";
import {
  AlarmClock,
  Check,
  ChevronRight,
  Coffee,
  Eye,
  Flag,
  MoonStar,
  Pause,
  Play,
  SkipForward,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { problemUrl, ratingColor } from "@/lib/cf";
import {
  activeSeconds,
  AUTO_BREAK_THRESHOLD_MS,
  availableSeconds,
  breakSeconds,
  capRemaining,
  focusRatio,
  totalActiveSeconds,
  type CoachBlock,
  type CoachDay,
  type CoachProblem,
  type RunDoc,
} from "@/lib/coach";
import type { RunController } from "@/lib/use-run";
import { cn, formatClock, formatDuration } from "@/lib/utils";
import { useNow } from "@/lib/use-now";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressRing } from "@/components/ui/progress";
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

  if (!run) {
    return <StartCard day={day} onStart={ctl.begin} />;
  }

  const t = now ?? run.startedAt;
  const engaged = totalActiveSeconds(run, t);
  const rested = breakSeconds(run, t);
  const atDesk = availableSeconds(run, t);
  const focus = focusRatio(run, t);
  const done = run.finishedAt != null;
  const resting = ctl.onBreak;
  const openBreak = run.breaks?.[run.breaks.length - 1];
  const restingFor =
    resting && openBreak ? Math.floor((t - openBreak.from) / 1000) : 0;
  const paused = ctl.paused;
  const pausedFor = paused ? Math.floor((t - paused.at) / 1000) : 0;
  const pausedLong = pausedFor * 1000 >= AUTO_BREAK_THRESHOLD_MS;

  const all = blocks.flatMap((b) => b.problems);
  const solved = all.filter((p) => run.entries[p.key]?.status === "solved").length;
  const overCap = all.filter(
    (p) => activeSeconds(run.entries[p.key], t) > p.capMinutes * 60,
  ).length;

  // A clock left running is the one way this can lie in your favour, and the
  // cap is the only signal available for it — there is no way to observe you
  // working in another window.
  const active = all.find((p) => p.key === run.activeKey);
  const activeSecs = active ? activeSeconds(run.entries[active.key], t) : 0;
  const overrunning =
    active && activeSecs > active.capMinutes * 60 * 2
      ? { name: active.name, seconds: activeSecs, capMinutes: active.capMinutes }
      : null;

  return (
    <div className="space-y-4">
      {paused && !resting && !done && (
        <Card className="flex flex-wrap items-center gap-3 border-line-strong bg-elevated">
          <Pause className="size-4 shrink-0 text-muted" />
          <div className="grow">
            <p className="text-[13px] font-medium text-ink">
              Paused for {formatClock(pausedFor)}
              {pausedLong && " — counted as a break"}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              {pausedLong
                ? "You have been away long enough that this time has left the session, so it costs your focus nothing."
                : "Under five minutes still counts as desk time. Past that it becomes a break automatically, so you can walk away without thinking about it."}
              {paused.key
                ? " Resuming puts the clock back where you left it."
                : ""}
            </p>
          </div>
          <Button variant="accent" onClick={ctl.resumePaused}>
            <Play />
            Resume
          </Button>
        </Card>
      )}

      {resting && !done && (
        <Card className="flex flex-wrap items-center gap-3 border-accent/40 bg-accent-soft">
          <Coffee className="size-4 shrink-0 text-accent" />
          <div className="grow">
            <p className="text-[13px] font-medium text-ink">
              On a break for {formatClock(restingFor)}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              This time is taken out of the session entirely, so it costs your
              focus nothing. {openBreak?.resumeKey
                ? "Ending it puts the clock back on the problem you left."
                : "Pick a problem when you are back."}
            </p>
          </div>
          <Button variant="accent" onClick={ctl.endBreak}>
            <Play />
            Back to work
          </Button>
        </Card>
      )}

      {ctl.interrupted && !done && (
        <Card className="flex flex-wrap items-center gap-3 border-warning/40 bg-warning/5">
          <MoonStar className="size-4 shrink-0 text-warning" />
          <div className="grow">
            <p className="text-[13px] font-medium text-ink">
              Clock stopped — this machine was away for{" "}
              {formatDuration(ctl.interrupted.awaySeconds)}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              Long enough to count as a break, so it has been taken out of the
              session rather than charged to your focus. Time in another tab is
              never counted as absence — only the machine actually stopping.
            </p>
          </div>
          <Button variant="accent" onClick={ctl.resume}>
            <Play />
            Resume
          </Button>
        </Card>
      )}

      {overrunning && !done && (
        <Card className="flex flex-wrap items-center gap-3 border-negative/40 bg-negative/5">
          <AlarmClock className="size-4 shrink-0 text-negative" />
          <p className="grow text-[13px] text-ink">
            <span className="font-medium">{overrunning.name}</span> has been on
            the clock for {formatDuration(overrunning.seconds)} against a{" "}
            {overrunning.capMinutes}-minute cap. Either you are past the point of
            learning anything, or you forgot to stop the timer. Both are worth
            fixing now.
          </p>
        </Card>
      )}

      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <ProgressRing value={focus * 100} size={104} stroke={9}
            color={focus >= 0.7 ? "var(--positive)" : focus >= 0.5 ? "var(--warning)" : "var(--negative)"}>
            <span className="font-mono text-xl font-bold tabular-nums text-ink">
              {Math.round(focus * 100)}%
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-faint">
              focus
            </span>
          </ProgressRing>
          <div>
            <SectionLabel>Engaged</SectionLabel>
            <p className="mt-1 font-mono text-3xl font-bold leading-none tabular-nums text-ink">
              {formatClock(engaged)}
            </p>
            <p className="mt-1.5 text-[12px] text-muted">
              of {formatDuration(atDesk)} at the desk
              {rested > 0 && ` · ${formatDuration(rested)} on break`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div>
            <SectionLabel>Solved</SectionLabel>
            <p className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums text-positive">
              {solved}
              <span className="text-base text-faint">/{all.length}</span>
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

        <div className="flex flex-wrap gap-2">
          {!done && !resting && (
            <Button variant="secondary" onClick={ctl.startBreak}>
              <Coffee />
              Break
            </Button>
          )}
          {!done && !resting && paused && (
            <Button variant="accent" onClick={ctl.resumePaused}>
              <Play />
              Resume
            </Button>
          )}
          {!done && !resting && !paused && (
            <Button variant="secondary" onClick={ctl.pause} disabled={!run.activeKey}>
              <Pause />
              Pause
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
            {solved} of {all.length} solved in {formatDuration(engaged)} of engaged
            work at {Math.round(focus * 100)}% focus
            {rested > 0 &&
              `, with ${formatDuration(rested)} of declared breaks excluded`}
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
          <span className="font-medium text-ink">One at a time.</span> Starting a
          problem locks the others until you pause it or give it a verdict, so
          you cannot drift between problems without deciding to.
        </p>
        <p>
          <span className="font-medium text-ink">Leave whenever you need to.</span>{" "}
          Pause holds the clock and resumes on the same problem; anything longer
          than five minutes leaves the session as a break and costs your focus
          nothing. Use Break instead when you already know you are going.
        </p>
        <p>
          <span className="font-medium text-ink">The clock trusts you.</span> It
          keeps running while you are in the editor or on Codeforces, and only
          stops itself if this machine actually goes away.
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
  const engaged = block.problems.reduce(
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
          <Badge variant={engaged > block.minutes * 60 ? "warning" : "neutral"}>
            {formatDuration(engaged)} / {block.minutes}m
          </Badge>
        </div>
      </div>

      <div className="divide-y divide-line">
        {block.problems.map((p) => (
          <ProblemTimer
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

function ProblemTimer({
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
  const left = capRemaining(problem, seconds);
  const active = run.activeKey === problem.key;
  const status = entry?.status ?? "todo";
  const solved = status === "solved";
  const settled = status !== "todo";
  const pct = (seconds / (problem.capMinutes * 60)) * 100;

  const [technique, setTechniqueLocal] = useState(entry?.technique ?? "");
  const [revealed, setRevealed] = useState(false);

  // A sealed problem cannot start until the technique is named. That single line
  // is the whole measurement: naming it wrong is the error worth catching.
  const needsTechnique = !!problem.sealed && !entry?.technique;

  function commitTechnique() {
    const value = technique.trim();
    if (value.length < 3) {
      toast.error("Name the technique in a few words first");
      return;
    }
    ctl.setTechnique(problem.key, value);
    if (blocked) {
      toast.info("Saved. Pause or finish the running problem to start this one.");
      return;
    }
    ctl.focusProblem(problem.key);
  }

  const barColor =
    left < 0 ? "var(--negative)" : pct > 80 ? "var(--warning)" : "var(--accent)";

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
              left < 0 ? "text-negative" : active ? "text-accent" : "text-muted",
            )}
          >
            {formatClock(seconds)}
          </p>
          <p className="mt-0.5 text-[10.5px] text-faint">
            {left < 0 ? `${formatDuration(-left)} over` : `${formatDuration(left)} left`}
          </p>
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
            {!needsTechnique && !settled && (
              <Button
                size="sm"
                variant={active ? "primary" : "secondary"}
                disabled={blocked}
                title={
                  blocked
                    ? "Pause or finish the running problem first — one at a time"
                    : undefined
                }
                onClick={() => (active ? ctl.pause() : ctl.focusProblem(problem.key))}
              >
                {active ? <Pause /> : <Play />}
                {active ? "Pause" : "Work"}
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
          value={Math.min(100, pct)}
          color={barColor}
          size="sm"
          className="mt-3"
        />
      )}

      {needsTechnique && !locked && (
        <div className="mt-3 rounded-xl border border-info/30 bg-info/5 p-3">
          <p className="text-[12px] font-medium text-ink">
            Name the technique before you code
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted">
            One line: the method, and the invariant or sort key it turns on. A
            wrong line here is the single most useful thing this session records.
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
              {blocked ? "Save" : "Start"}
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
          {settled && !locked && (
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
