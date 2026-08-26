"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  History,
  Swords,
  Trophy,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useArchiveContest,
  useContestProgram,
  useContestRounds,
  useSession,
  useStartContest,
} from "@/lib/queries";
import { divisionLabel, scoreboard } from "@/lib/contest";
import { problemUrl } from "@/lib/cf";
import { useContestController } from "@/lib/use-contest";
import { formatClock, pluralize } from "@/lib/utils";
import { slotOf, type VirtualContest } from "@/lib/types";
import { EmptyState, PageHeader, PageShell } from "@/components/layout/page";
import { Card, CardHeader, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ProblemRow } from "@/components/problem-row";
import { HandlePrompt } from "@/components/handle-prompt";
import { ContestSetup } from "@/components/contest/contest-setup";
import { ContestLive } from "@/components/contest/contest-live";
import { ContestHistoryRow } from "@/components/contest/history-row";

export default function ContestPage() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const ctl = useContestController(handle);
  const start = useStartContest(handle);
  const archive = useArchiveContest(handle);
  const program = useContestProgram(handle);
  const trials = useContestRounds(handle, "first-time-trials", null, 1);
  const active = ctl.contest;

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Virtual contest" />
        <HandlePrompt />
      </PageShell>
    );
  }

  if (ctl.query.isError) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Virtual contest" />
        <EmptyState
          icon={Swords}
          title="Contest data could not be loaded"
          description="Your saved round was not replaced. Retry when the connection is available."
          action={
            <Button variant="secondary" onClick={() => void ctl.query.refetch()}>
              Retry
            </Button>
          }
        />
      </PageShell>
    );
  }

  if (!ctl.ready || program.isLoading) {
    return (
      <PageShell>
        <PageHeader title="Virtual contest" />
        <Skeleton className="h-64 rounded-2xl" />
      </PageShell>
    );
  }

  async function finish(next: VirtualContest) {
    try {
      await ctl.saveNow(next);
    } catch {
      // The controller already reported and refetched a conflict.
    }
  }

  if (active && !active.finishedAt) {
    return (
      <PageShell>
        <PageHeader
          title={active.name}
          description={`${divisionLabel(active.division)} · ${
            active.scoringMode === "icpc"
              ? "extended ICPC scoring"
              : "Codeforces point scoring"
          } · paused time is excluded`}
        />
        <ContestLive
          contest={active}
          onChange={ctl.update}
          onFinish={(next) => void finish(next)}
        />
      </PageShell>
    );
  }

  if (active?.finishedAt) {
    return (
      <ContestPostMortem
        contest={active}
        archiving={archive.isPending}
        onArchive={async () => {
          try {
            const saved = await ctl.saveNow(active);
            await archive.mutateAsync({
              version: saved.version,
              roundId: active.id,
            });
            toast.success("Contest archived and progress updated");
          } catch (error) {
            toast.error((error as Error).message);
          }
        }}
      />
    );
  }

  const progress = program.data ?? {
    targetRounds: 200,
    completedRounds: 0,
    createdAt: null,
    updatedAt: null,
  };
  const progressPct = Math.min(
    100,
    (progress.completedRounds / progress.targetRounds) * 100,
  );

  return (
    <PageShell>
      <PageHeader
        title="Virtual contest"
        description="Generated Div. 4–Div. 1 rounds with the matching Codeforces scoring model."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/contest/analytics">
              <BarChart3 />
              Analysis
            </Link>
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>200-contest program</SectionLabel>
            <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-ink">
              {progress.completedRounds}
              <span className="text-lg text-faint">/{progress.targetRounds}</span>
            </p>
            <p className="mt-1 text-[12px] text-muted">
              Every generated or coach contest counts. Multiple rounds per day are valid.
            </p>
          </div>
          <Badge variant={progress.completedRounds >= progress.targetRounds ? "positive" : "accent"}>
            {Math.max(0, progress.targetRounds - progress.completedRounds)} remaining
          </Badge>
        </div>
        <Progress value={progressPct} className="mt-4" />
      </Card>

      <div className="space-y-4">
        <ContestSetup
          onStart={async (options) => {
            await start.mutateAsync(options);
          }}
          starting={start.isPending}
        />

        {trials.data && trials.data.total > 0 && (
          <Card className="flex flex-wrap items-center gap-3">
            <History className="size-5 text-muted" />
            <div className="min-w-0 grow">
              <CardTitle>First-Time Contest Trials</CardTitle>
              <p className="mt-0.5 text-[12px] text-muted">
                {pluralize(trials.data.total, "legacy round")} preserved outside the
                200-contest counter.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/contest/trials">
                Open trials
                <ArrowRight />
              </Link>
            </Button>
          </Card>
        )}

        <ContestHistory handle={handle} />
      </div>
    </PageShell>
  );
}

function ContestPostMortem({
  contest,
  archiving,
  onArchive,
}: {
  contest: VirtualContest;
  archiving: boolean;
  onArchive: () => Promise<void>;
}) {
  const board = scoreboard(contest);
  const rate = board.total ? Math.round((board.solved / board.total) * 100) : 0;
  return (
    <PageShell width="narrow">
      <PageHeader
        title="Contest over"
        description={`${contest.name} · ${divisionLabel(contest.division)}`}
      />

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Solved", value: `${board.solved}/${board.total}` },
            { label: "Rate", value: `${rate}%` },
            {
              label: board.mode === "cf" ? "Points" : "Penalty",
              value:
                board.mode === "cf"
                  ? String(board.points)
                  : `${board.penaltyMinutes}m`,
            },
            { label: "Wrong", value: String(board.wrongAttempts) },
          ].map((item) => (
            <div key={item.label}>
              <SectionLabel>{item.label}</SectionLabel>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ink">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card flush className="mb-4">
        <div className="border-b border-line p-5">
          <CardTitle>Breakdown</CardTitle>
          <p className="mt-0.5 text-[13px] text-muted">
            Ratings and tags are open now. A final Codeforces sync runs when you archive.
          </p>
        </div>
        <div className="divide-y divide-line p-2">
          {contest.problems.map((problem) => {
            const key = `${problem.contestId}-${problem.index}`;
            const state = contest.states[key];
            const solved = state?.state === "solved";
            return (
              <ProblemRow
                key={key}
                name={problem.name}
                index={slotOf(problem)}
                url={problemUrl(problem)}
                rating={problem.rating}
                tags={problem.tags}
                done={solved}
                meta={
                  solved && state?.solvedAtSeconds !== undefined
                    ? `Solved at ${formatClock(state.solvedAtSeconds)} · ${state.wrongAttempts} wrong`
                    : state?.wrongAttempts
                      ? `${state.wrongAttempts} attempts, not solved`
                      : "Not attempted"
                }
                actions={
                  solved ? (
                    <Badge variant="positive">solved</Badge>
                  ) : (
                    <Badge variant="warning">
                      <Undo2 className="size-3" />
                      upsolve
                    </Badge>
                  )
                }
              />
            );
          })}
        </div>
      </Card>

      <Button
        variant="accent"
        className="w-full"
        disabled={archiving}
        onClick={() => void onArchive()}
      >
        <Trophy />
        {archiving ? "Archiving…" : "Archive, count and queue upsolves"}
      </Button>
    </PageShell>
  );
}

function ContestHistory({ handle }: { handle: string }) {
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursor = cursors.at(-1) ?? null;
  const query = useContestRounds(handle, "standard", cursor, 10);
  const data = query.data;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Contest history</CardTitle>
          <p className="mt-0.5 text-[13px] text-muted">
            {data?.total
              ? `${pluralize(data.total, "counted round")} · newest first`
              : "No counted contests yet"}
          </p>
        </div>
      </CardHeader>

      {query.isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : !data?.rounds.length ? (
        <EmptyState
          icon={Swords}
          title="No contests yet"
          description="Finish a generated or coach contest and it appears here."
        />
      ) : (
        <>
          <ul className="divide-y divide-line">
            {data.rounds.map((round) => (
              <ContestHistoryRow key={round.roundId} round={round} />
            ))}
          </ul>
          {(cursors.length > 1 || data.nextCursor) && (
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={cursors.length === 1}
                onClick={() => setCursors((items) => items.slice(0, -1))}
              >
                <ArrowLeft />
                Newer
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!data.nextCursor}
                onClick={() =>
                  data.nextCursor &&
                  setCursors((items) => [...items, data.nextCursor])
                }
              >
                Older
                <ArrowRight />
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
