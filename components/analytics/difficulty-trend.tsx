"use client";

import { useMemo } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ratingColor } from "@/lib/cf";
import type { Granularity, Period } from "@/lib/progression";

/**
 * Difficulty over time. The three layers answer different questions and are
 * deliberately on one chart because the interesting reading is the relationship
 * between them:
 *
 *   bars           how much was solved      (volume)
 *   avg / p90      how hard it was          (difficulty)
 *   shaded band    where it should have been (the growth floor at the time)
 *   rating line    what the account was     (context for the band)
 *
 * A run of bars sitting under the shaded band is the diagnosis this whole page
 * exists to surface: volume that is not progress.
 */
export function DifficultyTrend({
  periods,
  granularity,
}: {
  periods: Period[];
  granularity: Granularity;
}) {
  const data = useMemo(
    () =>
      periods.map((p) => ({
        label: p.label,
        count: p.count,
        avg: p.avgRating,
        p90: p.p90Rating,
        rating: p.rating,
        // Recharts stacks an area from a base, so the band is drawn as
        // [floor, thickness] rather than two absolute bounds.
        bandFloor: p.band?.[0] ?? null,
        bandSpan: p.band ? p.band[1] - p.band[0] : null,
        band: p.band,
        inBand: p.inBand,
        belowBand: p.belowBand,
        aboveBand: p.aboveBand,
        firstTry: p.firstTry,
        tags: p.distinctTags,
      })),
    [periods],
  );

  const { lo, hi, maxCount } = useMemo(() => {
    const values = data.flatMap((d) =>
      [d.avg, d.p90, d.rating, d.bandFloor, d.bandFloor != null && d.bandSpan != null ? d.bandFloor + d.bandSpan : null].filter(
        (v): v is number => v != null,
      ),
    );
    return {
      lo: values.length ? Math.max(0, Math.floor((Math.min(...values) - 150) / 100) * 100) : 800,
      hi: values.length ? Math.ceil((Math.max(...values) + 150) / 100) * 100 : 1600,
      maxCount: Math.max(1, ...data.map((d) => d.count)),
    };
  }, [data]);

  if (!periods.length) {
    return (
      <p className="py-10 text-center text-[13px] text-muted">
        No solves in this range.
      </p>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--positive)" stopOpacity={0.16} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--line)" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fill: "var(--faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            yAxisId="rating"
            domain={[lo, hi]}
            tick={{ fill: "var(--faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          {/* Volume shares the plot but not the scale, so it never competes with
              the rating lines for vertical space. */}
          <YAxis
            yAxisId="count"
            orientation="right"
            domain={[0, maxCount * 3]}
            hide
          />

          <Area
            yAxisId="rating"
            dataKey="bandFloor"
            stackId="band"
            stroke="none"
            fill="transparent"
            isAnimationActive={false}
            activeDot={false}
          />
          <Area
            yAxisId="rating"
            dataKey="bandSpan"
            stackId="band"
            stroke="var(--positive)"
            strokeOpacity={0.3}
            strokeDasharray="3 4"
            fill="url(#bandFill)"
            isAnimationActive={false}
            activeDot={false}
          />

          <Bar
            yAxisId="count"
            dataKey="count"
            fill="var(--accent)"
            fillOpacity={0.18}
            radius={[3, 3, 0, 0]}
            maxBarSize={26}
          />

          <Line
            yAxisId="rating"
            type="monotone"
            dataKey="rating"
            stroke="var(--faint)"
            strokeWidth={1.5}
            strokeDasharray="2 3"
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="rating"
            type="monotone"
            dataKey="p90"
            stroke="var(--warning)"
            strokeWidth={1.75}
            dot={false}
            connectNulls={false}
          />
          <Line
            yAxisId="rating"
            type="monotone"
            dataKey="avg"
            stroke="var(--accent)"
            strokeWidth={2.5}
            dot={data.length <= 26 ? { r: 2.5, fill: "var(--accent)" } : false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />

          <Tooltip
            cursor={{ fill: "var(--sunken)", opacity: 0.6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof data)[number];
              return (
                <div className="min-w-52 rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-md)]">
                  <p className="text-[12px] font-semibold text-ink">
                    {granularity === "week" ? `Week of ${d.label}` : d.label}
                  </p>

                  {d.count === 0 ? (
                    <p className="mt-1.5 text-[12px] text-muted">No solves.</p>
                  ) : (
                    <>
                      <dl className="mt-2 space-y-1">
                        <Row label="Solved" value={String(d.count)} />
                        {d.avg != null && (
                          <Row
                            label="Average"
                            value={String(d.avg)}
                            color={ratingColor(d.avg)}
                          />
                        )}
                        {d.p90 != null && (
                          <Row
                            label="Top of range"
                            value={String(d.p90)}
                            color={ratingColor(d.p90)}
                          />
                        )}
                        <Row label="First try" value={`${d.firstTry}/${d.count}`} />
                        <Row label="Topics" value={String(d.tags)} />
                      </dl>

                      {d.band && (
                        <div className="mt-2 border-t border-line pt-2">
                          <p className="font-mono text-[10px] tabular-nums uppercase tracking-wide text-faint">
                            band {d.band[0]}&ndash;{d.band[1]}
                          </p>
                          <p className="mt-1 flex gap-2 font-mono text-[11px] tabular-nums">
                            <span className="text-negative">{d.belowBand} below</span>
                            <span className="text-positive">{d.inBand} in</span>
                            <span className="text-accent">{d.aboveBand} above</span>
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd
        className="font-mono text-[11px] font-semibold tabular-nums"
        style={{ color: color ?? "var(--ink)" }}
      >
        {value}
      </dd>
    </div>
  );
}
