"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useLadder, useSession } from "@/lib/queries";
import { useA2ojStatus } from "@/lib/use-a2oj-status";
import { ErrorState, PageHeader, PageShell } from "@/components/layout/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  A2ojProblemList,
  A2ojProgressCard,
} from "@/components/a2oj/problem-list";

export default function LadderDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error, refetch } = useLadder(slug);
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const { statusOf, toggle, cf } = useA2ojStatus(handle, slug);

  const problems = useMemo(() => data?.problems ?? [], [data]);

  const solvedCount = useMemo(
    () => problems.filter((p) => statusOf(p).state === "solved").length,
    [problems, statusOf],
  );

  // A ladder is ordered, so "next" means the first one not yet solved.
  const nextUp = useMemo(
    () => problems.find((p) => statusOf(p).state !== "solved"),
    [problems, statusOf],
  );

  return (
    <PageShell width="narrow">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/ladders">
          <ArrowLeft />
          All ladders
        </Link>
      </Button>

      <PageHeader
        title={data?.name ?? "Ladder"}
        description={
          problems.length
            ? `${solvedCount} of ${problems.length} solved`
            : "Loading…"
        }
        actions={
          nextUp && (
            <Button asChild variant="accent">
              <a href={nextUp.u} target="_blank" rel="noreferrer">
                Next problem
                <ExternalLink />
              </a>
            </Button>
          )
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

          <A2ojProblemList
            problems={problems}
            statusOf={statusOf}
            onToggle={toggle}
          />
        </>
      )}
    </PageShell>
  );
}
