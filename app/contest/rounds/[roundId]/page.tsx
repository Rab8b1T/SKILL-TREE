"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Archive, Undo2 } from "lucide-react";
import { useContestRound, useSession } from "@/lib/queries";
import { divisionLabel } from "@/lib/contest";
import { problemUrl } from "@/lib/cf";
import { formatDuration } from "@/lib/utils";
import { slotOf } from "@/lib/types";
import { EmptyState, PageHeader, PageShell } from "@/components/layout/page";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProblemRow } from "@/components/problem-row";
import { HandlePrompt } from "@/components/handle-prompt";

export default function ContestRoundPage() {
  const params = useParams<{ roundId: string }>();
  const roundId = decodeURIComponent(params.roundId);
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const query = useContestRound(handle, roundId);

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Contest review" />
        <HandlePrompt />
      </PageShell>
    );
  }

  if (query.isLoading) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Contest review" />
        <Skeleton className="h-72 rounded-2xl" />
      </PageShell>
    );
  }

  if (query.isError || !query.data) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Contest review" />
        <EmptyState
          icon={Archive}
          title="Contest round not found"
          description="The record was not deleted. Check the connection or return to contest history."
          action={
            <Button asChild variant="secondary">
              <Link href="/contest">Back to contests</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const round = query.data;
  const back =
    round.section === "first-time-trials" ? "/contest/trials" : "/contest";
  const primary =
    round.scoringMode === "cf"
      ? `${round.points} points`
      : `${round.penaltyMinutes}m penalty`;

  return (
    <PageShell width="narrow">
      <PageHeader
        title={round.name}
        description={`${round.source === "coach" ? "Coach contest" : divisionLabel(round.division)} · ${new Date(round.finishedAt).toLocaleString()}`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={back}>
              <ArrowLeft />
              History
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant={round.section === "first-time-trials" ? "neutral" : "accent"}>
          {round.section === "first-time-trials"
            ? "First-time trial"
            : round.programSequence
              ? `Contest ${round.programSequence} of 200`
              : "Counted contest"}
        </Badge>
        <Badge variant="outline">
          {round.scoringMode === "cf" ? "CF points" : "Extended ICPC"}
        </Badge>
        {round.formatVariant === "customized" && (
          <Badge variant="warning">custom format</Badge>
        )}
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Solved", value: `${round.solved}/${round.total}` },
            { label: "Score", value: primary },
            { label: "Wrong", value: String(round.wrongAttempts ?? 0) },
            {
              label: "Active time",
              value:
                round.effectiveElapsedSeconds != null
                  ? formatDuration(round.effectiveElapsedSeconds)
                  : "legacy",
            },
          ].map((item) => (
            <div key={item.label}>
              <SectionLabel>{item.label}</SectionLabel>
              <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">
                {item.value}
              </p>
            </div>
          ))}
        </div>
        {!!round.pausedMsTotal && (
          <p className="mt-4 text-[12px] text-muted">
            {formatDuration(round.pausedMsTotal / 1000)} paused and excluded from
            the clock and score.
          </p>
        )}
      </Card>

      <Card flush>
        <div className="border-b border-line p-5">
          <CardTitle>Problem record</CardTitle>
          <p className="mt-0.5 text-[12px] text-muted">
            Verdict source, solve time, wrong attempts, rating and tags.
          </p>
        </div>
        {!round.problems?.length ? (
          <p className="p-6 text-center text-[13px] text-muted">
            This legacy round contains aggregate results only.
          </p>
        ) : (
          <div className="divide-y divide-line p-2">
            {round.problems.map((problem) => (
              <ProblemRow
                key={`${problem.contestId}-${problem.index}`}
                name={problem.name}
                index={slotOf(problem)}
                url={problemUrl(problem)}
                rating={problem.rating}
                tags={problem.tags}
                done={problem.solved}
                meta={
                  problem.solved
                    ? `${problem.solvedAtSeconds != null ? `Solved at ${formatDuration(problem.solvedAtSeconds)}` : "Solved"} · ${problem.wrongAttempts} wrong · ${problem.verdictSource ?? "legacy"}`
                    : `${problem.attempted ? "Attempted" : "Not attempted"} · ${problem.wrongAttempts} wrong`
                }
                actions={
                  problem.solved ? (
                    <Badge variant="positive">solved</Badge>
                  ) : (
                    <Button asChild size="sm" variant="secondary">
                      <Link href="/upsolve">
                        <Undo2 />
                        Upsolve
                      </Link>
                    </Button>
                  )
                }
              />
            ))}
          </div>
        )}
      </Card>
    </PageShell>
  );
}
