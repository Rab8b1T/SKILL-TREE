"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useCoachPlan, useSession } from "@/lib/queries";
import { useRun } from "@/lib/use-run";
import { dayFor } from "@/lib/coach";
import { useLocalToday } from "@/lib/use-now";
import { EmptyState, PageHeader, PageShell } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HandlePrompt } from "@/components/handle-prompt";
import { PracticeRunner } from "@/components/coach/practice-runner";

export default function CoachPracticePage() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const plan = useCoachPlan();
  const today = useLocalToday();
  const day = today ? dayFor(plan.data, today) : null;
  const ctl = useRun("practice", day, handle);

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Practice" />
        <HandlePrompt />
      </PageShell>
    );
  }

  if (plan.isLoading || today === null || !ctl.ready) {
    return (
      <PageShell>
        <PageHeader title="Practice" />
        <Skeleton className="h-64 rounded-2xl" />
      </PageShell>
    );
  }

  if (!day?.practice) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Practice" />
        <EmptyState
          icon={CalendarDays}
          title="No practice published"
          description="Ask the coach to plan today and it appears here."
          action={
            <Button asChild variant="secondary">
              <Link href="/coach">Back to the coach</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={day.practice.title}
        description={`Day ${day.day} · ${day.focus} · ${day.date}`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/coach">
              <ArrowLeft />
              Coach
            </Link>
          </Button>
        }
      />
      {day.watchFor && (
        <p className="mb-4 rounded-xl border border-accent/25 bg-accent-soft px-4 py-3 text-[13px] text-ink">
          {day.watchFor}
        </p>
      )}
      <PracticeRunner day={day} ctl={ctl} />
    </PageShell>
  );
}
