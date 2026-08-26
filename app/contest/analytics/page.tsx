"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BarChart3, Target } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useContestEvaluation, useSession } from "@/lib/queries";
import { DIVISIONS } from "@/lib/contest";
import { formatDuration, pluralize } from "@/lib/utils";
import { EmptyState, PageHeader, PageShell } from "@/components/layout/page";
import { Card, CardHeader, CardTitle, SectionLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { HandlePrompt } from "@/components/handle-prompt";

export default function ContestAnalyticsPage() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const [timezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const query = useContestEvaluation(handle, timezone);

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Contest analysis" />
        <HandlePrompt />
      </PageShell>
    );
  }

  if (query.isLoading) {
    return (
      <PageShell>
        <PageHeader title="Contest analysis" />
        <Skeleton className="h-72 rounded-2xl" />
      </PageShell>
    );
  }

  if (query.isError || !query.data) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Contest analysis" />
        <EmptyState
          icon={BarChart3}
          title="Contest analysis is unavailable"
          description="No records were changed. Retry when the database is available."
          action={
            <Button variant="secondary" onClick={() => void query.refetch()}>
              Retry
            </Button>
          }
        />
      </PageShell>
    );
  }

  const evaluation = query.data;
  const summary = evaluation.summary;
  const progress = Math.min(100, (summary.completed / summary.target) * 100);

  return (
    <PageShell>
      <PageHeader
        title="Contest analysis"
        description="Evidence from completed generated and coach contests. No synthetic rating is calculated."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/contest">
              <ArrowLeft />
              Contest
            </Link>
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Program progress</SectionLabel>
            <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-ink">
              {summary.completed}
              <span className="text-lg text-faint">/{summary.target}</span>
            </p>
          </div>
          <p className="text-[12px] text-muted">
            {summary.virtualRounds} generated · {summary.coachRounds} coach
          </p>
        </div>
        <Progress value={progress} className="mt-4" />
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Solve rate",
            value: `${Math.round(summary.solveRate * 100)}%`,
            hint: `${summary.solved}/${summary.problems} problems`,
          },
          {
            label: "Deepest solved",
            value: summary.deepestSolved ?? "—",
            hint: "across counted rounds",
          },
          {
            label: "Active time",
            value: formatDuration(summary.activeMinutes * 60),
            hint: "paused time excluded",
          },
          {
            label: "Wrong attempts",
            value: String(summary.wrongAttempts),
            hint: "before first accepts",
          },
        ].map((item) => (
          <Card key={item.label}>
            <SectionLabel>{item.label}</SectionLabel>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ink">
              {item.value}
            </p>
            <p className="mt-1 text-[11px] text-faint">{item.hint}</p>
          </Card>
        ))}
      </div>

      <RoundTrend rounds={evaluation.rounds} />

      {evaluation.comparison && (
        <Card className="mb-4">
          <CardHeader>
            <div>
              <CardTitle>
                Last {evaluation.comparison.size} vs previous{" "}
                {evaluation.comparison.size}
              </CardTitle>
              <p className="mt-0.5 text-[12px] text-muted">
                Equal contest-count windows, so busy weeks do not distort the comparison.
              </p>
            </div>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <ComparisonMetric
              label="Solve rate"
              current={`${Math.round(evaluation.comparison.currentSolveRate * 100)}%`}
              previous={`${Math.round(evaluation.comparison.previousSolveRate * 100)}%`}
              delta={`${evaluation.comparison.solveRateDelta >= 0 ? "+" : ""}${Math.round(evaluation.comparison.solveRateDelta * 100)} pp`}
              positive={evaluation.comparison.solveRateDelta >= 0}
            />
            <ComparisonMetric
              label="Wrong attempts per round"
              current={evaluation.comparison.currentWrongPerRound.toFixed(1)}
              previous={evaluation.comparison.previousWrongPerRound.toFixed(1)}
              delta={`${evaluation.comparison.wrongPerRoundDelta >= 0 ? "+" : ""}${evaluation.comparison.wrongPerRoundDelta.toFixed(1)}`}
              positive={evaluation.comparison.wrongPerRoundDelta <= 0}
            />
          </div>
        </Card>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Division progression</CardTitle>
              <p className="mt-0.5 text-[12px] text-muted">
                Standard generated formats only. Customized and coach rounds remain in totals.
              </p>
            </div>
          </CardHeader>
          <div className="space-y-3">
            {evaluation.divisions.map((division) => (
              <div
                key={division.division}
                className="rounded-xl border border-line px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold text-ink">
                    {DIVISIONS[division.division].name}
                  </p>
                  <Badge variant="outline">{pluralize(division.rounds, "round")}</Badge>
                </div>
                <p className="mt-1 font-mono text-[11px] tabular-nums text-muted">
                  {division.solved}/{division.problems} solved ·{" "}
                  {Math.round(division.solveRate * 100)}%
                  {division.deepestSolved
                    ? ` · deepest ${division.deepestSolved}`
                    : ""}
                  {division.rounds
                    ? ` · ${division.averageWrong.toFixed(1)} wrong/round`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>By virtual slot</CardTitle>
              <p className="mt-0.5 text-[12px] text-muted">
                Seen, attempted and solved across all generated contests.
              </p>
            </div>
          </CardHeader>
          {!evaluation.slots.length ? (
            <p className="py-8 text-center text-[13px] text-muted">
              Slot evidence appears after the first archived round.
            </p>
          ) : (
            <div className="space-y-2.5">
              {evaluation.slots.map((slot) => (
                <div key={slot.slot}>
                  <div className="flex items-center gap-2">
                    <span className="w-7 text-[12px] font-bold text-ink">
                      {slot.slot}
                    </span>
                    <div className="h-2 grow overflow-hidden rounded-full bg-sunken">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.round(slot.solveRate * 100)}%` }}
                      />
                    </div>
                    <span className="w-20 text-right font-mono text-[11px] text-muted">
                      {slot.solved}/{slot.seen}
                    </span>
                  </div>
                  <p className="ml-9 mt-1 font-mono text-[10px] text-faint">
                    {slot.attempted} attempted
                    {slot.medianSolveSeconds != null
                      ? ` · median ${formatDuration(slot.medianSolveSeconds)}`
                      : ""}
                    {slot.wrongAttempts
                      ? ` · ${slot.wrongAttempts} wrong`
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upsolve follow-through</CardTitle>
              <p className="mt-0.5 text-[12px] text-muted">
                Debt linked directly to originating contest rounds.
              </p>
            </div>
          </CardHeader>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Queued" value={evaluation.upsolve.queued} />
            <Metric label="Cleared" value={evaluation.upsolve.cleared} />
            <Metric label="Open" value={evaluation.upsolve.open} />
          </div>
          {evaluation.upsolve.medianClearDays != null && (
            <p className="mt-3 text-[12px] text-muted">
              Median clearance: {evaluation.upsolve.medianClearDays} days.
            </p>
          )}
          <Button asChild variant="secondary" size="sm" className="mt-4">
            <Link href="/upsolve">
              Open upsolve queue
              <ArrowUpRight />
            </Link>
          </Button>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Unsolved under the clock</CardTitle>
              <p className="mt-0.5 text-[12px] text-muted">
                Tags from generated problems that remained unsolved.
              </p>
            </div>
            <Target className="size-4 text-warning" />
          </CardHeader>
          {!evaluation.unsolvedTags.length ? (
            <p className="py-8 text-center text-[13px] text-muted">
              No tag weaknesses recorded yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {evaluation.unsolvedTags.map((item) => (
                <Link
                  key={item.tag}
                  href={`/practice?tags=${encodeURIComponent(item.tag)}`}
                >
                  <Badge variant="outline">
                    {item.tag} · {item.count}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

function RoundTrend({
  rounds,
}: {
  rounds: {
    roundId: string;
    sequence: number | null;
    solveRate: number;
    solved: number;
    total: number;
    source: string;
  }[];
}) {
  const data = useMemo(
    () =>
      rounds.slice(-40).map((round) => ({
        ...round,
        label: round.sequence ? `#${round.sequence}` : round.source,
        rate: Math.round(round.solveRate * 100),
      })),
    [rounds],
  );
  return (
    <Card className="mb-4">
      <CardHeader>
        <div>
          <CardTitle>Round-by-round solve rate</CardTitle>
          <p className="mt-0.5 text-[12px] text-muted">
            Last {Math.min(40, data.length)} counted contests, oldest first.
          </p>
        </div>
      </CardHeader>
      {data.length < 2 ? (
        <p className="py-8 text-center text-[13px] text-muted">
          A trend needs at least two counted contests.
        </p>
      ) : (
        <>
          <div className="h-48 w-full" aria-label="Solve rate by contest">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                accessibilityLayer
                margin={{ top: 8, right: 10, bottom: 0, left: -20 }}
              >
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--faint)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={16}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: "var(--faint)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "var(--accent)" }}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Solve rate"]}
                  labelFormatter={(label) => `Contest ${label}`}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="sr-only">
            {data
              .map(
                (round) =>
                  `${round.label}: ${round.solved} of ${round.total} solved`,
              )
              .join(". ")}
          </p>
        </>
      )}
    </Card>
  );
}

function ComparisonMetric({
  label,
  current,
  previous,
  delta,
  positive,
}: {
  label: string;
  current: string;
  previous: string;
  delta: string;
  positive: boolean;
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-1 font-mono text-2xl font-semibold text-ink">{current}</p>
      <p className="mt-1 text-[11px] text-muted">
        Previous {previous} ·{" "}
        <span className={positive ? "text-positive" : "text-negative"}>
          {delta}
        </span>
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}
