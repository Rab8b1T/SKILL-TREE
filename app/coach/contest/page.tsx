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
import { ContestRunner } from "@/components/coach/contest-runner";

export default function CoachContestPage() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const plan = useCoachPlan();
  const today = useLocalToday();
  const day = today ? dayFor(plan.data, today) : null;
  const ctl = useRun("contest", day, handle);

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Contest" />
        <HandlePrompt />
      </PageShell>
    );
  }

  if (plan.isLoading || today === null || !ctl.ready) {
    return (
      <PageShell>
        <PageHeader title="Contest" />
        <Skeleton className="h-64 rounded-2xl" />
      </PageShell>
    );
  }

  if (!day?.contest) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Contest" />
        <EmptyState
          icon={CalendarDays}
          title="No contest published"
          description="Ask the coach for an evening contest session and the round appears here."
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
        title={day.contest.title}
        description={`Day ${day.day} · ${day.contest.mirrors} · ${day.date}`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/coach">
              <ArrowLeft />
              Coach
            </Link>
          </Button>
        }
      />
      <ContestRunner day={day} ctl={ctl} handle={handle} />
    </PageShell>
  );
}
