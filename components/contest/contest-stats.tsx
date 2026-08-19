"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, Info, Target } from "lucide-react";
import { contestAggregate, roundSeries, unsolvedTags } from "@/lib/contest-stats";
import { ratingColor } from "@/lib/cf";
import { formatDuration, pluralize } from "@/lib/utils";
import type { ContestResult } from "@/lib/types";
import { Card, CardHeader, CardTitle, SectionLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ContestStats({ history }: { history: ContestResult[] }) {
  const agg = useMemo(() => contestAggregate(history), [history]);
  const series = useMemo(() => roundSeries(history), [history]);
  const tags = useMemo(() => unsolvedTags(history).slice(0, 6), [history]);

  // A slot seen once carries no signal but takes a full row; one long custom set
  // would otherwise push six 0/1 rows into the chart.
  const slots = agg.slots.filter((s) => s.attempts >= 2);
  const thin = agg.slots.length - slots.length;

  if (!history.length) return null;

  const tiles = [
    {
      label: "Rounds",
      value: String(agg.rounds),
      color: "var(--ink)",
      hint: "archived",
    },
    {
      label: "Solve rate",
      value: `${Math.round(agg.solveRate * 100)}%`,
      color: agg.solveRate >= 0.6 ? "var(--positive)" : "var(--warning)",
      hint: `${agg.problemsSolved}/${agg.problemsTotal} problems`,
    },
    {
      label: "Per round",
      value: agg.avgSolved.toFixed(1),
      color: "var(--accent)",
      hint: "solved on average",
    },
    {
      label: "Deepest slot",
      value: agg.deepest ?? "—",
      color: "var(--positive)",
      hint: "furthest letter solved",
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Across all rounds</CardTitle>
            <p className="mt-0.5 text-[13px] text-muted">
              {agg.detailedRounds < agg.rounds
                ? `${agg.detailedRounds} of ${agg.rounds} rounds carry per-problem detail; slot analysis uses those.`
                : "Every round carries per-problem detail."}
            </p>
          </div>
          <SectionLabel>{pluralize(agg.totalPenalty, "penalty min")}</SectionLabel>
        </CardHeader>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label}>
              <SectionLabel>{t.label}</SectionLabel>
              <p
                className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums"
                style={{ color: t.color }}
              >
                {t.value}
              </p>
              <p className="mt-1 text-[11px] text-faint">{t.hint}</p>
            </div>
          ))}
        </div>

        {agg.wall && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2.5">
            <Target className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink">
                Your wall is {agg.wall.index}
                {agg.wall.avgRating ? ` (~${agg.wall.avgRating})` : ""}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                Solved {agg.wall.solved} of {agg.wall.attempts} attempts. Rounds
                end here, so this rating is the one worth practising — not the
                letters you already clear.
              </p>
              {agg.wall.avgRating ? (
                <Link
                  href={`/practice?min=${agg.wall.avgRating}&max=${agg.wall.avgRating + 200}`}
                  className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline"
                >
                  Practise {agg.wall.avgRating}&ndash;{agg.wall.avgRating + 200}
                  <ArrowUpRight className="size-3" />
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Per-slot performance */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>By slot</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted">
                Solve rate and the median minute it fell.
              </p>
            </div>
          </CardHeader>

          {slots.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">
              {agg.slots.length
                ? "Every slot has been seen only once — no slot has enough attempts to read yet."
                : "No per-problem detail recorded yet. Rounds archived from now on will appear here."}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {slots.map((s) => {
                const pct = Math.round(s.solveRate * 100);
                const color =
                  s.solveRate >= 0.6
                    ? "var(--positive)"
                    : s.solveRate >= 0.3
                      ? "var(--warning)"
                      : "var(--negative)";
                return (
                  <li key={s.index}>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold"
                        style={{
                          color: ratingColor(s.avgRating ?? 0),
                          backgroundColor: `color-mix(in srgb, ${ratingColor(s.avgRating ?? 0)} 14%, transparent)`,
                        }}
                      >
                        {s.index}
                      </span>
                      <div className="relative h-4 grow overflow-hidden rounded-md bg-sunken">
                        <div
                          className="h-full rounded-md transition-[width] duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted">
                        {s.solved}/{s.attempts}
                      </span>
                    </div>
                    <p className="mt-1 pl-8.5 font-mono text-[10px] tabular-nums text-faint">
                      {pct}% solved
                      {s.avgRating ? ` · ~${s.avgRating}` : ""}
                      {s.medianSolveSeconds != null
                        ? ` · median ${formatDuration(s.medianSolveSeconds)} in`
                        : ""}
                      {s.wrongAttempts
                        ? ` · ${pluralize(s.wrongAttempts, "wrong try")}`
                        : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          {thin > 0 && (
            <p className="mt-3 text-[11px] text-faint">
              {pluralize(thin, "slot")} seen only once{" "}
              {thin === 1 ? "is" : "are"} hidden — one appearance is not evidence.
            </p>
          )}
        </Card>

        {/* Trend + what went unsolved */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Round by round</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted">
                Share of the set solved, oldest first.
              </p>
            </div>
          </CardHeader>

          {series.length < 2 ? (
            <p className="py-6 text-center text-[13px] text-muted">
              One round so far — a trend needs at least two.
            </p>
          ) : (
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={series}
                  margin={{ top: 6, right: 8, bottom: 0, left: -26 }}
                >
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--faint)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 50, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: "var(--faint)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: "var(--accent)" }}
                    activeDot={{ r: 4 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as (typeof series)[number];
                      return (
                        <div className="max-w-56 rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-md)]">
                          <p className="text-[12px] font-medium leading-snug text-ink">
                            {d.name}
                          </p>
                          <p className="mt-1 font-mono text-[11px] tabular-nums text-faint">
                            {d.label}
                            {d.avgRating ? ` · avg ${d.avgRating}` : ""}
                          </p>
                          <p className="mt-1.5 font-mono text-[12px] font-semibold tabular-nums text-ink">
                            {d.solved}/{d.total} &middot; {d.rate}%
                          </p>
                          {d.penaltyMinutes > 0 && (
                            <p className="font-mono text-[11px] tabular-nums text-warning">
                              {d.penaltyMinutes}m penalty
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {tags.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <SectionLabel className="mb-2">
                Tags on problems left unsolved
              </SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Link key={t.tag} href={`/practice?tags=${encodeURIComponent(t.tag)}`}>
                    <Badge variant="outline" size="sm" className="hover:border-accent/50">
                      {t.tag}
                      <span className="font-mono tabular-nums text-faint">
                        {t.count}
                      </span>
                      <ArrowUpRight className="size-2.5" />
                    </Badge>
                  </Link>
                ))}
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-faint">
                <Info className="mt-0.5 size-3 shrink-0" />
                Under a clock the topic you fail to recognise costs more than one
                you are merely slow at.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
