"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Crosshair,
  Flame,
  ListOrdered,
  RefreshCw,
  Swords,
  Target,
  TrendingUp,
} from "lucide-react";
import { useCfProfile, useSession, useUpsolveData } from "@/lib/queries";
import {
  BAND_FOCUS,
  growthBand,
  handleUrl,
  nextRankAt,
  rankFor,
  solveStreak,
} from "@/lib/cf";
import { pluralize } from "@/lib/utils";
import { useNow } from "@/lib/use-now";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
} from "@/components/layout/page";
import { Card, CardHeader, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { HandlePrompt } from "@/components/handle-prompt";
import { StatTile } from "@/components/dashboard/stat-tile";
import { RatingChart } from "@/components/dashboard/rating-chart";
import { BandBars } from "@/components/dashboard/band-bars";
import { TagGapList } from "@/components/dashboard/tag-gap-list";
import { SolveHeatmap } from "@/components/dashboard/solve-heatmap";
import { RecentVerdicts } from "@/components/dashboard/recent-verdicts";

export default function DashboardPage() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const { data: profile, isLoading, error, refetch, isFetching } =
    useCfProfile(handle);
  const { data: upsolve } = useUpsolveData(handle);

  const openUpsolves = useMemo(
    () => (upsolve?.entries ?? []).filter((e) => e.status === "open").length,
    [upsolve],
  );

  // Read the clock from the shared ticker; Date.now() during render is impure
  // and would drift between renders of the same data.
  const now = useNow(60_000);

  const derived = useMemo(() => {
    if (!profile || now === null) return null;
    const rating = profile.user.rating ?? 0;
    const rank = rankFor(rating);
    const next = nextRankAt(rating);
    const band = growthBand(rating);
    const streak = solveStreak(profile.stats.byDate);

    const weekAgo = now - 7 * 86_400_000;
    const solvedThisWeek = profile.stats.solved.filter(
      (p) => p.solvedAt >= weekAgo,
    ).length;

    const inBand = profile.stats.solved.filter(
      (p) => p.rating >= band[0] && p.rating <= band[1],
    ).length;

    const firstTry = profile.stats.solved.filter((p) => p.attempts === 1).length;
    const accuracy = profile.stats.solved.length
      ? Math.round((firstTry / profile.stats.solved.length) * 100)
      : 0;

    return { rating, rank, next, band, streak, solvedThisWeek, inBand, accuracy };
  }, [profile, now]);

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader
          title={`Welcome, ${session?.user?.username ?? "there"}`}
          description="One more step before anything can be tracked."
        />
        <HandlePrompt />
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <PageHeader
        title="Dashboard"
        description={
          <>
            Live from Codeforces for{" "}
            <a
              href={handleUrl(handle)}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-ink hover:underline"
            >
              {handle}
            </a>
          </>
        }
        actions={
          <>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className={isFetching ? "animate-spin" : undefined} />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button asChild variant="accent">
              <Link href="/practice">
                <Target />
                Practice
              </Link>
            </Button>
          </>
        }
      />

      {error && (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      )}

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-[132px] rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <Skeleton className="h-[300px] rounded-2xl" />
        </div>
      )}

      {profile && derived && (
        <div className="space-y-4">
          {/* Rating hero */}
          <Card className="overflow-hidden" flush>
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="grid size-16 shrink-0 place-items-center rounded-2xl text-xl font-bold"
                  style={{
                    color: derived.rank.color,
                    backgroundColor: `color-mix(in srgb, ${derived.rank.color} 14%, transparent)`,
                  }}
                >
                  {derived.rank.short}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span
                      className="font-mono text-3xl font-bold leading-none tabular-nums"
                      style={{ color: derived.rank.color }}
                    >
                      {derived.rating || "unrated"}
                    </span>
                    <span className="text-sm font-medium text-muted">
                      {derived.rank.name}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] text-muted">
                    {derived.next ? (
                      <>
                        <span className="font-semibold text-ink">
                          {derived.next.needed}
                        </span>{" "}
                        to {derived.next.rank.name}
                      </>
                    ) : (
                      "Top rank reached"
                    )}
                    {profile.user.maxRating ? (
                      <>
                        {" "}
                        &middot; peak{" "}
                        <span className="font-mono tabular-nums">
                          {profile.user.maxRating}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="sm:max-w-sm">
                <SectionLabel>What this band tests</SectionLabel>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  {BAND_FOCUS[derived.rank.name]}
                </p>
              </div>
            </div>

            <div className="border-t border-line bg-elevated px-5 py-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
                <span className="text-muted">
                  Practice band{" "}
                  <span className="font-mono font-semibold text-ink tabular-nums">
                    {derived.band[0]}&ndash;{derived.band[1]}
                  </span>
                </span>
                <span className="text-muted">
                  <span className="font-semibold text-ink">{derived.inBand}</span>{" "}
                  solved in band
                </span>
                <span className="text-muted">
                  <span className="font-semibold text-ink">
                    {profile.ratingHistory.length}
                  </span>{" "}
                  rated {profile.ratingHistory.length === 1 ? "round" : "rounds"}
                </span>
                {openUpsolves > 0 && (
                  <Link href="/upsolve">
                    <Badge variant="warning">
                      {pluralize(openUpsolves, "open upsolve")}
                    </Badge>
                  </Link>
                )}
              </div>
            </div>
          </Card>

          {/* Headline stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Solved"
              value={profile.stats.solved.length}
              sub={`${derived.solvedThisWeek} in the last 7 days`}
              icon={CheckCircle2}
              color="var(--positive)"
            />
            <StatTile
              label="Streak"
              value={derived.streak}
              sub={derived.streak === 1 ? "day" : "days in a row"}
              icon={Flame}
              color="var(--warning)"
            />
            <StatTile
              label="First-try rate"
              value={`${derived.accuracy}%`}
              sub={`${profile.stats.wastedSubmissions} wasted submissions`}
              icon={Crosshair}
              color={
                derived.accuracy >= 70 ? "var(--positive)" : "var(--negative)"
              }
            />
            <StatTile
              label="Submissions"
              value={profile.stats.totalSubmissions}
              sub={`${profile.stats.acceptedSubmissions} accepted`}
              icon={Activity}
              color="var(--accent)"
            />
          </div>

          {/* Rating trajectory */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Rating</CardTitle>
                <p className="mt-0.5 text-[13px] text-muted">
                  Dashed lines mark rank boundaries.
                </p>
              </div>
              <Badge variant="accent" dot="var(--accent)">
                <TrendingUp className="size-3" />
                {profile.ratingHistory.length
                  ? `${profile.ratingHistory.at(-1)!.newRating - profile.ratingHistory.at(-1)!.oldRating >= 0 ? "+" : ""}${
                      profile.ratingHistory.at(-1)!.newRating -
                      profile.ratingHistory.at(-1)!.oldRating
                    } last round`
                  : "No rounds yet"}
              </Badge>
            </CardHeader>
            {profile.ratingHistory.length ? (
              <RatingChart history={profile.ratingHistory} />
            ) : (
              <EmptyState
                icon={Swords}
                title="No rated rounds yet"
                description="Rating only moves in contests. A virtual is good practice, but only a live round changes the number."
              />
            )}
          </Card>

          {/* Consistency */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Consistency</CardTitle>
                <p className="mt-0.5 text-[13px] text-muted">
                  An empty column is a skipped week.
                </p>
              </div>
            </CardHeader>
            <SolveHeatmap byDate={profile.stats.byDate} />
          </Card>

          {/* Bands, gaps, verdicts */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Solves by rating</CardTitle>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Volume below the band isn&apos;t progress.
                  </p>
                </div>
              </CardHeader>
              <BandBars byRating={profile.stats.byRating} band={derived.band} />
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Weakest tags</CardTitle>
                  <p className="mt-0.5 text-[13px] text-muted">
                    In-band solves at {derived.band[0]}+.
                  </p>
                </div>
              </CardHeader>
              <TagGapList solved={profile.stats.solved} floor={derived.band[0]} />
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Recent verdicts</CardTitle>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Newest first, straight from the API.
                  </p>
                </div>
              </CardHeader>
              <RecentVerdicts submissions={profile.submissions} />
            </Card>
          </div>

          {/* Jump-off points */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                href: "/practice",
                icon: Target,
                title: "Pick problems",
                body: `Unsolved, in your ${derived.band[0]}–${derived.band[1]} band.`,
              },
              {
                href: "/contest",
                icon: Swords,
                title: "Virtual contest",
                body: "Full clock, real scoring and penalties.",
              },
              {
                href: "/ladders",
                icon: ListOrdered,
                title: "A2OJ ladders",
                body: "Structured sets by division and topic.",
              },
            ].map(({ href, icon: Icon, title, body }) => (
              <Link key={href} href={href} className="group">
                <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-md)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-accent-soft">
                    <Icon className="size-4 text-accent" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
                  <p className="mt-1 text-[13px] leading-snug text-muted">{body}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
