"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  FileText,
  GraduationCap,
  Library,
  Video,
} from "lucide-react";
import { useCoachPlan, useSession } from "@/lib/queries";
import { dayFor, type LessonResource } from "@/lib/coach";
import { useLocalToday } from "@/lib/use-now";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { EmptyState, PageHeader, PageShell } from "@/components/layout/page";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HandlePrompt } from "@/components/handle-prompt";
import { FigureView } from "@/components/coach/figure";

function outcomeKey(day: number, index: number) {
  return `st.lesson.${day}.outcome.${index}`;
}

function readOutcome(day: number, index: number): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(outcomeKey(day, index)) === "1";
}

function ResourceIcon({ kind }: { kind: LessonResource["kind"] }) {
  const Icon =
    kind === "video"
      ? Video
      : kind === "article"
        ? FileText
        : kind === "book"
          ? BookOpen
          : Library;
  return <Icon className="size-4 shrink-0 text-accent" />;
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-line bg-sunken p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink">
      {code}
    </pre>
  );
}

function OutcomeChecklist({
  day,
  outcomes,
}: {
  day: number;
  outcomes: string[];
}) {
  const mounted = useMounted();
  const [, bump] = useState(0);

  const toggle = useCallback(
    (index: number) => {
      const key = outcomeKey(day, index);
      const on = readOutcome(day, index);
      window.localStorage.setItem(key, on ? "0" : "1");
      bump((n) => n + 1);
    },
    [day],
  );

  return (
    <Card>
      <CardTitle>Outcomes</CardTitle>
      <p className="mt-1 text-[12.5px] text-muted">
        What must be true before you close this tab. Tick each one when it holds.
      </p>
      <ul className="mt-4 space-y-2">
        {outcomes.map((text, i) => {
          const checked = mounted && readOutcome(day, i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  checked
                    ? "border-positive/30 bg-positive/5"
                    : "border-line bg-elevated hover:bg-sunken",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                    checked
                      ? "border-positive bg-positive text-canvas"
                      : "border-line-strong bg-surface",
                  )}
                >
                  {checked && <Check className="size-3" />}
                </span>
                <span
                  className={cn(
                    "text-[13px] leading-relaxed",
                    checked ? "text-muted line-through" : "text-ink",
                  )}
                >
                  {text}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default function CoachLessonPage() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const plan = useCoachPlan();
  const today = useLocalToday();
  const day = today ? dayFor(plan.data, today) : null;

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Lesson" />
        <HandlePrompt />
      </PageShell>
    );
  }

  if (plan.isLoading || today === null) {
    return (
      <PageShell>
        <PageHeader title="Lesson" />
        <Skeleton className="h-64 rounded-2xl" />
      </PageShell>
    );
  }

  if (!day?.lesson) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Lesson" />
        <EmptyState
          icon={GraduationCap}
          title="No lesson published today"
          description="When the coach ships a teaching block for this day, it appears here."
          action={
            <Button asChild variant="secondary">
              <Link href="/coach/legacy">Back to the coach</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const lesson = day.lesson;

  return (
    <PageShell>
      <PageHeader
        title={lesson.title}
        description={`Day ${day.day} · ${day.date}`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/coach/legacy">
              <ArrowLeft />
              Coach
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="accent">{lesson.topic}</Badge>
        <Badge variant="neutral">{lesson.minutes} min</Badge>
      </div>

      <Card className="mb-4 border-accent/25 bg-accent-soft">
        <SectionLabel>Why this, now</SectionLabel>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">
          {lesson.why}
        </p>
      </Card>

      <div className="mb-4">
        <OutcomeChecklist day={day.day} outcomes={lesson.outcomes} />
      </div>

      {lesson.resources.length > 0 && (
        <Card flush className="mb-4">
          <div className="border-b border-line p-5">
            <CardTitle>Resources</CardTitle>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Pinpointed material — not a playlist, not a homepage.
            </p>
          </div>
          <ul className="divide-y divide-line">
            {lesson.resources.map((resource, i) => (
              <li key={i} className="p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <ResourceIcon kind={resource.kind} />
                  <div className="min-w-0 grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[14px] font-medium text-ink hover:text-accent"
                      >
                        {resource.title}
                      </a>
                      {resource.segment && (
                        <Badge variant="outline" className="font-mono">
                          {resource.segment}
                        </Badge>
                      )}
                      <span className="text-[11.5px] text-faint">
                        {resource.minutes}m
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-accent">
                      Watch for
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink">
                      {resource.watchFor}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card flush className="mb-4">
        <div className="border-b border-line p-5">
          <CardTitle>Steps</CardTitle>
        </div>
        <ol className="divide-y divide-line">
          {lesson.steps.map((step, i) => (
            <li key={i} className="p-5">
              <div className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-[12px] font-semibold text-accent">
                  {i + 1}
                </span>
                <div className="min-w-0 grow">
                  <p className="text-[14px] font-semibold text-ink">
                    {step.title}
                  </p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                    {step.body}
                  </p>
                  {step.figure && <FigureView spec={step.figure} />}
                  {step.code && <CodeBlock code={step.code} />}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="mb-4 border-warning/30">
        <SectionLabel>Drill · lesson closed, from memory</SectionLabel>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink">
          {lesson.drill.prompt}
        </p>
        {lesson.drill.starter && <CodeBlock code={lesson.drill.starter} />}
      </Card>

      <Card flush>
        <div className="border-b border-line p-5">
          <CardTitle>Retention check</CardTitle>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Answer with the lesson closed. Reveal only when you have a real
            attempt.
          </p>
        </div>
        <ul className="divide-y divide-line">
          {lesson.check.map((item, i) => (
            <li key={i} className="p-5">
              <details className="group">
                <summary className="cursor-pointer list-none text-[13.5px] font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="text-faint">Q{i + 1}. </span>
                  {item.q}
                  <span className="ml-2 text-[12px] font-normal text-accent">
                    Show answer
                  </span>
                </summary>
                <p className="mt-3 rounded-xl border border-line bg-elevated px-3 py-2 text-[13px] leading-relaxed text-ink">
                  {item.a}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </Card>

      {day.date !== today && (
        <Card className="mt-4 border-warning/40 bg-warning/5">
          <p className="flex items-center gap-2 text-[13px] text-ink">
            <CalendarDays className="size-4 shrink-0" />
            This lesson is from {day.date}, not today&apos;s calendar date.
          </p>
        </Card>
      )}
    </PageShell>
  );
}
