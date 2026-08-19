"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Layers, Search } from "lucide-react";
import { useCategoryIndex, useCategoryKeys, useSession } from "@/lib/queries";
import { useA2ojProgress } from "@/lib/use-a2oj-progress";
import { tallyKeys } from "@/lib/a2oj-status";
import { useCfSolveIndex } from "@/lib/use-a2oj-status";
import { ErrorState, PageHeader, PageShell } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function TopicsPage() {
  const { data, isLoading, error, refetch } = useCategoryIndex();
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const { countFor } = useA2ojProgress(handle);
  const { index: cf } = useCfSolveIndex(handle);
  const { data: keys } = useCategoryKeys(!!handle);

  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data?.categories ?? []).filter(
      (c) => !needle || c.name.toLowerCase().includes(needle),
    );
  }, [data, search]);

  return (
    <PageShell>
      <PageHeader
        title="Topics"
        description="A2OJ's category lists — the same DSA topics, spanning Codeforces, SPOJ, UVa and the ICPC archives."
      />

      {error && <ErrorState message={(error as Error).message} onRetry={refetch} />}

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-[128px] rounded-2xl" />
          ))}
        </div>
      )}

      {data && (
        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics"
            className="pl-9"
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => {
          const t = tallyKeys(keys?.[c.slug], cf, c.count, countFor(c.slug));
          const pct = c.count ? (t.solved / c.count) * 100 : 0;
          const attemptedPct = c.count ? (t.attempted / c.count) * 100 : 0;
          return (
            <Link key={c.slug} href={`/topics/${c.slug}`} className="group">
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-md)]">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug text-ink">
                    {c.name}
                  </p>
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft">
                    <Layers className="size-3.5 text-accent" />
                  </span>
                </div>

                <p className="mt-1.5 font-mono text-[11px] tabular-nums text-faint">
                  {c.count.toLocaleString()} problems
                </p>

                <div className="mt-2.5 flex flex-wrap gap-1">
                  {c.platforms.slice(0, 3).map((p) => (
                    <Badge key={p.name} variant="outline" size="sm">
                      {p.name} {p.n}
                    </Badge>
                  ))}
                </div>

                {t.solved + t.attempted > 0 && (
                  <div className="mt-3">
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
                        style={{
                          width: `${pct}%`,
                          backgroundColor: "var(--accent)",
                        }}
                      />
                    </div>
                    <p className="mt-1.5 flex items-baseline justify-between text-[11px]">
                      <span className="text-muted">
                        {t.solved} / {c.count.toLocaleString()}
                        {t.attempted > 0 && (
                          <span className="text-warning"> · {t.attempted} tried</span>
                        )}
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-muted">
                        {Math.round(pct)}%
                      </span>
                    </p>
                  </div>
                )}
              </Card>
            </Link>
          );
        })}
      </div>

      {data && shown.length === 0 && (
        <p className="py-16 text-center text-[13px] text-muted">
          No topics match.
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
