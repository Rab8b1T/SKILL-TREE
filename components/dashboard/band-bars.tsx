"use client";

import { useMemo } from "react";
import { ratingColor } from "@/lib/cf";
import { cn } from "@/lib/utils";

/**
 * Solves per 100-point rating bucket. The growth band is highlighted because
 * volume below it isn't progress — that distinction is the whole reason this
 * chart exists rather than a single "problems solved" number.
 */
export function BandBars({
  byRating,
  band,
  className,
}: {
  byRating: Record<number, number>;
  band?: [number, number];
  className?: string;
}) {
  const rows = useMemo(() => {
    const keys = Object.keys(byRating)
      .map(Number)
      .filter((r) => byRating[r] > 0);
    if (!keys.length) return [];
    const lo = Math.min(...keys, band?.[0] ?? Infinity);
    const hi = Math.max(...keys, band?.[1] ?? 0);
    const out: { rating: number; count: number }[] = [];
    for (let r = lo; r <= hi; r += 100) {
      out.push({ rating: r, count: byRating[r] ?? 0 });
    }
    return out;
  }, [byRating, band]);

  const max = Math.max(1, ...rows.map((r) => r.count));

  if (!rows.length) {
    return (
      <p className="py-6 text-center text-[13px] text-muted">
        No rated solves yet.
      </p>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {rows.map(({ rating, count }) => {
        const inBand = band && rating >= band[0] && rating <= band[1];
        const color = ratingColor(rating);
        return (
          <div key={rating} className="flex items-center gap-2.5">
            <span
              className={cn(
                "w-9 shrink-0 text-right font-mono text-[11px] tabular-nums",
                inBand ? "font-semibold" : "",
              )}
              style={{ color: inBand ? color : "var(--faint)" }}
            >
              {rating}
            </span>
            <div className="relative h-4 grow overflow-hidden rounded-md bg-sunken">
              <div
                className="h-full rounded-md transition-[width] duration-700"
                style={{
                  width: `${(count / max) * 100}%`,
                  backgroundColor: color,
                  opacity: inBand ? 1 : 0.45,
                }}
              />
              {inBand && (
                <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-[10px] font-semibold uppercase tracking-wide text-ink/45">
                  band
                </span>
              )}
            </div>
            <span className="w-7 shrink-0 font-mono text-[11px] tabular-nums text-muted">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
