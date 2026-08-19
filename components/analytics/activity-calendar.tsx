"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  monthGrid,
  TIER_LABEL,
  type ActivityTier,
  type CalendarCell,
} from "@/lib/daily";
import { cn, pluralize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIER: Record<ActivityTier, { fg: string; bg: string }> = {
  none: { fg: "var(--negative)", bg: "color-mix(in srgb, var(--negative) 8%, transparent)" },
  low: { fg: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 12%, transparent)" },
  mid: { fg: "var(--positive)", bg: "color-mix(in srgb, var(--positive) 12%, transparent)" },
  high: { fg: "var(--info)", bg: "color-mix(in srgb, var(--info) 14%, transparent)" },
  future: { fg: "var(--faint)", bg: "transparent" },
};

const ORDER: ActivityTier[] = ["none", "low", "mid", "high", "future"];

export function ActivityCalendar({
  counts,
  now,
}: {
  /** Local `YYYY-MM-DD` to problems solved that day. */
  counts: Map<string, number>;
  now: number;
}) {
  const [offset, setOffset] = useState(0);

  const view = useMemo(() => {
    const base = new Date(now);
    const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    return monthGrid(d.getFullYear(), d.getMonth(), counts, now);
  }, [counts, now, offset]);

  return (
    <Card>
      <div className="mb-4">
        <CardTitle>Activity calendar</CardTitle>
        <p className="mt-1 text-[13px] text-muted">
          Daily consistency. Counted in your local time, on the day each problem
          was first solved.
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOffset((o) => o - 1)}
          aria-label="Previous month"
        >
          <ChevronLeft />
        </Button>

        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-ink">
            {MONTHS[view.month]} {view.year}
          </p>
          {offset !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] uppercase tracking-wide"
              onClick={() => setOffset(0)}
            >
              Today
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOffset((o) => o + 1)}
          aria-label="Next month"
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {DOW.map((d) => (
          <div
            key={d}
            className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-faint"
          >
            {d}
          </div>
        ))}

        {Array.from({ length: view.leading }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {view.cells.map((cell) => (
          <DayCell key={cell.date} cell={cell} monthName={MONTHS[view.month]} />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4">
        {ORDER.map((tier) => (
          <span key={tier} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: TIER[tier].fg }}
            />
            <span className="text-muted">{TIER_LABEL[tier]}</span>
            <span className="font-mono font-semibold tabular-nums text-ink">
              {pluralize(view.tally[tier], "day")}
            </span>
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-baseline justify-center gap-2 rounded-xl bg-sunken py-2.5">
        <SectionLabel>Total this month</SectionLabel>
        <span className="font-mono text-sm font-semibold tabular-nums text-accent">
          {pluralize(view.total, "problem")}
        </span>
      </div>
    </Card>
  );
}

function DayCell({
  cell,
  monthName,
}: {
  cell: CalendarCell;
  monthName: string;
}) {
  const tier = TIER[cell.tier];
  return (
    <div
      title={
        cell.tier === "future"
          ? `${monthName} ${cell.day}: upcoming`
          : `${monthName} ${cell.day}: ${pluralize(cell.count, "problem")} solved`
      }
      className={cn(
        "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg transition-transform",
        cell.tier !== "future" && "hover:scale-[1.06]",
        cell.isToday && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
      )}
      style={{ backgroundColor: tier.bg }}
    >
      <span
        className="font-mono text-[11px] font-semibold leading-none tabular-nums"
        style={{ color: tier.fg }}
      >
        {cell.day}
      </span>
      {cell.count > 0 && (
        <span
          className="rounded-full px-1 font-mono text-[9px] font-semibold leading-tight tabular-nums"
          style={{
            color: tier.fg,
            backgroundColor: `color-mix(in srgb, ${tier.fg} 16%, transparent)`,
          }}
        >
          {cell.count}
        </span>
      )}
    </div>
  );
}
