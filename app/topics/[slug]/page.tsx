"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCategory, useSession } from "@/lib/queries";
import { useA2ojStatus } from "@/lib/use-a2oj-status";
import { ErrorState, PageHeader, PageShell } from "@/components/layout/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  A2ojProblemList,
  A2ojProgressCard,
} from "@/components/a2oj/problem-list";

export default function TopicDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error, refetch } = useCategory(slug);
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const { statusOf, toggle, cf } = useA2ojStatus(handle, slug);

  const problems = useMemo(() => data?.problems ?? [], [data]);

  const solvedCount = useMemo(
    () => problems.filter((p) => statusOf(p).state === "solved").length,
    [problems, statusOf],
  );

  return (
    <PageShell width="narrow">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/topics">
          <ArrowLeft />
          All topics
        </Link>
      </Button>

      <PageHeader
        title={data?.name ?? "Topic"}
        description={
          problems.length
            ? `${solvedCount} of ${problems.length.toLocaleString()} solved`
            : "Loading…"
        }
      />

      {error && <ErrorState message={(error as Error).message} onRetry={refetch} />}

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          <A2ojProgressCard
            problems={problems}
            statusOf={statusOf}
            note={
              !handle
                ? "Set a Codeforces handle in Settings and solved problems fill in automatically."
                : cf
                  ? undefined
                  : "Loading your Codeforces submissions…"
            }
          />

          {/* Category sets are unordered and mix judges, so no position column. */}
          <A2ojProblemList
            problems={problems}
            statusOf={statusOf}
            onToggle={toggle}
            showIndex={false}
          />
        </>
      )}
    </PageShell>
  );
}
