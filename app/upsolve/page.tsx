"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Trash2, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import {
  useCfProfile,
  useSaveUpsolveData,
  useSession,
  useUpsolveData,
} from "@/lib/queries";
import { useDocList } from "@/lib/use-doc-list";
import { problemUrl } from "@/lib/cf";
import { pluralize, relativeTime } from "@/lib/utils";
import type { UpsolveEntry } from "@/lib/types";
import { EmptyState, PageHeader, PageShell } from "@/components/layout/page";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { ProblemRow } from "@/components/problem-row";
import { HandlePrompt } from "@/components/handle-prompt";

type View = "open" | "done" | "suggested";

export default function UpsolvePage() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const { data: profile } = useCfProfile(handle);

  const query = useUpsolveData(handle);
  const save = useSaveUpsolveData(handle);
  const { items: entries, update } = useDocList<
    { entries: UpsolveEntry[] },
    UpsolveEntry
  >(query, save, "entries");

  const [view, setView] = useState<View>("open");

  const open = useMemo(
    () => entries.filter((e) => e.status === "open"),
    [entries],
  );
  const done = useMemo(
    () => entries.filter((e) => e.status === "done"),
    [entries],
  );

  const tracked = useMemo(() => new Set(entries.map((e) => e.key)), [entries]);

  /**
   * Problems attempted but never accepted, straight from the submission
   * history. These are owed upsolves whether or not they were ever added by
   * hand, which is why they're suggested rather than waiting to be typed in.
   */
  const suggested = useMemo(() => {
    if (!profile) return [];
    return profile.stats.unsolved
      .filter((p) => !tracked.has(p.key))
      .sort((a, b) => b.attempts - a.attempts || b.rating - a.rating)
      .slice(0, 40);
  }, [profile, tracked]);

  function add(p: {
    key: string;
    contestId?: number;
    index: string;
    name: string;
    rating: number;
    tags: string[];
    attempts: number;
  }) {
    update((cur) => [
      {
        key: p.key,
        contestId: p.contestId,
        index: p.index,
        name: p.name,
        rating: p.rating,
        tags: p.tags,
        source: "contest",
        addedAt: Date.now(),
        attempts: p.attempts,
        status: "open",
      },
      ...cur,
    ]);
  }

  function setStatus(key: string, status: UpsolveEntry["status"]) {
    update((cur) =>
      cur.map((e) =>
        e.key === key
          ? { ...e, status, doneAt: status === "done" ? Date.now() : undefined }
          : e,
      ),
    );
    if (status === "done") toast.success("Nice — logged as upsolved");
  }

  function remove(key: string) {
    update((cur) => cur.filter((e) => e.key !== key));
  }

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Upsolve" />
        <HandlePrompt />
      </PageShell>
    );
  }

  const rows = view === "open" ? open : view === "done" ? done : [];

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Upsolve"
        description="Read the editorial once, close it, then re-implement from scratch. An upsolve is not a solve — it doesn't count as mastery."
      />

      <Card flush>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <CardTitle>
              {view === "suggested" ? "Attempted, never accepted" : "Tracked"}
            </CardTitle>
            <p className="mt-0.5 text-[13px] text-muted">
              {view === "suggested"
                ? `${pluralize(suggested.length, "problem")} from your submission history`
                : `${pluralize(open.length, "problem")} open · ${done.length} cleared`}
            </p>
          </div>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "open", label: "Open" },
              { value: "done", label: "Cleared" },
              { value: "suggested", label: "Suggested" },
            ]}
          />
        </div>

        <div className="p-2">
          {query.isLoading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : view === "suggested" ? (
            suggested.length === 0 ? (
              <EmptyState
                icon={Check}
                title="Nothing outstanding"
                description="Every problem you've attempted has an accepted submission."
              />
            ) : (
              <div className="divide-y divide-line">
                {suggested.map((p) => (
                  <ProblemRow
                    key={p.key}
                    name={p.name}
                    index={p.index}
                    url={problemUrl({ contestId: p.contestId, index: p.index })}
                    rating={p.rating}
                    tags={p.tags}
                    meta={`${pluralize(p.attempts, "attempt")} · last ${relativeTime(p.solvedAt)}`}
                    actions={
                      <Button
                        size="icon-sm"
                        variant="secondary"
                        title="Track this"
                        onClick={() => add(p)}
                      >
                        <Plus />
                      </Button>
                    }
                  />
                ))}
              </div>
            )
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Undo2}
              title={view === "open" ? "No open upsolves" : "Nothing cleared yet"}
              description={
                view === "open"
                  ? "Problems you abandon in practice or a virtual land here."
                  : "Clear an open upsolve and it moves here."
              }
            />
          ) : (
            <div className="divide-y divide-line">
              {rows.map((e) => (
                <ProblemRow
                  key={e.key}
                  name={e.name}
                  index={e.index}
                  url={problemUrl({ contestId: e.contestId, index: e.index })}
                  rating={e.rating}
                  tags={e.tags}
                  done={e.status === "done"}
                  meta={
                    <span className="flex items-center gap-1.5">
                      <Badge variant="outline" size="sm">
                        {e.source}
                      </Badge>
                      {e.status === "done" && e.doneAt
                        ? `cleared ${relativeTime(e.doneAt)}`
                        : `added ${relativeTime(e.addedAt)}`}
                    </span>
                  }
                  actions={
                    <>
                      {e.status === "open" ? (
                        <>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Drop it"
                            onClick={() => setStatus(e.key, "dropped")}
                          >
                            <X />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="secondary"
                            title="Mark upsolved"
                            onClick={() => setStatus(e.key, "done")}
                          >
                            <Check />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Remove"
                          onClick={() => remove(e.key)}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
