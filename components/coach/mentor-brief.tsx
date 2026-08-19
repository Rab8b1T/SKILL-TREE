"use client";

import { AlertTriangle, Target, TrendingUp } from "lucide-react";
import { rankFor, ratingColor } from "@/lib/cf";
import type { CoachMentor } from "@/lib/coach";
import { cn } from "@/lib/utils";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

/**
 * The CM tracker's read, rendered where the work actually happens.
 *
 * Everything here is published by the coach rather than computed in the browser:
 * the pace targets come from real contest standings and the weakness list from
 * the tracker's ledger, and neither is something the app should be guessing at.
 */
export function MentorBrief({ mentor }: { mentor: CoachMentor }) {
  const rank = rankFor(mentor.rating);
  const toGo = mentor.goalRating - mentor.rating;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionLabel>Where you are</SectionLabel>
            <div className="mt-1.5 flex items-baseline gap-2.5">
              <span
                className="font-mono text-4xl font-bold leading-none tabular-nums"
                style={{ color: ratingColor(mentor.rating) }}
              >
                {mentor.rating}
              </span>
              <span className="text-[13px] font-medium text-muted">{rank.name}</span>
            </div>
            <p className="mt-2 text-[12.5px] text-muted">
              {toGo > 0
                ? `${toGo} to ${mentor.goalRating} · target ${mentor.goalDate}`
                : `${mentor.goalRating} reached`}
            </p>
          </div>

          <div className="min-w-[180px] grow sm:max-w-xs">
            <div className="flex items-baseline justify-between text-[11.5px] text-faint">
              <span>Newbie</span>
              <span>{mentor.goalRating}</span>
            </div>
            <Progress
              className="mt-1.5"
              value={((mentor.rating - 800) / (mentor.goalRating - 800)) * 100}
              color={ratingColor(mentor.rating)}
            />
          </div>
        </div>

        <div
          className={cn(
            "mt-4 rounded-xl border p-3.5",
            "border-accent/25 bg-accent-soft",
          )}
        >
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Target className="size-4 text-accent" />
            {mentor.headline}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            {mentor.detail}
          </p>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-accent" />
            Contest pace
          </CardTitle>
          <p className="mt-1 text-[12.5px] text-muted">
            The minute each slot has to fall by to leave the round reachable,
            against when it actually fell in your last rated round.
          </p>
          <div className="mt-3.5 space-y-2.5">
            {mentor.pace.map((p) => {
              const behind =
                p.yourMinutes !== null && p.yourMinutes > p.targetMinutes;
              return (
                <div key={p.slot} className="flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-sunken text-[12px] font-bold text-muted">
                    {p.slot}
                  </span>
                  <div className="grow">
                    <Progress
                      value={
                        p.yourMinutes === null
                          ? 0
                          : (p.targetMinutes / Math.max(p.yourMinutes, p.targetMinutes)) *
                            100
                      }
                      color={behind ? "var(--negative)" : "var(--positive)"}
                      size="sm"
                    />
                  </div>
                  <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted">
                    {p.yourMinutes === null ? "—" : `${p.yourMinutes}m`}
                    <span className="text-faint"> / {p.targetMinutes}m</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" />
            Open weaknesses
          </CardTitle>
          <p className="mt-1 text-[12.5px] text-muted">
            Worst first. The top one outranks topic rotation when today is planned.
          </p>
          <ul className="mt-3.5 space-y-2">
            {mentor.weaknesses.map((w) => (
              <li key={w.id} className="flex items-center gap-2.5">
                <Badge
                  variant={
                    w.severity >= 5
                      ? "negative"
                      : w.severity >= 4
                        ? "warning"
                        : "neutral"
                  }
                  size="sm"
                >
                  {w.severity}
                </Badge>
                <span className="text-[13px] text-ink">{w.label}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card flush>
        <div className="border-b border-line p-5">
          <CardTitle>Checkpoints</CardTitle>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Rounds are the only thing that moves rating. If a checkpoint is missed,
            the fix is more rounds before more problems.
          </p>
        </div>
        <div className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {mentor.checkpoints.map((c) => {
            const hit = mentor.rating >= c.rating;
            return (
              <div key={c.date} className="p-4">
                <SectionLabel>{c.date}</SectionLabel>
                <p
                  className={cn(
                    "mt-1 font-mono text-2xl font-semibold leading-none tabular-nums",
                    hit ? "text-positive" : "text-ink",
                  )}
                >
                  {c.rating}
                </p>
                <p className="mt-1 text-[11.5px] text-faint">
                  after {c.rounds} more {c.rounds === 1 ? "round" : "rounds"}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
