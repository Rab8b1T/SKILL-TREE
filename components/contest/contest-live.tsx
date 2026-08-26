"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Flag,
  Pause,
  Play,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  elapsedSeconds,
  finishContest,
  isExpired,
  liveProblemPoints,
  pauseContest,
  remainingSeconds,
  resumeContest,
  scoreboard,
  submissionActiveSeconds,
} from "@/lib/contest";
import { problemUrl } from "@/lib/cf";
import { cn, formatClock } from "@/lib/utils";
import { useNow } from "@/lib/use-now";
import { slotOf, type VirtualContest } from "@/lib/types";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProblemRow } from "@/components/problem-row";

export function ContestLive({
  contest,
  onChange,
  onFinish,
}: {
  contest: VirtualContest;
  onChange: (next: VirtualContest) => void;
  onFinish: (next: VirtualContest) => void;
}) {
  const now = useNow(1000);
  const remaining = now ? remainingSeconds(contest, now) : contest.durationSeconds;
  const elapsed = now ? elapsedSeconds(contest, now) : 0;
  const board = useMemo(() => scoreboard(contest), [contest]);
  const paused = contest.pausedAt !== null;
  const urgent = remaining > 0 && remaining <= 300;

  const finishedRef = useRef(false);
  const syncingRef = useRef(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  /** Reconciles local state with real Codeforces verdicts. */
  const sync = useCallback(
    async (quiet = true) => {
      if (syncingRef.current || !contest.startedAt) return;
      syncingRef.current = true;
      try {
        const keys = contest.problems.map((p) => `${p.contestId}-${p.index}`);
        const since = Math.floor(contest.startedAt / 1000);
        const res = await fetch(
          `/api/cf/verdicts?since=${since}&mode=${board.mode}&keys=${keys.join(",")}`,
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Verdict check failed");

        const results = body.results as Record<
          string,
          {
            solved: boolean;
            wrongAttempts: number;
            solvedAtSeconds?: number;
            solvedAtTimeSeconds?: number;
          }
        >;

        let changed = false;
        const states = { ...contest.states };
        for (const [key, r] of Object.entries(results)) {
          const prev = states[key] ?? { key, state: "unsolved" as const, wrongAttempts: 0 };
          // Manual marks are never downgraded by a poll that hasn't caught up.
          const nextState =
            r.solved || prev.state === "solved"
              ? ("solved" as const)
              : r.wrongAttempts > 0
                ? ("attempted" as const)
                : prev.state;
          const wrong = Math.max(prev.wrongAttempts, r.wrongAttempts);
          const solvedAt =
            prev.solvedAtSeconds ??
            (r.solvedAtTimeSeconds
              ? submissionActiveSeconds(contest, r.solvedAtTimeSeconds)
              : r.solvedAtSeconds);
          if (
            nextState !== prev.state ||
            wrong !== prev.wrongAttempts ||
            solvedAt !== prev.solvedAtSeconds
          ) {
            changed = true;
            if (nextState === "solved" && prev.state !== "solved") {
              const problem = contest.problems.find(
                (p) => `${p.contestId}-${p.index}` === key,
              );
              toast.success(`${problem ? slotOf(problem) : key} accepted`);
            }
            states[key] = {
              key,
              state: nextState,
              wrongAttempts: wrong,
              solvedAtSeconds: solvedAt,
              verdictSource: r.solved ? "codeforces" : prev.verdictSource,
            };
          }
        }
        setSyncError(null);
        if (changed) onChange({ ...contest, states });
        else if (!quiet) toast.info("No new verdicts");
      } catch (err) {
        const message = (err as Error).message;
        setSyncError(message);
        if (!quiet) toast.error(message);
      } finally {
        syncingRef.current = false;
      }
    },
    [board.mode, contest, onChange],
  );

  // Poll while the clock runs. 45s stays well inside the Codeforces rate limit
  // and matches how quickly their own scoreboard updates.
  useEffect(() => {
    if (paused || contest.finishedAt) return;
    const id = setInterval(() => void sync(true), urgent ? 15_000 : 45_000);
    return () => clearInterval(id);
  }, [paused, contest.finishedAt, sync, urgent]);

  // Auto-finish exactly once when the window closes.
  useEffect(() => {
    if (!now || finishedRef.current || contest.finishedAt) return;
    if (isExpired(contest, now)) {
      finishedRef.current = true;
      toast.info("Time — contest closed");
      onFinish(finishContest(contest, "expired"));
    }
  }, [now, contest, onFinish]);

  function toggleSolved(key: string) {
    const prev = contest.states[key] ?? { key, state: "unsolved" as const, wrongAttempts: 0 };
    const solved = prev.state === "solved";
    onChange({
      ...contest,
      states: {
        ...contest.states,
        [key]: {
          ...prev,
          state: solved ? "unsolved" : "solved",
          solvedAtSeconds: solved ? undefined : elapsed,
          verdictSource: solved ? undefined : "manual",
        },
      },
    });
  }

  function addWrong(key: string) {
    const prev = contest.states[key] ?? { key, state: "unsolved" as const, wrongAttempts: 0 };
    onChange({
      ...contest,
      states: {
        ...contest.states,
        [key]: {
          ...prev,
          wrongAttempts: prev.wrongAttempts + 1,
          state: prev.state === "solved" ? prev.state : "attempted",
        },
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Clock */}
      <Card
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
          urgent && "border-negative/40",
        )}
      >
        <div>
          <SectionLabel>{paused ? "Paused" : "Time remaining"}</SectionLabel>
          <p
            className={cn(
              "mt-1 font-mono text-4xl font-bold leading-none tabular-nums",
              urgent ? "animate-urgent text-negative" : "text-ink",
              paused && "text-muted",
            )}
          >
            {now === null ? "--:--" : formatClock(remaining)}
          </p>
          <p className="mt-1.5 text-[12px] text-muted">
            {contest.name} &middot; {formatClock(elapsed)} elapsed
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <SectionLabel>Solved</SectionLabel>
            <p className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums text-positive">
              {board.solved}
              <span className="text-base text-faint">/{board.total}</span>
            </p>
          </div>
          {board.mode === "icpc" ? (
            <div className="text-right">
              <SectionLabel>Penalty</SectionLabel>
              <p className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums text-warning">
                {board.penaltyMinutes}
                <span className="text-base text-faint">m</span>
              </p>
            </div>
          ) : (
            <div className="text-right">
              <SectionLabel>Points</SectionLabel>
              <p className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums text-accent">
                {board.points}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="icon" onClick={() => void sync(false)}>
            <RefreshCw />
            <span className="sr-only">Check verdicts</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              onChange(paused ? resumeContest(contest) : pauseContest(contest))
            }
          >
            {paused ? <Play /> : <Pause />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="danger"
            onClick={() => onFinish(finishContest(contest, "manual"))}
          >
            <Flag />
            Finish
          </Button>
        </div>
      </Card>

      {/* Problems */}
      <Card flush>
        <div className="flex items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <CardTitle>Problems</CardTitle>
            <p className="mt-0.5 text-[13px] text-muted">
              {syncError
                ? `Verdict sync delayed: ${syncError}. Your contest state remains saved.`
                : `Submit on Codeforces; verdicts sync every ${urgent ? 15 : 45} seconds.`}
            </p>
          </div>
          <Badge variant="accent">
            {board.mode === "cf"
              ? `${board.points} pts`
              : `${board.solved}/${board.total} · ${board.penaltyMinutes}m`}
          </Badge>
        </div>

        <div className="p-2">
          <div className="divide-y divide-line">
            {contest.problems.map((p) => {
              const key = `${p.contestId}-${p.index}`;
              const state = contest.states[key];
              const solved = state?.state === "solved";
              const wrong = state?.wrongAttempts ?? 0;
              const livePoints =
                board.mode === "cf"
                  ? liveProblemPoints(
                      contest,
                      p.points,
                      state?.solvedAtSeconds ?? elapsed,
                      wrong,
                    )
                  : null;
              return (
                <ProblemRow
                  key={key}
                  name={p.name}
                  index={slotOf(p)}
                  url={problemUrl(p)}
                  rating={p.rating}
                  // Tags withheld while the clock runs: a contest never tells
                  // you which technique a problem wants.
                  sealed
                  done={solved}
                  meta={
                    <span className="flex items-center gap-2">
                      <span>
                        {board.mode === "cf"
                          ? `${livePoints} / ${p.points} pts`
                          : solved
                            ? "accepted"
                            : "ICPC"}
                      </span>
                      {wrong > 0 && (
                        <span className="text-negative">
                          {wrong} wrong &middot;{" "}
                          {board.mode === "cf"
                            ? `−${wrong * 50} pts`
                            : `+${wrong * 10}m`}
                        </span>
                      )}
                      {solved && state?.solvedAtSeconds !== undefined && (
                        <span className="text-positive">
                          at {formatClock(state.solvedAtSeconds)}
                        </span>
                      )}
                    </span>
                  }
                  actions={
                    <>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Log a wrong attempt"
                        onClick={() => addWrong(key)}
                      >
                        <X />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant={solved ? "accent" : "secondary"}
                        title={solved ? "Unmark" : "Mark solved"}
                        onClick={() => toggleSolved(key)}
                      >
                        <Check />
                      </Button>
                    </>
                  }
                />
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
