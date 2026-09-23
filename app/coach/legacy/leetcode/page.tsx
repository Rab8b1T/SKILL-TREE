"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Code2,
  Eye,
  Lightbulb,
} from "lucide-react";
import { useCoachPlan, useSession } from "@/lib/queries";
import {
  dayFor,
  type CoachLeetCodeProblem,
  type Hint,
} from "@/lib/coach";
import { useLocalToday } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { EmptyState, PageHeader, PageShell } from "@/components/layout/page";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HandlePrompt } from "@/components/handle-prompt";
import { FigureView } from "@/components/coach/figure";

function difficultyVariant(
  difficulty: CoachLeetCodeProblem["difficulty"],
): "positive" | "warning" | "negative" {
  if (difficulty === "Easy") return "positive";
  if (difficulty === "Medium") return "warning";
  return "negative";
}

function LeetCodeHintLadder({ hints }: { hints: NonNullable<CoachLeetCodeProblem["hints"]> }) {
  const [opened, setOpened] = useState(0);
  const [sayShown, setSayShown] = useState<Record<number, boolean>>({});
  const total = hints.ladder.length;

  return (
    <Card flush className="mt-3 border-warning/30">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-4 text-warning" />
          <CardTitle>Hints</CardTitle>
        </div>
        <Badge variant="warning">
          {opened} of {total} opened
        </Badge>
      </div>
      <div className="space-y-4 p-4">
        {hints.ladder.slice(0, opened).map((hint, i) => (
          <HintRung
            key={i}
            index={i}
            hint={hint}
            sayVisible={!!sayShown[i]}
            onShowSay={() => setSayShown((s) => ({ ...s, [i]: true }))}
            last={i === opened - 1}
          />
        ))}
        {opened < total && (
          <Button variant={opened === 0 ? "accent" : "secondary"} onClick={() => setOpened((n) => n + 1)}>
            <Lightbulb />
            {opened === 0 ? "Open the first hint" : `Open hint ${opened + 1}`}
          </Button>
        )}
        {hints.solution && opened >= total && (
          <div className="border-t border-line pt-4">
            <SectionLabel>The idea</SectionLabel>
            <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink">
              {hints.solution.say}
            </p>
            {hints.solution.figure && (
              <FigureView spec={hints.solution.figure} />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function HintRung({
  index,
  hint,
  sayVisible,
  onShowSay,
  last,
}: {
  index: number;
  hint: Hint;
  sayVisible: boolean;
  onShowSay: () => void;
  last: boolean;
}) {
  return (
    <div className={cn("flex gap-3", !last && "border-b border-line/70 pb-4")}>
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-warning/15 font-mono text-[11px] font-semibold text-warning">
        {index + 1}
      </span>
      <div className="min-w-0 grow">
        <p className="text-[13.5px] font-medium leading-relaxed text-ink">
          {hint.ask}
        </p>
        {hint.say &&
          (sayVisible ? (
            <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-muted">
              {hint.say}
            </p>
          ) : (
            <Button size="sm" variant="ghost" className="mt-2" onClick={onShowSay}>
              <Eye />
              Show the nudge
            </Button>
          ))}
        {hint.figure && <FigureView spec={hint.figure} />}
      </div>
    </div>
  );
}

function ProblemCard({ problem }: { problem: CoachLeetCodeProblem }) {
  const [revealOpen, setRevealOpen] = useState(false);

  return (
    <Card flush>
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 grow">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={problem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] font-semibold text-ink hover:text-accent"
              >
                {problem.title}
              </a>
              <Badge variant={difficultyVariant(problem.difficulty)}>
                {problem.difficulty}
              </Badge>
              <Badge variant="outline">{problem.capMinutes}m cap</Badge>
            </div>
            <p className="mt-2 text-[12.5px] text-muted">{problem.mirrors}</p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <a href={problem.url} target="_blank" rel="noopener noreferrer">
              Open
              <ArrowRight />
            </a>
          </Button>
        </div>

        {problem.sealed && (
          <div className="mt-4 rounded-xl border border-info/30 bg-info/5 p-3">
            <p className="text-[12px] font-medium text-ink">
              Name the technique before you code
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted">
              One line: the method and the invariant it turns on. Tags stay
              withheld until you are done.
            </p>
            {problem.reveal &&
              (revealOpen ? (
                <p className="mt-3 rounded-xl border border-line bg-elevated px-3 py-2 text-[12.5px] leading-relaxed text-ink">
                  {problem.reveal}
                </p>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => setRevealOpen(true)}
                >
                  <Eye />
                  Reveal the intended technique
                </Button>
              ))}
          </div>
        )}

        {!problem.sealed && problem.reveal && (
          <div className="mt-4">
            {revealOpen ? (
              <p className="rounded-xl border border-line bg-elevated px-3 py-2 text-[12.5px] leading-relaxed text-ink">
                {problem.reveal}
              </p>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setRevealOpen(true)}>
                <Eye />
                Reveal notes
              </Button>
            )}
          </div>
        )}

        {problem.hints?.ladder?.length ? (
          <LeetCodeHintLadder hints={problem.hints} />
        ) : null}
      </div>
    </Card>
  );
}

export default function CoachLeetCodePage() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const plan = useCoachPlan();
  const today = useLocalToday();
  const day = today ? dayFor(plan.data, today) : null;

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="LeetCode" />
        <HandlePrompt />
      </PageShell>
    );
  }

  if (plan.isLoading || today === null) {
    return (
      <PageShell>
        <PageHeader title="LeetCode" />
        <Skeleton className="h-64 rounded-2xl" />
      </PageShell>
    );
  }

  if (!day?.leetcode) {
    return (
      <PageShell width="narrow">
        <PageHeader title="LeetCode" />
        <EmptyState
          icon={Code2}
          title="No LeetCode block today"
          description="When the coach schedules interview-track reps, they appear here."
          action={
            <Button asChild variant="secondary">
              <Link href="/coach/legacy">Back to the coach</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const block = day.leetcode;

  return (
    <PageShell>
      <PageHeader
        title={block.title}
        description={`Day ${day.day} · ${block.minutes} min · ${block.problems.length} problems`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/coach/legacy">
              <ArrowLeft />
              Coach
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        {block.problems.map((problem) => (
          <ProblemCard key={problem.slug} problem={problem} />
        ))}
      </div>

      {day.date !== today && (
        <Card className="mt-4 border-warning/40 bg-warning/5">
          <p className="flex items-center gap-2 text-[13px] text-ink">
            <CalendarDays className="size-4 shrink-0" />
            This block is from {day.date}, not today&apos;s calendar date.
          </p>
        </Card>
      )}
    </PageShell>
  );
}
