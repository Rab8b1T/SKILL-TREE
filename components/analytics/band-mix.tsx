"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Granularity, Period } from "@/lib/progression";

/**
 * How each period's practice split against the growth band *that applied at the
 * time*, as a share rather than a count — so a heavy week and a light week are
 * comparable and the only thing the shape shows is level, not volume.
 *
 * Judging against the historical band is the point: measuring old practice
 * against today's band would make every past month look bad purely because the
 * rating went up.
 */
export function BandMix({
  periods,
  granularity,
}: {
  periods: Period[];
  granularity: Granularity;
}) {
  const data = useMemo(
    () =>
      periods.map((p) => {
        const total = p.belowBand + p.inBand + p.aboveBand;
        const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
        return {
          label: p.label,
          total,
          below: pct(p.belowBand),
          inBand: pct(p.inBand),
          above: pct(p.aboveBand),
          belowN: p.belowBand,
          inBandN: p.inBand,
          aboveN: p.aboveBand,
          band: p.band,
        };
      }),
    [periods],
  );

  const rated = data.filter((d) => d.total > 0).length;

  if (rated === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-muted">
        Needs at least one rated round, so the band that applied at the time is
        known.
      </p>
    );
  }

  return (
    <>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -26 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--faint)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
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

            <Area
              type="monotone"
              dataKey="below"
              stackId="mix"
              stroke="var(--negative)"
              strokeWidth={1}
              fill="var(--negative)"
              fillOpacity={0.32}
            />
            <Area
              type="monotone"
              dataKey="inBand"
              stackId="mix"
              stroke="var(--positive)"
              strokeWidth={1}
              fill="var(--positive)"
              fillOpacity={0.42}
            />
            <Area
              type="monotone"
              dataKey="above"
              stackId="mix"
              stroke="var(--accent)"
              strokeWidth={1}
              fill="var(--accent)"
              fillOpacity={0.32}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return (
                  <div className="min-w-48 rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-md)]">
                    <p className="text-[12px] font-semibold text-ink">
                      {granularity === "week" ? `Week of ${d.label}` : d.label}
                    </p>
                    {d.total === 0 ? (
                      <p className="mt-1.5 text-[12px] text-muted">
                        No rated solves.
                      </p>
                    ) : (
                      <>
                        {d.band && (
                          <p className="mt-0.5 font-mono text-[10px] tabular-nums text-faint">
                            band {d.band[0]}&ndash;{d.band[1]}
                          </p>
                        )}
                        <ul className="mt-2 space-y-1">
                          <Legend
                            color="var(--negative)"
                            label="Below band"
                            pct={d.below}
                            n={d.belowN}
                          />
                          <Legend
                            color="var(--positive)"
                            label="In band"
                            pct={d.inBand}
                            n={d.inBandN}
                          />
                          <Legend
                            color="var(--accent)"
                            label="Above band"
                            pct={d.above}
                            n={d.aboveN}
                          />
                        </ul>
                      </>
                    )}
                  </div>
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {[
          { color: "var(--negative)", label: "Below the band — not progress" },
          { color: "var(--positive)", label: "In band — where growth happens" },
          { color: "var(--accent)", label: "Above — stretch" },
        ].map((l) => (
          <li key={l.label} className="flex items-center gap-1.5 text-[11px] text-muted">
            <span
              className="size-2 shrink-0 rounded-sm"
              style={{ backgroundColor: l.color, opacity: 0.75 }}
            />
            {l.label}
          </li>
        ))}
      </ul>
    </>
  );
}

function Legend({
  color,
  label,
  pct,
  n,
}: {
  color: string;
  label: string;
  pct: number;
  n: number;
}) {
  return (
    <li className="flex items-center justify-between gap-4 text-[11px]">
      <span className="flex items-center gap-1.5">
        <span
          className="size-2 shrink-0 rounded-sm"
          style={{ backgroundColor: color }}
        />
        <span className="text-muted">{label}</span>
      </span>
      <span className="font-mono tabular-nums text-ink">
        {pct}% <span className="text-faint">({n})</span>
      </span>
    </li>
  );
}
