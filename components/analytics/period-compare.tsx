"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { WindowStats } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/ui/card";

interface Metric {
  label: string;
  value: number | null;
  previous: number | null;
  suffix?: string;
  hint: string;
}

/**
 * The selected window against the equally long window before it. Each row states
 * the direction explicitly rather than leaving the reader to subtract, because
 * the whole value of this panel is answering "is this better than last time" in
 * one glance.
 */
export function PeriodCompare({
  current,
  previous,
}: {
  current: WindowStats;
  previous: WindowStats;
}) {
  const metrics: Metric[] = [
    {
      label: "Solved",
      value: current.count,
      previous: previous.count,
      hint: "Volume only. On its own it says nothing about level.",
    },
    {
      label: "Average rating",
      value: current.avgRating,
      previous: previous.avgRating,
      hint: "The number that has to climb for practice to be working.",
    },
    {
      label: "Top of range",
      value: current.p90Rating,
      previous: previous.p90Rating,
      hint: "90th percentile — the hardest level reached repeatedly, not once.",
    },
    {
      label: "In band or above",
      value: current.inBandRate,
      previous: previous.inBandRate,
      suffix: "%",
      hint: "Share of solves at the growth floor or harder.",
    },
    {
      label: "First try",
      value: current.firstTryRate,
      previous: previous.firstTryRate,
      suffix: "%",
      hint: "Accepted with no earlier wrong submission on that problem.",
    },
    {
      label: "Active days",
      value: current.activeDays,
      previous: previous.activeDays,
      hint: "Days with at least one solve.",
    },
    {
      label: "Topics touched",
      value: current.distinctTags,
      previous: previous.distinctTags,
      hint: "Distinct tags across the window.",
    },
  ];

  return (
    <ul className="divide-y divide-line">
      {metrics.map((m) => {
        const delta =
          m.value != null && m.previous != null ? m.value - m.previous : null;
        const tone =
          delta == null || delta === 0 ? "flat" : delta > 0 ? "up" : "down";

        const Icon =
          tone === "up" ? ArrowUpRight : tone === "down" ? ArrowDownRight : ArrowRight;

        return (
          <li key={m.label} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 grow">
              <p className="text-[13px] font-medium text-ink">{m.label}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-faint">{m.hint}</p>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-mono text-sm font-semibold leading-none tabular-nums text-ink">
                {m.value == null ? "—" : `${m.value}${m.suffix ?? ""}`}
              </p>
              <p className="mt-1 flex items-center justify-end gap-1 font-mono text-[11px] tabular-nums">
                <Icon
                  className={cn(
                    "size-3",
                    tone === "up" && "text-positive",
                    tone === "down" && "text-negative",
                    tone === "flat" && "text-faint",
                  )}
                />
                <span
                  className={cn(
                    tone === "up" && "text-positive",
                    tone === "down" && "text-negative",
                    tone === "flat" && "text-faint",
                  )}
                >
                  {delta == null
                    ? "no prior data"
                    : delta === 0
                      ? "unchanged"
                      : `${delta > 0 ? "+" : ""}${delta}${m.suffix ?? ""}`}
                </span>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CompareHeading({ previous }: { previous: WindowStats }) {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return (
    <SectionLabel>
      vs {fmt(previous.from)}&ndash;{fmt(previous.to)}
    </SectionLabel>
  );
}
