"use client";

import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Swords,
} from "lucide-react";
import { useCoachPlan, useArenaData, useSession } from "@/lib/queries";
import {
  analyseRun,
  dayFor,
  problemsOf,
  runId,
  type CoachDay,
  type CoachPlan,
} from "@/lib/coach";
import { cn } from "@/lib/utils";
import { useLocalToday } from "@/lib/use-now";
import { EmptyState, PageHeader, PageShell } from "@/components/layout/page";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HandlePrompt } from "@/components/handle-prompt";
import { MentorBrief } from "@/components/coach/mentor-brief";

export default function CoachPage() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const plan = useCoachPlan();
  const arena = useArenaData(handle);
  const today = useLocalToday();

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Coach" />
        <HandlePrompt />
      </PageShell>
    );
  }

  if (plan.isLoading || today === null) {
    return (
      <PageShell>
        <PageHeader title="Coach" />
        <Skeleton className="h-64 rounded-2xl" />
      </PageShell>
    );
  }

  if (plan.isError || !plan.data) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Coach" />
        <EmptyState
          icon={CalendarDays}
          title="No plan published yet"
          description="The coach publishes each day's practice and contest to git. Ask for a session and it appears here."
        />
      </PageShell>
    );
  }

  const day = dayFor(plan.data, today);

  if (!day) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Coach" />
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled"
          description="The published plan has no day on or before today."
        />
      </PageShell>
    );
  }

  const stale = day.date !== today;

  return (
    <PageShell>
      <PageHeader
        title={`Day ${day.day} · ${day.focus}`}
        description={day.concept}
      />

      {stale && (
        <Card className="mb-4 border-warning/40 bg-warning/5">
          <p className="text-[13px] text-ink">
            This is the plan for {day.date}, not today. Ask the coach to publish a
            new day.
          </p>
        </Card>
      )}

      {day.watchFor && (
        <Card className="mb-4 border-accent/30 bg-accent-soft">
          <SectionLabel>Watch for this today</SectionLabel>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">
            {day.watchFor}
          </p>
        </Card>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <SessionCard
          kind="practice"
          day={day}
          arenaRuns={arena.data?.runs}
          title={day.practice?.title ?? `Day ${day.day} Practice`}
          href="/coach/practice"
          icon={AlarmClock}
          blurb={
            day.practice
              ? `${(day.practice.blocks ?? []).reduce((s, b) => s + b.problems.length, 0)} problems · ${(day.practice.blocks ?? []).reduce((s, b) => s + b.minutes, 0)} min · timers track engaged effort only`
              : undefined
          }
        />
        <SessionCard
          kind="contest"
          day={day}
          arenaRuns={arena.data?.runs}
          title={day.contest?.title ?? `Day ${day.day} Contest`}
          href="/coach/contest"
          icon={Swords}
          blurb={
            day.contest
              ? `${day.contest.mirrors} · ${day.contest.problems.length} problems · points decay to 30%`
              : undefined
          }
        />
      </div>

      <MentorBrief mentor={plan.data.mentor} />

      <History plan={plan.data} arenaRuns={arena.data?.runs} today={today} />

      <p className="mt-4 text-center text-[11.5px] text-faint">
        Plan published {plan.data.updatedAt.slice(0, 10)}. The full tracker —
        error log, retention queue, study guides — runs locally at{" "}
        <a
          href="http://127.0.0.1:8765/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted underline decoration-line hover:text-accent"
        >
          127.0.0.1:8765
        </a>{" "}
        while the listener is up.
      </p>
    </PageShell>
  );
}

function SessionCard({
  kind,
  day,
  arenaRuns,
  title,
  href,
  icon: Icon,
  blurb,
}: {
  kind: "practice" | "contest";
  day: CoachDay;
  arenaRuns?: Record<string, import("@/lib/coach").RunDoc>;
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  blurb?: string;
}) {
  const spec = kind === "practice" ? day.practice : day.contest;
  const run = arenaRuns?.[runId(kind, day.day)];
  const total = problemsOf(day, kind).length;

  if (!spec) {
    return (
      <Card className="opacity-60">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4" />
          {title}
        </CardTitle>
        <p className="mt-1.5 text-[13px] text-muted">
          Not scheduled for today.
          {kind === "contest" &&
            " Ask for a contest session in the evening and it lands here."}
        </p>
      </Card>
    );
  }

  const analysis = run ? analyseRun(day, kind, run) : null;
  const done = !!run?.finishedAt;
  const started = !!run && !done;

  return (
    <Card className={cn(done && "border-positive/30")}>
      <div className="flex items-start justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-accent" />
          {title}
        </CardTitle>
        <Badge variant={done ? "positive" : started ? "warning" : "neutral"}>
          {done ? "finished" : started ? "in progress" : "not started"}
        </Badge>
      </div>

      <p className="mt-1.5 text-[13px] text-muted">{blurb}</p>

      {analysis && (
        <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2">
          <Stat label="Solved" value={`${analysis.solved}/${total}`} />
          <Stat label="Engaged" value={`${analysis.engagedMinutes}m`} />
          {kind === "practice" && (
            <Stat label="Focus" value={`${Math.round(analysis.focus * 100)}%`} />
          )}
          {analysis.wrongAttempts > 0 && (
            <Stat label="Wrong" value={String(analysis.wrongAttempts)} />
          )}
        </div>
      )}

      <Button asChild variant={done ? "secondary" : "accent"} className="mt-4 w-full">
        <Link href={href}>
          {done ? (
            <>
              <CheckCircle2 />
              Review it
            </>
          ) : started ? (
            <>
              Resume
              <ArrowRight />
            </>
          ) : (
            <>
              Start
              <ArrowRight />
            </>
          )}
        </Link>
      </Button>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-0.5 font-mono text-lg font-semibold leading-none tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}

/**
 * Past days with what actually happened. This is the surface that makes a
 * skipped session visible, which is the point — the tracker's severity-5
 * weakness is completion decaying across a week.
 */
function History({
  plan,
  arenaRuns,
  today,
}: {
  plan: CoachPlan;
  arenaRuns?: Record<string, import("@/lib/coach").RunDoc>;
  today: string;
}) {
  const past = plan.days
    .filter((d) => d.date < today)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (!past.length) return null;

  return (
    <Card flush className="mt-4">
      <div className="border-b border-line p-5">
        <CardTitle>Every past day</CardTitle>
        <p className="mt-0.5 text-[12.5px] text-muted">
          Newest first. Open one to read the per-problem record — times against
          caps, wrong attempts, the technique you named and whether it was right.
        </p>
      </div>
      <ul className="divide-y divide-line">
        {past.map((d) => {
          const p = arenaRuns?.[runId("practice", d.day)];
          const c = arenaRuns?.[runId("contest", d.day)];
          const pa = d.practice ? analyseRun(d, "practice", p) : null;
          const ca = d.contest ? analyseRun(d, "contest", c) : null;
          const nothing = !p && !c;
          return (
            <li key={d.day}>
              <Link
                href={`/coach/day/${d.day}`}
                className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-elevated"
              >
                <span className="w-16 shrink-0 font-mono text-[12px] text-faint">
                  Day {d.day}
                </span>
                <div className="min-w-0 grow">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {d.focus}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-faint">{d.date}</p>
                </div>
                {pa && p && (
                  <Badge variant={pa.solved === pa.total ? "positive" : "warning"}>
                    practice {pa.solved}/{pa.total} · {pa.engagedMinutes}m
                  </Badge>
                )}
                {d.practice && !p && (
                  <Badge variant="outline">practice skipped</Badge>
                )}
                {ca && c && (
                  <Badge variant={ca.solved > 0 ? "accent" : "neutral"}>
                    contest {ca.solved}/{ca.total}
                  </Badge>
                )}
                {nothing && <Badge variant="outline">nothing recorded</Badge>}
                <ArrowRight className="size-4 shrink-0 text-faint" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
