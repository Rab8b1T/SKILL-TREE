"use client";

import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { pluralize } from "@/lib/utils";

const WEEKS = 26;
const DAY_MS = 86_400_000;

/**
 * Half a year of daily solve counts. Weeks run in columns starting Monday, so
 * an empty column reads as a skipped week at a glance — which is the failure
 * mode worth seeing, not the total.
 */
export function SolveHeatmap({ byDate }: { byDate: Record<string, number> }) {
  const { columns, max, total } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Walk back to the Monday that starts the earliest visible week.
    const dow = (today.getDay() + 6) % 7;
    const lastMonday = new Date(today.getTime() - dow * DAY_MS);
    const start = new Date(lastMonday.getTime() - (WEEKS - 1) * 7 * DAY_MS);

    const cols: { date: string; count: number; future: boolean }[][] = [];
    let peak = 0;
    let sum = 0;

    for (let w = 0; w < WEEKS; w++) {
      const col: { date: string; count: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const cur = new Date(start.getTime() + (w * 7 + d) * DAY_MS);
        const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        const count = byDate[iso] ?? 0;
        peak = Math.max(peak, count);
        sum += count;
        col.push({ date: iso, count, future: cur.getTime() > today.getTime() });
      }
      cols.push(col);
    }
    return { columns: cols, max: peak, total: sum };
  }, [byDate]);

  function shade(count: number, future: boolean): string {
    if (future) return "transparent";
    if (count === 0) return "var(--sunken)";
    const ratio = max <= 1 ? 1 : Math.min(1, count / Math.max(2, max * 0.7));
    const pct = 22 + Math.round(ratio * 68);
    return `color-mix(in srgb, var(--positive) ${pct}%, var(--sunken))`;
  }

  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1 no-scrollbar">
        {columns.map((col, i) => (
          <div key={i} className="flex shrink-0 flex-col gap-[3px]">
            {col.map((cell) => (
              <Tooltip key={cell.date}>
                <TooltipTrigger asChild>
                  <div
                    className="size-[11px] rounded-[3px] transition-transform hover:scale-125"
                    style={{
                      backgroundColor: shade(cell.count, cell.future),
                      border: cell.future ? "none" : "1px solid var(--line)",
                    }}
                  />
                </TooltipTrigger>
                {!cell.future && (
                  <TooltipContent side="top">
                    {cell.count === 0
                      ? `No solves on ${cell.date}`
                      : `${pluralize(cell.count, "solve")} on ${cell.date}`}
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] text-faint">
        {pluralize(total, "solve")} in the last {WEEKS} weeks
      </p>
    </div>
  );
}
