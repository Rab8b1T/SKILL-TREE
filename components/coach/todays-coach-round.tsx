"use client";

import Link from "next/link";
import { ArrowRight, Swords } from "lucide-react";
import { useCoachPlan } from "@/lib/queries";
import { dayFor } from "@/lib/coach";
import { useLocalToday } from "@/lib/use-now";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Surfaces the git-published coach round on `/contest` without coupling that
 * page to plan fetch failures — any error here simply omits the card.
 */
export function TodaysCoachRound() {
  const plan = useCoachPlan();
  const today = useLocalToday();

  if (plan.isError || plan.isLoading || today === null || !plan.data) {
    return null;
  }

  const day = dayFor(plan.data, today);
  const contest = day?.contest;
  if (!contest || day.date !== today) return null;

  return (
    <Card className="mb-4 border-accent/40 bg-accent-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 grow">
          <div className="flex items-center gap-2">
            <Swords className="size-4 text-accent" />
            <SectionLabel>Today&apos;s coach round</SectionLabel>
          </div>
          <CardTitle className="mt-1">{contest.title}</CardTitle>
          <p className="mt-1 text-[13px] text-muted">{contest.mirrors}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="neutral">{contest.minutes} min</Badge>
            <Badge variant="outline">
              {contest.problems.length} problems
            </Badge>
          </div>
          {contest.target && (
            <p className="mt-3 text-[13px] leading-relaxed text-ink">
              <span className="font-medium">Target: </span>
              {contest.target}
            </p>
          )}
        </div>
        <Button asChild variant="accent">
          <Link href="/coach/contest">
            Open coach contest
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
