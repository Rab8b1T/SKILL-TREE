"use client";

import { CalendarRange } from "lucide-react";
import type { Granularity, RangeKey } from "@/lib/progression";
import { Segmented } from "@/components/ui/segmented";
import { Input } from "@/components/ui/input";
import { isoDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const RANGES: { value: RangeKey; label: string }[] = [
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "6m", label: "6m" },
  { value: "1y", label: "1y" },
  { value: "all", label: "All" },
];

const GRAINS: { value: Granularity; label: string }[] = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

export interface RangeState {
  range: RangeKey;
  granularity: Granularity;
  /** Set only when the user picks explicit dates; overrides `range`. */
  from: string | null;
  to: string | null;
}

export function RangeControl({
  state,
  onChange,
  className,
}: {
  state: RangeState;
  onChange: (next: RangeState) => void;
  className?: string;
}) {
  const custom = state.from != null || state.to != null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Segmented
        options={GRAINS}
        value={state.granularity}
        onChange={(granularity) => onChange({ ...state, granularity })}
        hideLabelsOnMobile={false}
      />

      <Segmented
        options={RANGES}
        value={custom ? ("all" as RangeKey) : state.range}
        onChange={(range) => onChange({ ...state, range, from: null, to: null })}
        hideLabelsOnMobile={false}
      />

      <div
        className={cn(
          "flex items-center gap-1.5 rounded-xl border px-2 py-1",
          custom ? "border-accent/40 bg-accent-soft" : "border-line bg-elevated",
        )}
      >
        <CalendarRange
          className={cn("size-3.5 shrink-0", custom ? "text-accent" : "text-faint")}
        />
        <Input
          type="date"
          aria-label="From date"
          max={state.to ?? isoDate()}
          value={state.from ?? ""}
          onChange={(e) => onChange({ ...state, from: e.target.value || null })}
          className="h-7 w-[7.5rem] border-0 bg-transparent px-1 font-mono text-[11px] tabular-nums shadow-none focus-visible:ring-0"
        />
        <span className="text-faint">&ndash;</span>
        <Input
          type="date"
          aria-label="To date"
          min={state.from ?? undefined}
          max={isoDate()}
          value={state.to ?? ""}
          onChange={(e) => onChange({ ...state, to: e.target.value || null })}
          className="h-7 w-[7.5rem] border-0 bg-transparent px-1 font-mono text-[11px] tabular-nums shadow-none focus-visible:ring-0"
        />
        {custom && (
          <button
            onClick={() => onChange({ ...state, from: null, to: null })}
            className="cursor-pointer px-1 text-[11px] font-medium text-accent hover:underline"
          >
            clear
          </button>
        )}
      </div>
    </div>
  );
}
