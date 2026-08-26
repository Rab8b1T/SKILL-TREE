"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Flag,
  Lock,
  RefreshCw,
  Swords,
  TrendingDown,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { problemUrl, ratingColor } from "@/lib/cf";
import {
  contestBoard,
  liveValue,
  type CoachContest,
  type CoachContestProblem,
  type CoachDay,
  type RunDoc,
} from "@/lib/coach";
import type { RunController } from "@/lib/use-run";
import { cn, formatClock, formatDuration, pluralize } from "@/lib/utils";
import { useNow } from "@/lib/use-now";
import { useArchiveCoachContest } from "@/lib/queries";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/input";
import { HintPanel } from "@/components/coach/hint-panel";

export function ContestRunner({
  day,
  ctl,
  handle,
}: {
  day: CoachDay;
  ctl: RunController;
  handle: string;
}) {
  const contest = day.contest;
  const run = ctl.run;
  const now = useNow(1000);
  const archive = useArchiveCoachContest(handle);
  const archivedRef = useRef<string | null>(null);
  const duration = (contest?.minutes ?? 0) * 60;
  const t = now ?? run?.startedAt ?? 0;
  // A contest clock is wall clock. Idle time is part of the round, unlike
  // practice, so this deliberately ignores the engaged-time machinery.
  const elapsed = run
    ? Math.min(
        duration,
        Math.floor(((run.finishedAt ?? t) - run.startedAt) / 1000),
      )
    : 0;
  const remaining = duration - elapsed;
  const over = Boolean(run && contest && remaining <= 0);
  const done = Boolean(run?.finishedAt) || over;
  const board = contest ? contestBoard(contest, run ?? undefined, elapsed) : null;
  const urgent = !done && remaining <= 600;

  const archiveRun = useCallback(
    async (finished: RunDoc, quiet = false) => {
      try {
        await archive.mutateAsync({ day: day.day, run: finished });
        if (!quiet) {
          toast.success("Contest saved, counted and sent to analysis");
        }
      } catch (error) {
        if (!quiet) toast.error((error as Error).message);
      }
    },
    [archive, day.day],
  );

  const finishAndArchive = useCallback(
    async (review?: string) => {
      const finished = ctl.finish(review);
      if (finished) await archiveRun(finished);
    },
    [archiveRun, ctl],
  );

  useEffect(() => {
    if (!run || !contest) return;
    if (over && !run.finishedAt) {
      const finished = ctl.finish();
      if (finished) {
        archivedRef.current = `${finished.id}-${finished.finishedAt}`;
        void archiveRun(finished, true);
      }
      return;
    }
    if (run.finishedAt) {
      const key = `${run.id}-${run.finishedAt}`;
      if (archivedRef.current === key) return;
      archivedRef.current = key;
      void archiveRun(run, true);
    }
  }, [archiveRun, contest, ctl, over, run]);

  if (!contest) return null;
  if (!run) return <StartCard contest={contest} onStart={ctl.begin} />;
  if (!board) return null;

  return (
    <div className="space-y-4">
      <ClockCard
        contest={contest}
        elapsed={elapsed}
        remaining={remaining}
        urgent={urgent}
        done={done}
        board={board}
        onFinish={() => void finishAndArchive()}
      />

      <VerdictSync
        contest={contest}
        run={run}
        handle={handle}
        elapsed={elapsed}
        disabled={done}
        ctl={ctl}
      />

      <Card flush>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <CardTitle>Problems</CardTitle>
            <p className="mt-0.5 text-[13px] text-muted">
              {done
                ? "Clock stopped — tags and ratings are open now."
                : "Solve on Codeforces, then mark it here. Value falls every minute."}
            </p>
          </div>
          <Badge variant="accent">{board.points} pts</Badge>
        </div>

        <div className="divide-y divide-line">
          {contest.problems.map((p) => (
            <ContestProblemRow
              key={p.key}
              problem={p}
              contest={contest}
              run={run}
              elapsed={elapsed}
              locked={done}
              ctl={ctl}
            />
          ))}
        </div>
      </Card>

      <HintShelf contest={contest} run={run} done={done} ctl={ctl} />

      {done && (
        <PostMortem
          contest={contest}
          run={run}
          board={board}
          saving={archive.isPending}
          onSave={finishAndArchive}
        />
      )}
    </div>
  );
}

/**
 * The round's hints, all of them, held behind the round itself.
 *
 * A contest is one gate rather than a phase per problem: while the clock runs
 * nothing opens, whatever any individual attempt looks like, because competing
 * unassisted is a rules line and not a training preference. The moment it stops
 * the whole shelf opens at once, which is exactly when it is useful — the
 * upsolve is the part of a round that moves rating.
 */
function HintShelf({
  contest,
  run,
  done,
  ctl,
}: {
  contest: CoachContest;
  run: RunDoc;
  done: boolean;
  ctl: RunController;
}) {
  const withHints = contest.problems.filter((p) => p.hints?.ladder?.length);
  if (withHints.length === 0) return null;

  if (!done) {
    const rungs = withHints.reduce(
      (sum, p) => sum + (p.hints?.ladder.length ?? 0),
      0,
    );
    return (
      <Card className="flex flex-wrap items-center gap-3 border-line-strong bg-elevated">
        <Lock className="size-4 shrink-0 text-faint" />
        <div className="min-w-0 grow">
          <p className="text-[13px] font-medium text-ink">
            {rungs} hints across {withHints.length} problems, sealed until the
            clock stops
          </p>
          <p className="mt-0.5 text-[12px] text-muted">
            They were written before the round and they stay shut through it.
            Every one of them opens for the upsolve the moment it ends.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {withHints.map((p) => (
        <div key={p.key}>
          <SectionLabel>
            {p.slot} · {p.name}
          </SectionLabel>
          <div className="mt-2">
            <HintPanel problem={p} entry={run.entries[p.key]} ctl={ctl} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StartCard({
  contest,
  onStart,
}: {
  contest: CoachContest;
  onStart: () => void;
}) {
  return (
    <Card className="text-center">
      <Swords className="mx-auto size-7 text-accent" />
      <CardTitle className="mt-3">{contest.title}</CardTitle>
      <p className="mx-auto mt-2 max-w-lg text-[13.5px] text-muted">
        {contest.mirrors} · {contest.problems.length} problems ·{" "}
        {contest.minutes} minutes. Points decay to 30% across the round and every
        wrong submission costs 50, exactly as on Codeforces.
      </p>
      {contest.target && (
        <p className="mx-auto mt-3 max-w-lg rounded-xl bg-accent-soft px-4 py-2.5 text-[13px] text-ink">
          {contest.target}
        </p>
      )}
      <p className="mx-auto mt-3 max-w-lg text-[12.5px] text-warning">
        No editorials, no hints, no searching. Once you press start the clock does
        not pause.
      </p>
      <Button variant="accent" size="lg" className="mx-auto mt-5" onClick={onStart}>
        <Swords />
        Start the round
      </Button>
    </Card>
  );
}

function ClockCard({
  contest,
  elapsed,
  remaining,
  urgent,
  done,
  board,
  onFinish,
}: {
  contest: CoachContest;
  elapsed: number;
  remaining: number;
  urgent: boolean;
  done: boolean;
  board: ReturnType<typeof contestBoard>;
  onFinish: () => void;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between",
        urgent && "border-negative/40",
      )}
    >
      <div>
        <SectionLabel>{done ? "Finished" : "Time remaining"}</SectionLabel>
        <p
          className={cn(
            "mt-1 font-mono text-4xl font-bold leading-none tabular-nums",
            urgent ? "animate-urgent text-negative" : done ? "text-muted" : "text-ink",
          )}
        >
          {formatClock(Math.max(0, remaining))}
        </p>
        <p className="mt-1.5 text-[12px] text-muted">
          {contest.mirrors} · {formatDuration(elapsed)} elapsed
        </p>
      </div>

      <div className="flex items-center gap-5">
        <div>
          <SectionLabel>Solved</SectionLabel>
          <p className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums text-positive">
            {board.solved}
            <span className="text-base text-faint">/{board.total}</span>
          </p>
        </div>
        <div>
          <SectionLabel>Points</SectionLabel>
          <p className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums text-ink">
            {board.points}
          </p>
        </div>
        <div>
          <SectionLabel>Lost</SectionLabel>
          <p className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums text-warning">
            {board.lostToTime + board.lostToWrong}
          </p>
        </div>
      </div>

      {!done && (
        <Button variant="danger" onClick={onFinish}>
          <Flag />
          Finish early
        </Button>
      )}
    </Card>
  );
}

/**
 * Pulls real verdicts from Codeforces so the round scores itself.
 *
 * Only submissions made after the round started count, and a manual mark is
 * never downgraded by a poll that has not caught up yet.
 */
function VerdictSync({
  contest,
  run,
  handle,
  elapsed,
  disabled,
  ctl,
}: {
  contest: CoachContest;
  run: RunDoc;
  handle: string;
  elapsed: number;
  disabled: boolean;
  ctl: RunController;
}) {
  const busy = useRef(false);
  const [last, setLast] = useState<number | null>(null);
  const now = useNow(5000);

  const sync = useCallback(
    async (quiet = true) => {
      if (busy.current) return;
      busy.current = true;
      try {
        const keys = contest.problems.map((p) => p.key).join(",");
        const since = Math.floor(run.startedAt / 1000);
        const res = await fetch(
          `/api/cf/verdicts?handle=${encodeURIComponent(handle)}&since=${since}&keys=${keys}`,
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Verdict check failed");

        const results = body.results as Record<
          string,
          { solved: boolean; wrongAttempts: number; solvedAtSeconds?: number }
        >;

        let found = 0;
        for (const p of contest.problems) {
          const r = results[p.key];
          if (!r) continue;
          const entry = run.entries[p.key];
          if (r.solved && entry?.status !== "solved") {
            // Codeforces reports seconds since the round opened, which is exactly
            // the figure the decay formula wants.
            ctl.setStatus(p.key, "solved", r.solvedAtSeconds ?? elapsed);
            found++;
            toast.success(`${p.slot} accepted`);
          }
          const known = entry?.wrongAttempts ?? 0;
          for (let i = known; i < r.wrongAttempts; i++) ctl.addWrong(p.key);
        }
        setLast(Date.now());
        if (!quiet && !found) toast.info("No new verdicts");
      } catch (err) {
        if (!quiet) toast.error((err as Error).message);
      } finally {
        busy.current = false;
      }
    },
    [contest.problems, run, handle, ctl, elapsed],
  );

  useEffect(() => {
    if (disabled) return;
    const id = setInterval(() => void sync(true), 45_000);
    return () => clearInterval(id);
  }, [disabled, sync]);

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 py-3">
      <p className="text-[12.5px] text-muted">
        Verdicts sync from Codeforces every 45 seconds
        {last && now ? ` · last checked ${formatDuration((now - last) / 1000)} ago` : ""}
      </p>
      <Button size="sm" variant="secondary" onClick={() => void sync(false)}>
        <RefreshCw />
        Check now
      </Button>
    </Card>
  );
}

function ContestProblemRow({
  problem,
  contest,
  run,
  elapsed,
  locked,
  ctl,
}: {
  problem: CoachContestProblem;
  contest: CoachContest;
  run: RunDoc;
  elapsed: number;
  locked: boolean;
  ctl: RunController;
}) {
  const entry = run.entries[problem.key];
  const solved = entry?.status === "solved";
  const wrong = entry?.wrongAttempts ?? 0;
  const at = entry?.solvedAtSeconds;

  const value = solved
    ? liveValue(problem, contest, at ?? elapsed, wrong)
    : liveValue(problem, contest, elapsed, wrong);
  const decayPct = (value / problem.points) * 100;

  return (
    <div className={cn("p-4", solved && "bg-positive/5")}>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl text-[13px] font-bold",
            solved ? "bg-positive/15 text-positive" : "bg-sunken text-muted",
          )}
        >
          {problem.slot}
        </span>

        <div className="min-w-0 grow">
          <a
            href={problemUrl(problem)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "truncate text-[14px] font-medium hover:text-accent",
              solved ? "text-faint line-through" : "text-ink",
            )}
          >
            {locked || solved ? problem.name : `Problem ${problem.slot}`}
          </a>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-faint">
            {locked ? (
              <>
                <span style={{ color: ratingColor(problem.rating) }}>
                  {problem.rating}
                </span>
                <span>·</span>
                <span className="truncate">{problem.tags.join(", ")}</span>
              </>
            ) : (
              <span>rating and tags withheld until the clock stops</span>
            )}
            {wrong > 0 && (
              <>
                <span>·</span>
                <span className="text-negative">
                  {pluralize(wrong, "wrong try")} · −{wrong * 50}
                </span>
              </>
            )}
            {solved && at !== undefined && (
              <>
                <span>·</span>
                <span className="text-positive">at {formatClock(at)}</span>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={cn(
              "font-mono text-lg font-semibold leading-none tabular-nums",
              solved ? "text-positive" : decayPct <= 40 ? "text-negative" : "text-ink",
            )}
          >
            {value}
          </p>
          <p className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-faint">
            {!solved && !locked && <TrendingDown className="size-3" />}
            of {problem.points}
          </p>
        </div>

        {!locked && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              size="icon-sm"
              variant="ghost"
              title="Log a wrong submission (−50)"
              onClick={() => ctl.addWrong(problem.key)}
            >
              <X />
            </Button>
            <Button
              size="icon-sm"
              variant={solved ? "accent" : "secondary"}
              title={solved ? "Unmark" : "Mark solved"}
              onClick={() =>
                ctl.setStatus(problem.key, solved ? "todo" : "solved", elapsed)
              }
            >
              <Check />
            </Button>
          </div>
        )}
      </div>

      {!solved && (
        <Progress
          value={decayPct}
          color={decayPct <= 40 ? "var(--negative)" : "var(--warning)"}
          size="sm"
          className="mt-3"
        />
      )}
    </div>
  );
}

function PostMortem({
  contest,
  run,
  board,
  saving,
  onSave,
}: {
  contest: CoachContest;
  run: RunDoc;
  board: ReturnType<typeof contestBoard>;
  saving: boolean;
  onSave: (review?: string) => Promise<void>;
}) {
  const [review, setReview] = useState(run.review ?? "");

  const unsolved = contest.problems.filter(
    (p) => run.entries[p.key]?.status !== "solved",
  );

  return (
    <Card>
      <CardTitle>Post-mortem</CardTitle>
      <p className="mt-1 text-[13px] text-muted">
        {board.solved} of {board.total} for {board.points} points.
        {board.lostToTime > 0 &&
          ` ${board.lostToTime} points went to the clock` }
        {board.lostToWrong > 0 &&
          `, ${board.lostToWrong} to wrong submissions`}
        {"."}
        {unsolved.length > 0 &&
          ` ${unsolved.map((p) => p.slot).join(", ")} ${unsolved.length === 1 ? "is" : "are"} owed as upsolves tomorrow morning.`}
      </p>

      <div className="mt-4 space-y-2">
        <p className="text-[12.5px] font-medium text-ink">
          One line per problem you did not solve: where did the time go?
        </p>
        <Textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="C — read it as maximise the sum, coded 20 minutes on the wrong quantity before rereading."
          rows={4}
        />
        <Button
          variant="accent"
          disabled={saving}
          onClick={() => void onSave(review.trim() || undefined)}
        >
          <Check />
          {saving ? "Saving…" : "Save the post-mortem"}
        </Button>
      </div>
    </Card>
  );
}
