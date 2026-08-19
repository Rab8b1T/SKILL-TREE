"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ratingColor } from "@/lib/cf";
import { DAILY_SCORE_GAMMA, type DayStats, type SeriesSummary } from "@/lib/daily";
import { SectionLabel } from "@/components/ui/card";

/**
 * The two day-resolution views. Both keep zero days in the series on purpose:
 * the gaps are the finding, and a chart of only active days would hide the exact
 * inconsistency it is meant to show.
 */

function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function StatTile({
  label,
  value,
  tone = "accent",
}: {
  label: string;
  value: string;
  tone?: "accent" | "positive";
}) {
  const color = tone === "positive" ? "var(--positive)" : "var(--accent)";
  return (
    <div
      className="rounded-xl px-3 py-2 text-center"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)` }}
    >
      <p
        className="font-mono text-lg font-semibold leading-none tabular-nums"
        style={{ color }}
      >
        {value}
      </p>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-faint">
        {label}
      </p>
    </div>
  );
}

export function SolvesPerDayTiles({ summary }: { summary: SeriesSummary }) {
  return (
    <div className="flex gap-2">
      <StatTile label="avg/active day" value={summary.avgPerActiveDay.toFixed(2)} />
      <StatTile label="best day" value={String(summary.bestCount)} tone="positive" />
    </div>
  );
}

export function ScoreTiles({ summary }: { summary: SeriesSummary }) {
  return (
    <div className="flex gap-2">
      <StatTile label="avg score" value={summary.avgScorePerActiveDay.toFixed(1)} />
      <StatTile
        label="best score"
        value={String(Math.round(summary.bestScore))}
        tone="positive"
      />
    </div>
  );
}

export function SolvesPerDay({ series }: { series: DayStats[] }) {
  const maxCount = useMemo(
    () => Math.max(1, ...series.map((d) => d.count)),
    [series],
  );

  if (!series.length) {
    return (
      <p className="py-10 text-center text-[13px] text-muted">
        No days in this range.
      </p>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fill: "var(--faint)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={44}
          />
          <YAxis
            domain={[0, maxCount]}
            allowDecimals={false}
            tick={{ fill: "var(--faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Bar
            dataKey="count"
            fill="var(--accent)"
            radius={[2, 2, 0, 0]}
            maxBarSize={18}
            isAnimationActive={series.length <= 120}
          />
          <Tooltip
            cursor={{ fill: "var(--sunken)", opacity: 0.6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DayStats;
              return (
                <div className="rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-md)]">
                  <p className="text-[12px] font-semibold text-ink">
                    {longDate(d.date)}
                  </p>
                  <p className="mt-1 text-[12px] text-muted">
                    {d.count === 0
                      ? "No activity"
                      : `${d.count} problem${d.count === 1 ? "" : "s"} solved`}
                  </p>
                </div>
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyScoreChart({ series }: { series: DayStats[] }) {
  if (!series.length) {
    return (
      <p className="py-10 text-center text-[13px] text-muted">
        No days in this range.
      </p>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
          <defs>
            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--positive)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fill: "var(--faint)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={44}
          />
          <YAxis
            tick={{ fill: "var(--faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--positive)"
            strokeWidth={1.75}
            fill="url(#scoreFill)"
            dot={series.length <= 60 ? { r: 1.5, fill: "var(--positive)" } : false}
            activeDot={{ r: 4 }}
            isAnimationActive={series.length <= 120}
          />
          <Tooltip
            cursor={{ stroke: "var(--line-strong)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DayStats;
              return (
                <div className="min-w-48 rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-md)]">
                  <p className="text-[12px] font-semibold text-ink">
                    {longDate(d.date)}
                  </p>

                  {d.score === 0 ? (
                    <p className="mt-1 text-[12px] text-muted">
                      {d.count > 0
                        ? `${d.count} solved, all unrated`
                        : "No activity"}
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-positive">
                        {d.score.toFixed(1)}
                      </p>
                      <div className="mt-2 space-y-0.5 border-t border-line pt-2">
                        {d.buckets.map((b) => (
                          <p
                            key={b.rating}
                            className="flex items-baseline justify-between gap-3 font-mono text-[11px] tabular-nums"
                          >
                            <span style={{ color: ratingColor(b.rating) }}>
                              {b.rating}
                            </span>
                            <span className="text-muted">
                              {b.count} &times; {Math.round(b.base)}
                            </span>
                          </p>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** The formula, spelled out, so the number is auditable rather than magic. */
export function ScoreFormula() {
  return (
    <div className="mt-3 rounded-xl bg-sunken px-3 py-2">
      <SectionLabel>how it is scored</SectionLabel>
      <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
        score = Σ<sub>r</sub> (100 &times; 2^((r&minus;800)/400)) &times; n
        <sub>r</sub>^{DAILY_SCORE_GAMMA}
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-faint">
        A problem is worth 100 points at 800 and doubles every 400 rating. The{" "}
        {DAILY_SCORE_GAMMA} exponent taxes repetition, so ten problems at one
        rating are worth about eight &mdash; a day spent widening beats a day
        spent grinding.
      </p>
    </div>
  );
}
