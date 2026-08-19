"use client";

import { useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCfProfile, useSession } from "@/lib/queries";
import {
  growthBand,
  rankFor,
  ratingColor,
  solveStreak,
  verdictColor,
  VERDICT_LABEL,
} from "@/lib/cf";
import {
  mentorVerdict,
  ratingTargets,
  topicPriorities,
  type Urgency,
} from "@/lib/mentor";
import {
  buildPeriods,
  compareWindows,
  resolveRange,
  suggestGranularity,
  tagRecency,
  trendSlope,
} from "@/lib/progression";
import { countByLocalDay, dailySeries, summarise } from "@/lib/daily";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { ErrorState, PageHeader, PageShell } from "@/components/layout/page";
import { Card, CardHeader, CardTitle, SectionLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { HandlePrompt } from "@/components/handle-prompt";
import { BandBars } from "@/components/dashboard/band-bars";
import {
  RangeControl,
  type RangeState,
} from "@/components/analytics/range-control";
import { DifficultyTrend } from "@/components/analytics/difficulty-trend";
import { BandMix } from "@/components/analytics/band-mix";
import {
  CompareHeading,
  PeriodCompare,
} from "@/components/analytics/period-compare";
import { TopicRecency } from "@/components/analytics/topic-recency";
import { ActivityCalendar } from "@/components/analytics/activity-calendar";
import {
  DailyScoreChart,
  ScoreFormula,
  ScoreTiles,
  SolvesPerDay,
  SolvesPerDayTiles,
} from "@/components/analytics/daily-charts";

const URGENCY_STYLE: Record<Urgency, { variant: "negative" | "warning" | "positive"; label: string }> = {
  critical: { variant: "negative", label: "critical" },
  developing: { variant: "warning", label: "developing" },
  solid: { variant: "positive", label: "solid" },
};

/**
 * States the chart's reading in words. A slope under ~2 rating points per period
 * is inside the noise of which problems happened to get solved, so it is reported
 * as flat rather than dressed up as progress.
 */
function TrendVerdict({
  slope,
  granularity,
  inBandRate,
  count,
  activePeriods,
  totalPeriods,
}: {
  slope: number | null;
  granularity: "week" | "month";
  inBandRate: number | null;
  count: number;
  activePeriods: number;
  totalPeriods: number;
}) {
  const per = granularity === "week" ? "week" : "month";

  let icon = <Minus className="size-3.5 text-faint" />;
  let headline = "Not enough data to call a trend";
  let tone = "text-muted";

  if (slope != null && count > 0) {
    if (slope >= 2) {
      icon = <TrendingUp className="size-3.5 text-positive" />;
      headline = `Difficulty climbing ~${Math.round(slope)} pts per ${per}`;
      tone = "text-positive";
    } else if (slope <= -2) {
      icon = <TrendingDown className="size-3.5 text-negative" />;
      headline = `Difficulty falling ~${Math.abs(Math.round(slope))} pts per ${per}`;
      tone = "text-negative";
    } else {
      headline = `Difficulty flat across the range`;
      tone = "text-warning";
    }
  }

  const facts = [
    `${count} solved`,
    `active in ${activePeriods}/${totalPeriods} ${per}s`,
    inBandRate != null ? `${inBandRate}% at the floor or above` : null,
  ].filter(Boolean);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-sunken px-3 py-2">
      <span className="flex items-center gap-1.5">
        {icon}
        <span className={cn("text-[12px] font-semibold", tone)}>{headline}</span>
      </span>
      <span className="font-mono text-[11px] tabular-nums text-faint">
        {facts.join(" · ")}
      </span>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const { data: profile, isLoading, error, refetch } = useCfProfile(handle);
  const now = useNow(60_000);

  const [range, setRange] = useState<RangeState>({
    range: "90d",
    granularity: "week",
    from: null,
    to: null,
  });
  // Null until the user picks a granularity, so a wide range defaults to months
  // instead of rendering 150 unreadable week ticks.
  const [grainTouched, setGrainTouched] = useState(false);

  const progression = useMemo(() => {
    if (!profile || now === null) return null;
    const solved = profile.stats.solved;

    // The preset span is anchored to the end of the window, not to now, so
    // supplying only an end date still yields a window of the selected length
    // rather than an inverted one.
    const to = range.to ? Date.parse(`${range.to}T23:59:59Z`) : now;
    if (!Number.isFinite(to)) return null;
    const from = range.from
      ? Date.parse(`${range.from}T00:00:00Z`)
      : resolveRange(range.range, solved, to).from;
    if (!Number.isFinite(from) || to <= from) return null;

    const granularity = grainTouched
      ? range.granularity
      : suggestGranularity(from, to);

    const periods = buildPeriods(solved, {
      granularity,
      from,
      to,
      ratingHistory: profile.ratingHistory,
    });
    const { current, previous } = compareWindows(
      solved,
      from,
      to,
      profile.ratingHistory,
    );

    // Slope over periods that actually had rated solves, so a gap week doesn't
    // register as a collapse in difficulty.
    const slope = trendSlope(periods.map((p) => p.avgRating));

    // Day resolution, over the same window: the weekly view shows the trend, this
    // shows whether the days behind it were consistent or three big sessions.
    const series = dailySeries(solved, from, to);

    return {
      granularity,
      periods,
      current,
      previous,
      slope,
      recency: tagRecency(solved, now),
      activePeriods: periods.filter((p) => p.count > 0).length,
      series,
      summary: summarise(series),
    };
  }, [profile, now, range, grainTouched]);

  // Independent of the range control — the calendar carries its own month nav.
  const calendarCounts = useMemo(
    () => countByLocalDay(profile?.stats.solved ?? []),
    [profile],
  );

  const analysis = useMemo(() => {
    if (!profile) return null;
    const rating = profile.user.rating ?? 0;
    const { byTag, byRating, solved } = profile.stats;
    const firstTry = solved.filter((p) => p.attempts === 1).length;
    const firstTryRate = solved.length
      ? Math.round((firstTry / solved.length) * 100)
      : 0;

    return {
      rating,
      rank: rankFor(rating),
      band: growthBand(rating),
      topics: topicPriorities(byTag, rating),
      targets: ratingTargets(byRating, rating),
      verdict: mentorVerdict({
        rating,
        solved,
        byTag,
        byRating,
        ratedRounds: profile.ratingHistory.length,
        streak: solveStreak(profile.stats.byDate),
        firstTryRate,
      }),
      // Radar needs a comparable scale, so counts are capped at the mastery
      // threshold rather than plotted raw.
      radar: topicPriorities(byTag, rating).map((t) => ({
        topic: t.topic.length > 14 ? `${t.topic.slice(0, 12)}…` : t.topic,
        value: Math.min(100, t.count),
        raw: t.count,
      })),
      verdicts: Object.entries(
        profile.submissions.reduce<Record<string, number>>((acc, s) => {
          const v = s.verdict ?? "TESTING";
          acc[v] = (acc[v] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .map(([verdict, count]) => ({ verdict, count }))
        .sort((a, b) => b.count - a.count),
      languages: Object.entries(profile.stats.languages)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }, [profile]);

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Analytics" />
        <HandlePrompt />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        description="Where your solving is going, not just what it adds up to. Every number is traceable to a submission."
      />

      {error && <ErrorState message={(error as Error).message} onRetry={refetch} />}

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      )}

      {profile && analysis && (
        <div className="space-y-4">
          {/* Verdict */}
          <Card
            className={cn(
              analysis.verdict.tone === "negative" && "border-negative/30",
              analysis.verdict.tone === "warning" && "border-warning/30",
              analysis.verdict.tone === "positive" && "border-positive/30",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl"
                style={{
                  backgroundColor: `color-mix(in srgb, ${
                    analysis.verdict.tone === "positive"
                      ? "var(--positive)"
                      : analysis.verdict.tone === "warning"
                        ? "var(--warning)"
                        : "var(--negative)"
                  } 12%, transparent)`,
                }}
              >
                {analysis.verdict.tone === "positive" ? (
                  <CheckCircle2 className="size-4 text-positive" />
                ) : (
                  <AlertTriangle
                    className={cn(
                      "size-4",
                      analysis.verdict.tone === "warning"
                        ? "text-warning"
                        : "text-negative",
                    )}
                  />
                )}
              </span>
              <div className="min-w-0">
                <CardTitle>{analysis.verdict.headline}</CardTitle>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  {analysis.verdict.detail}
                </p>
                <ul className="mt-3 space-y-2">
                  {analysis.verdict.actions.map((a, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                      <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-accent" />
                      <span className="text-ink">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* Progression over time */}
          {progression && (
            <>
              <Card>
                <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle>Difficulty over time</CardTitle>
                    <p className="mt-0.5 text-[13px] text-muted">
                      Bars are how much you solved; the line is how hard it was.
                      The green band is the growth floor you were owed at the
                      time.
                    </p>
                  </div>
                  <RangeControl
                    state={{ ...range, granularity: progression.granularity }}
                    onChange={(next) => {
                      if (next.granularity !== progression.granularity) {
                        setGrainTouched(true);
                      }
                      setRange(next);
                    }}
                    className="shrink-0"
                  />
                </CardHeader>

                <TrendVerdict
                  slope={progression.slope}
                  granularity={progression.granularity}
                  inBandRate={progression.current.inBandRate}
                  count={progression.current.count}
                  activePeriods={progression.activePeriods}
                  totalPeriods={progression.periods.length}
                />

                <DifficultyTrend
                  periods={progression.periods}
                  granularity={progression.granularity}
                />
              </Card>

              <Card>
                <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle>Problems solved per day</CardTitle>
                    <p className="mt-0.5 text-[13px] text-muted">
                      One bar per day across the window, blanks included, so the
                      quiet stretches show.
                    </p>
                  </div>
                  <SolvesPerDayTiles summary={progression.summary} />
                </CardHeader>

                <SolvesPerDay series={progression.series} />

                <p className="mt-2 text-[11px] text-faint">
                  {progression.summary.activeDays} of{" "}
                  {progression.summary.totalDays} days active ·{" "}
                  {progression.summary.totalProblems} problems
                </p>
              </Card>

              <Card>
                <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle>Daily score</CardTitle>
                    <p className="mt-0.5 text-[13px] text-muted">
                      Volume weighted by difficulty, so a hard problem outranks
                      three easy ones.
                    </p>
                  </div>
                  <ScoreTiles summary={progression.summary} />
                </CardHeader>

                <DailyScoreChart series={progression.series} />
                <ScoreFormula />
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Practice level mix</CardTitle>
                      <p className="mt-0.5 text-[13px] text-muted">
                        Share of each period spent below, inside and above the
                        band that applied then.
                      </p>
                    </div>
                  </CardHeader>
                  <BandMix
                    periods={progression.periods}
                    granularity={progression.granularity}
                  />
                </Card>

                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>This window vs last</CardTitle>
                      <p className="mt-0.5 text-[13px] text-muted">
                        The same span, immediately before the one selected.
                      </p>
                    </div>
                    <CompareHeading previous={progression.previous} />
                  </CardHeader>
                  <PeriodCompare
                    current={progression.current}
                    previous={progression.previous}
                  />
                </Card>
              </div>
            </>
          )}

          {now !== null && (
            <ActivityCalendar counts={calendarCounts} now={now} />
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Topic radar */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Topic coverage</CardTitle>
                  <p className="mt-0.5 text-[13px] text-muted">
                    The topics that decide {analysis.rank.name} rounds, capped at
                    100 solves.
                  </p>
                </div>
              </CardHeader>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={analysis.radar} outerRadius="72%">
                    <PolarGrid stroke="var(--line)" />
                    <PolarAngleAxis
                      dataKey="topic"
                      tick={{ fill: "var(--muted)", fontSize: 10 }}
                    />
                    <Radar
                      dataKey="value"
                      stroke="var(--accent)"
                      fill="var(--accent)"
                      fillOpacity={0.22}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as { topic: string; raw: number };
                        return (
                          <div className="rounded-lg border border-line bg-surface px-2.5 py-1.5 shadow-[var(--shadow-md)]">
                            <p className="text-[12px] font-medium text-ink">
                              {d.topic}
                            </p>
                            <p className="font-mono text-[11px] tabular-nums text-muted">
                              {d.raw} solved
                            </p>
                          </div>
                        );
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Priorities */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Priority order</CardTitle>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Work top-down; the ranking is by band, not by feel.
                  </p>
                </div>
              </CardHeader>
              <ul className="space-y-2">
                {analysis.topics.map((t) => {
                  const style = URGENCY_STYLE[t.urgency];
                  return (
                    <li key={t.topic}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="w-4 shrink-0 font-mono text-[11px] tabular-nums text-faint">
                            {t.priority}
                          </span>
                          <span className="truncate text-[13px] font-medium text-ink">
                            {t.topic}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="font-mono text-[11px] tabular-nums text-muted">
                            {t.count}
                          </span>
                          <Badge variant={style.variant} size="sm">
                            {style.label}
                          </Badge>
                        </span>
                      </div>
                      <Progress
                        value={Math.min(100, t.count)}
                        size="sm"
                        className="mt-1.5"
                        color={
                          t.urgency === "solid"
                            ? "var(--positive)"
                            : t.urgency === "critical"
                              ? "var(--negative)"
                              : "var(--warning)"
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          {/* Topic decay */}
          {progression && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Topic recency</CardTitle>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Longest untouched first. Coverage says what you have seen;
                    this says what you are forgetting.
                  </p>
                </div>
                <SectionLabel>days since</SectionLabel>
              </CardHeader>
              <TopicRecency tags={progression.recency} />
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Rating targets */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Bucket targets</CardTitle>
                  <p className="mt-0.5 text-[13px] text-muted">
                    200 solves marks a bucket covered.
                  </p>
                </div>
              </CardHeader>
              <ul className="space-y-2.5">
                {analysis.targets.map((t) => (
                  <li key={t.rating}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className="font-mono text-[12px] font-semibold tabular-nums"
                        style={{ color: ratingColor(t.rating) }}
                      >
                        {t.rating}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-muted">
                        {t.count}
                        <span className="text-faint">/{t.target}</span>
                      </span>
                    </div>
                    <Progress
                      value={t.pct}
                      size="sm"
                      className="mt-1"
                      color={ratingColor(t.rating)}
                    />
                  </li>
                ))}
              </ul>
            </Card>

            {/* Verdict mix */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Verdict mix</CardTitle>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Last {profile.submissions.length} submissions.
                  </p>
                </div>
              </CardHeader>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analysis.verdicts}
                      dataKey="count"
                      nameKey="verdict"
                      innerRadius="52%"
                      outerRadius="82%"
                      strokeWidth={0}
                    >
                      {analysis.verdicts.map((v) => (
                        <Cell key={v.verdict} fill={verdictColor(v.verdict)} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as { verdict: string; count: number };
                        return (
                          <div className="rounded-lg border border-line bg-surface px-2.5 py-1.5 shadow-[var(--shadow-md)]">
                            <p className="text-[12px] font-medium text-ink">
                              {VERDICT_LABEL[d.verdict] ?? d.verdict}
                            </p>
                            <p className="font-mono text-[11px] tabular-nums text-muted">
                              {d.count}
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1">
                {analysis.verdicts.slice(0, 4).map((v) => (
                  <li
                    key={v.verdict}
                    className="flex items-center justify-between gap-2 text-[12px]"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: verdictColor(v.verdict) }}
                      />
                      <span className="text-muted">
                        {VERDICT_LABEL[v.verdict] ?? v.verdict}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums text-ink">
                      {v.count}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Languages + full distribution */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Languages</CardTitle>
                  <p className="mt-0.5 text-[13px] text-muted">
                    By submission count.
                  </p>
                </div>
              </CardHeader>
              <ul className="space-y-2">
                {analysis.languages.map((l) => {
                  const top = analysis.languages[0].count;
                  return (
                    <li key={l.name}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[12px] text-ink">
                          {l.name}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-muted">
                          {l.count}
                        </span>
                      </div>
                      <Progress
                        value={(l.count / top) * 100}
                        size="sm"
                        className="mt-1"
                      />
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-sunken px-2.5 py-2">
                <Info className="mt-0.5 size-3.5 shrink-0 text-faint" />
                <p className="text-[11px] leading-snug text-muted">
                  On Codeforces, submit Python as PyPy 3-64 — it is several times
                  faster than CPython on tight loops.
                </p>
              </div>
            </Card>
          </div>

          {/* Full distribution */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Full rating distribution</CardTitle>
                <p className="mt-0.5 text-[13px] text-muted">
                  Every bucket you have solved in, with the growth band marked.
                </p>
              </div>
              <SectionLabel>
                {analysis.band[0]}&ndash;{analysis.band[1]}
              </SectionLabel>
            </CardHeader>
            <BandBars byRating={profile.stats.byRating} band={analysis.band} />
          </Card>
        </div>
      )}
    </PageShell>
  );
}
