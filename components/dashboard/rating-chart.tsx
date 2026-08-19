"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CF_RANKS, type CfRatingChange } from "@/lib/cf";

/**
 * Rating over time, with a horizontal band boundary for every rank the account
 * has passed through or is heading towards. The boundaries are the point of the
 * chart — the number alone doesn't say how far the next rank is.
 */
export function RatingChart({ history }: { history: CfRatingChange[] }) {
  const data = useMemo(
    () =>
      history.map((r, i) => ({
        i,
        rating: r.newRating,
        delta: r.newRating - r.oldRating,
        name: r.contestName,
        rank: r.rank,
        date: new Date(r.ratingUpdateTimeSeconds * 1000).toLocaleDateString(
          undefined,
          { month: "short", day: "numeric", year: "2-digit" },
        ),
      })),
    [history],
  );

  const { lo, hi } = useMemo(() => {
    if (!data.length) return { lo: 0, hi: 1600 };
    const values = data.map((d) => d.rating);
    return {
      lo: Math.max(0, Math.floor((Math.min(...values) - 120) / 100) * 100),
      hi: Math.ceil((Math.max(...values) + 160) / 100) * 100,
    };
  }, [data]);

  const boundaries = CF_RANKS.filter((r) => r.min > lo && r.min < hi);

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--line)" vertical={false} />

          {boundaries.map((b) => (
            <ReferenceLine
              key={b.name}
              y={b.min}
              stroke={b.color}
              strokeDasharray="3 4"
              strokeOpacity={0.55}
              label={{
                value: b.short,
                position: "insideRight",
                fill: b.color,
                fontSize: 10,
                fontWeight: 600,
              }}
            />
          ))}

          <XAxis
            dataKey="date"
            tick={{ fill: "var(--faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            domain={[lo, hi]}
            tick={{ fill: "var(--faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof data)[number];
              const up = d.delta >= 0;
              return (
                <div className="max-w-64 rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-md)]">
                  <p className="text-[13px] font-medium leading-snug text-ink">
                    {d.name}
                  </p>
                  <p className="mt-1 text-[11px] text-faint">
                    {d.date} &middot; rank {d.rank}
                  </p>
                  <p className="mt-2 flex items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                      {d.rating}
                    </span>
                    <span
                      className="font-mono text-[12px] font-semibold tabular-nums"
                      style={{
                        color: up ? "var(--positive)" : "var(--negative)",
                      }}
                    >
                      {up ? "+" : ""}
                      {d.delta}
                    </span>
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="rating"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#ratingFill)"
            dot={data.length <= 30 ? { r: 2.5, fill: "var(--accent)" } : false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
