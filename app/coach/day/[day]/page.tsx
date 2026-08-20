"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Coffee,
  Swords,
} from "lucide-react";
import { useArenaData, useCoachPlan, useSession } from "@/lib/queries";
import {
  analyseRun,
  runId,
  type CoachDay,
  type RunDoc,
} from "@/lib/coach";
import { useLocalToday } from "@/lib/use-now";
import { EmptyState, PageHeader, PageShell } from "@/components/layout/page";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HandlePrompt } from "@/components/handle-prompt";
import { SessionReview } from "@/components/coach/session-review";

/**
 * Read-only review of one past day. The runners only ever load today, on
 * purpose — a live clock pointed at a finished session is how a record gets
 * corrupted — so this is where a day goes to be read afterwards.
 */
export default function CoachDayPage() {
  const params = useParams<{ day: string }>();
  const dayNumber = Number(params.day);
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

  if (plan.isLoading || arena.isLoading || today === null) {
    return (
      <PageShell>
        <PageHeader title={`Day ${params.day}`} />
        <Skeleton className="h-64 rounded-2xl" />
      </PageShell>
    );
  }

  const day = plan.data?.days.find((d) => d.day === dayNumber);

  if (!day) {
    return (
      <PageShell width="narrow">
        <PageHeader title={`Day ${params.day}`} />
        <EmptyState
          icon={CalendarDays}
          title="No such day in the plan"
          description="Only days the coach has published are readable here."
        />
        <div className="mt-4 flex justify-center">
          <Button asChild variant="secondary">
            <Link href="/coach">
              <ArrowLeft />
              Back to coach
            </Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const runs = arena.data?.runs;
  const isToday = day.date === today;
  const sorted = [...(plan.data?.days ?? [])].sort((a, b) => a.day - b.day);
  const at = sorted.findIndex((d) => d.day === dayNumber);
  const prev = at > 0 ? sorted[at - 1] : null;
  const next = at >= 0 && at < sorted.length - 1 ? sorted[at + 1] : null;

  return (
    <PageShell>
      <PageHeader
        title={`Day ${day.day} · ${day.focus}`}
        description={day.date}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/coach">
            <ArrowLeft />
            Coach
          </Link>
        </Button>
        <div className="grow" />
        {prev && (
          <Button asChild variant="secondary" size="sm">
            <Link href={`/coach/day/${prev.day}`}>
              <ArrowLeft />
              Day {prev.day}
            </Link>
          </Button>
        )}
        {next && (
          <Button asChild variant="secondary" size="sm">
            <Link href={`/coach/day/${next.day}`}>
              Day {next.day}
              <ArrowRight />
            </Link>
          </Button>
        )}
      </div>

      {day.concept && (
        <Card className="mb-4">
          <SectionLabel>The concept that day</SectionLabel>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">
            {day.concept}
          </p>
          {day.watchFor && (
            <p className="mt-2.5 border-t border-line pt-2.5 text-[13px] leading-relaxed text-muted">
              {day.watchFor}
            </p>
          )}
        </Card>
      )}

      <div className="space-y-4">
        <DaySession
          day={day}
          kind="practice"
          run={runs?.[runId("practice", day.day)]}
          isToday={isToday}
        />
        <DaySession
          day={day}
          kind="contest"
          run={runs?.[runId("contest", day.day)]}
          isToday={isToday}
        />
      </div>
    </PageShell>
  );
}

function DaySession({
  day,
  kind,
  run,
  isToday,
}: {
  day: CoachDay;
  kind: "practice" | "contest";
  run: RunDoc | undefined;
  isToday: boolean;
}) {
  const spec = kind === "practice" ? day.practice : day.contest;
  if (!spec) return null;

  const Icon = kind === "practice" ? AlarmClock : Swords;
  const title = spec.title ?? `Day ${day.day} ${kind}`;

  if (!run) {
    return (
      <Card>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-faint" />
          {title}
        </CardTitle>
        <p className="mt-1.5 text-[13px] text-muted">
          Never started. Nothing was recorded for this session.
        </p>
        {isToday && (
          <Button asChild variant="accent" className="mt-3.5">
            <Link href={`/coach/${kind}`}>
              Start it now
              <ArrowRight />
            </Link>
          </Button>
        )}
      </Card>
    );
  }

  const analysis = analyseRun(day, kind, run);
  const breaks = (run.breaks ?? []).filter((b) => b.to !== null);

  return (
    <Card flush>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-accent" />
          {title}
        </CardTitle>
        {isToday && !run.finishedAt && (
          <Button asChild variant="accent" size="sm">
            <Link href={`/coach/${kind}`}>
              Resume
              <ArrowRight />
            </Link>
          </Button>
        )}
      </div>

      <div className="p-5">
        <SessionReview
          analysis={analysis}
          run={run}
          showFocus={kind === "practice"}
        />

        {breaks.length > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <SectionLabel>Breaks</SectionLabel>
            <ul className="mt-2 space-y-1">
              {breaks.map((b, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-[12.5px] text-muted"
                >
                  <Coffee className="size-3.5 shrink-0 text-faint" />
                  <span className="font-mono tabular-nums">
                    {new Date(b.from).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-faint">→</span>
                  <span className="font-mono tabular-nums">
                    {Math.round(((b.to as number) - b.from) / 60000)}m
                  </span>
                  {b.auto && (
                    <span className="text-faint">
                      detected, not declared
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {run.review && (
          <div className="mt-5 border-t border-line pt-4">
            <SectionLabel>What you wrote afterwards</SectionLabel>
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
              {run.review}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
