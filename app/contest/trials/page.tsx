"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Archive } from "lucide-react";
import { useContestRounds, useSession } from "@/lib/queries";
import { pluralize } from "@/lib/utils";
import { EmptyState, PageHeader, PageShell } from "@/components/layout/page";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HandlePrompt } from "@/components/handle-prompt";
import { ContestHistoryRow } from "@/components/contest/history-row";

export default function ContestTrialsPage() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursor = cursors.at(-1) ?? null;
  const query = useContestRounds(handle, "first-time-trials", cursor, 20);

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="First-Time Contest Trials" />
        <HandlePrompt />
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow">
      <PageHeader
        title="First-Time Contest Trials"
        description="Preserved historical attempts. They remain reviewable but do not advance the 200-contest program."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/contest">
              <ArrowLeft />
              Contest
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Trial archive</CardTitle>
            <p className="mt-0.5 text-[12px] text-muted">
              {query.data?.total
                ? pluralize(query.data.total, "preserved round")
                : "No trial records"}
            </p>
          </div>
        </CardHeader>

        {query.isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : query.isError ? (
          <EmptyState
            icon={Archive}
            title="Trial archive could not be loaded"
            description="Nothing was removed. Retry when the connection is available."
            action={
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Retry
              </Button>
            }
          />
        ) : !query.data?.rounds.length ? (
          <EmptyState
            icon={Archive}
            title="No trial rounds"
            description="Legacy trial contests will appear here after the non-destructive migration."
          />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {query.data.rounds.map((round) => (
                <ContestHistoryRow key={round.roundId} round={round} />
              ))}
            </ul>
            {(cursors.length > 1 || query.data.nextCursor) && (
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={cursors.length === 1}
                  onClick={() => setCursors((items) => items.slice(0, -1))}
                >
                  <ArrowLeft />
                  Newer
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!query.data.nextCursor}
                  onClick={() =>
                    query.data?.nextCursor &&
                    setCursors((items) => [...items, query.data.nextCursor])
                  }
                >
                  Older
                  <ArrowRight />
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </PageShell>
  );
}
