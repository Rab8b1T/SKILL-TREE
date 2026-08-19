"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ListOrdered, Search } from "lucide-react";
import { useLadderIndex, useLadderKeys, useSession } from "@/lib/queries";
import { useA2ojProgress } from "@/lib/use-a2oj-progress";
import { tallyKeys } from "@/lib/a2oj-status";
import { useCfSolveIndex } from "@/lib/use-a2oj-status";
import { ratingColor } from "@/lib/cf";
import { PageHeader, PageShell, ErrorState } from "@/components/layout/page";
import { Card, SectionLabel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";

type Filter = "all" | "started" | "untouched";

export default function LaddersPage() {
  const { data, isLoading, error, refetch } = useLadderIndex();
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const { countFor } = useA2ojProgress(handle);
  const { index: cf } = useCfSolveIndex(handle);
  // Only worth its 10 KB once there is a solve set to compare against.
  const { data: keys } = useLadderKeys(!!handle);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const tallies = useMemo(() => {
    const map = new Map<string, ReturnType<typeof tallyKeys>>();
    for (const l of data?.ladders ?? []) {
      map.set(l.slug, tallyKeys(keys?.[l.slug], cf, l.count, countFor(l.slug)));
    }
    return map;
  }, [data, keys, cf, countFor]);

  const groups = useMemo(() => {
    if (!data) return [];
    const needle = search.trim().toLowerCase();
    const map = new Map<string, typeof data.ladders>();
    for (const ladder of data.ladders) {
      if (needle && !ladder.name.toLowerCase().includes(needle)) continue;
      const t = tallies.get(ladder.slug);
      const started = !!t && t.solved + t.attempted > 0;
      if (filter === "started" && !started) continue;
      if (filter === "untouched" && started) continue;
      const list = map.get(ladder.group) ?? [];
      list.push(ladder);
      map.set(ladder.group, list);
    }
    return [...map.entries()];
  }, [data, search, filter, tallies]);

  return (
    <PageShell>
      <PageHeader
        title="A2OJ ladders"
        description="Structured Codeforces sets in ascending difficulty. Work one ladder to completion rather than sampling several."
      />

      {error && <ErrorState message={(error as Error).message} onRetry={refetch} />}

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[132px] rounded-2xl" />
          ))}
        </div>
      )}

      {data && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative grow">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ladders"
              className="pl-9"
            />
          </div>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "started", label: "Started" },
              { value: "untouched", label: "Untouched" },
            ]}
          />
        </div>
      )}

      <div className="space-y-7">
        {groups.map(([group, ladders]) => (
          <section key={group}>
            <SectionLabel className="mb-3">{group}</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ladders.map((l) => {
                const t =
                  tallies.get(l.slug) ??
                  ({ solved: 0, attempted: 0, total: l.count } as const);
                const pct = l.count ? (t.solved / l.count) * 100 : 0;
                const attemptedPct = l.count ? (t.attempted / l.count) * 100 : 0;
                const color = ratingColor(l.avgRating ?? undefined);
                return (
                  <Link key={l.slug} href={`/ladders/${l.slug}`} className="group">
                    <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-md)]">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug text-ink">
                          {l.name}
                        </p>
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-lg"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                          }}
                        >
                          <ListOrdered className="size-3.5" style={{ color }} />
                        </span>
                      </div>

                      <p className="mt-1.5 font-mono text-[11px] tabular-nums text-faint">
                        {l.count} problems
                        {l.minRating
                          ? ` · ${l.minRating}–${l.maxRating}`
                          : ""}
                      </p>

                      <div className="mt-3">
                        {/* Attempted sits behind solved so a ladder already
                            under way reads differently from an untouched one. */}
                        <div className="relative h-1.5 overflow-hidden rounded-full bg-sunken">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
                            style={{
                              width: `${Math.min(100, pct + attemptedPct)}%`,
                              backgroundColor: "var(--warning)",
                              opacity: 0.5,
                            }}
                          />
                          <div
                            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <p className="mt-1.5 flex items-baseline justify-between text-[11px]">
                          <span className="text-muted">
                            {t.solved} / {l.count}
                            {t.attempted > 0 && (
                              <span className="text-warning">
                                {" "}
                                · {t.attempted} tried
                              </span>
                            )}
                          </span>
                          <span
                            className="font-mono font-semibold tabular-nums"
                            style={{ color: pct > 0 ? color : "var(--faint)" }}
                          >
                            {Math.round(pct)}%
                          </span>
                        </p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {data && groups.length === 0 && (
        <p className="py-16 text-center text-[13px] text-muted">
          No ladders match.
        </p>
      )}

      {data && (
        <p className="mt-8 text-center text-[11px] text-faint">
          Scraped from a2oj.com · last updated{" "}
          {new Date(data.lastUpdated).toLocaleDateString()}
        </p>
      )}
    </PageShell>
  );
}
