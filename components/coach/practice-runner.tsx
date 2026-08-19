"use client";

import { useState } from "react";
import {
  AlarmClock,
  Check,
  ChevronRight,
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
  const wall = Math.max(1, ((run.finishedAt ?? t) - run.startedAt) / 1000);
  const focus = focusRatio(run, t);
  const done = run.finishedAt != null;

  const all = blocks.flatMap((b) => b.problems);
  const solved = all.filter((p) => run.entries[p.key]?.status === "solved").length;
  const overCap = all.filter(
    (p) => activeSeconds(run.entries[p.key], t) > p.capMinutes * 60,
  ).length;

  return (
    <div className="space-y-4">
      {ctl.idle && !done && (
        <Card className="flex items-center gap-3 border-warning/40 bg-warning/5">
          <MoonStar className="size-4 shrink-0 text-warning" />
          <p className="text-[13px] text-ink">
            Clock stopped — nothing has happened for 90 seconds. It restarts the
            moment you touch the page, and the idle time is not counted.
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
              of {formatDuration(wall)} since the session opened
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
          {!done && (
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
            work at {Math.round(focus * 100)}% focus. This is what the coach reads
            in the morning — nothing else needs doing tonight.
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
        work. The clock only runs on the problem you have open, and it stops by
        itself when you go quiet — so the number at the end is real.
      </p>
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
}: {
  problem: CoachProblem;
  run: RunDoc;
  now: number;
  ctl: RunController;
  locked: boolean;
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
              Start
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
