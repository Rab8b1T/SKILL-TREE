"use client";

import { useCallback, useMemo } from "react";
import { Swords, Trophy, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  useContestData,
  useSaveContestData,
  useSaveUpsolveData,
  useSession,
  useUpsolveData,
} from "@/lib/queries";
import { divisionLabel, scoreboard } from "@/lib/contest";
import { problemUrl } from "@/lib/cf";
import { formatClock, pluralize, relativeTime } from "@/lib/utils";
import {
  slotOf,
  type ContestResult,
  type UpsolveEntry,
  type VirtualContest,
} from "@/lib/types";
import { EmptyState, PageHeader, PageShell } from "@/components/layout/page";
import { Card, CardHeader, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProblemRow } from "@/components/problem-row";
import { HandlePrompt } from "@/components/handle-prompt";
import { ContestSetup } from "@/components/contest/contest-setup";
import { ContestLive } from "@/components/contest/contest-live";
import { ContestStats } from "@/components/contest/contest-stats";

export default function ContestPage() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;

  const query = useContestData(handle);
  const save = useSaveContestData(handle);
  const upsolveQuery = useUpsolveData(handle);
  const upsolveSave = useSaveUpsolveData(handle);

  const active = query.data?.active ?? null;
  const history = useMemo(() => query.data?.history ?? [], [query.data]);

  const persist = useCallback(
    (next: { active?: VirtualContest | null; history?: ContestResult[] }) => {
      if (!query.data) return;
      save.mutate(
        {
          active: next.active !== undefined ? next.active : active,
          history: next.history ?? history,
          lastKnownSavedAt: query.data.savedAt ?? null,
        },
        { onError: (err) => toast.error(err.message) },
      );
    },
    [query.data, save, active, history],
  );

  const board = useMemo(() => (active ? scoreboard(active) : null), [active]);
  const finished = active?.finishedAt != null;

  /** Everything left unsolved is owed as an upsolve. */
  function archive() {
    if (!active || !board) return;

    const result: ContestResult = {
      id: active.id,
      name: active.name,
      division: active.division,
      finishedAt: active.finishedAt ?? Date.now(),
      durationSeconds: active.durationSeconds,
      solved: board.solved,
      total: board.total,
      points: board.points,
      penaltyMinutes: board.penaltyMinutes,
      // Kept per problem so slot analysis across rounds is possible later; the
      // aggregate above cannot say which letter the round stopped at.
      problems: active.problems.map((p) => {
        const st = active.states[`${p.contestId}-${p.index}`];
        return {
          contestId: p.contestId,
          index: p.index,
          slot: slotOf(p),
          name: p.name,
          rating: p.rating ?? 0,
          tags: p.tags,
          solved: st?.state === "solved",
          wrongAttempts: st?.wrongAttempts ?? 0,
          ...(st?.state === "solved" && st.solvedAtSeconds !== undefined
            ? { solvedAtSeconds: st.solvedAtSeconds }
            : {}),
        };
      }),
    };

    const unsolved = active.problems.filter(
      (p) => active.states[`${p.contestId}-${p.index}`]?.state !== "solved",
    );

    if (unsolved.length && upsolveQuery.data) {
      const existing = upsolveQuery.data.entries ?? [];
      const known = new Set(existing.map((e) => e.key));
      const additions: UpsolveEntry[] = unsolved
        .filter((p) => !known.has(`${p.contestId}-${p.index}`))
        .map((p) => ({
          key: `${p.contestId}-${p.index}`,
          contestId: p.contestId,
          index: p.index,
          name: p.name,
          rating: p.rating ?? 0,
          tags: p.tags,
          source: "virtual",
          addedAt: Date.now(),
          attempts: active.states[`${p.contestId}-${p.index}`]?.wrongAttempts ?? 0,
          status: "open",
        }));

      if (additions.length) {
        upsolveSave.mutate({
          entries: [...additions, ...existing],
          lastKnownSavedAt: upsolveQuery.data.savedAt ?? null,
        });
      }
    }

    persist({ active: null, history: [result, ...history].slice(0, 50) });
    toast.success(
      unsolved.length
        ? `Archived · ${pluralize(unsolved.length, "problem")} sent to upsolve`
        : "Archived — clean sweep",
    );
  }

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Virtual contest" />
        <HandlePrompt />
      </PageShell>
    );
  }

  if (query.isLoading) {
    return (
      <PageShell>
        <PageHeader title="Virtual contest" />
        <Skeleton className="h-64 rounded-2xl" />
      </PageShell>
    );
  }

  // Live round in progress
  if (active && !finished) {
    return (
      <PageShell>
        <PageHeader
          title={active.name}
          description="No editorials, no hints, no searching. Submit at the cap even when unsure."
        />
        <ContestLive
          contest={active}
          handle={handle}
          onChange={(next) => persist({ active: next })}
          onFinish={(next) => persist({ active: next })}
        />
      </PageShell>
    );
  }

  // Just finished — the post-mortem
  if (active && finished && board) {
    const rate = board.total ? Math.round((board.solved / board.total) * 100) : 0;
    return (
      <PageShell width="narrow">
        <PageHeader
          title="Contest over"
          description={`${active.name} · ${divisionLabel(active.division)}`}
        />

        <Card className="mb-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Solved", value: `${board.solved}/${board.total}`, color: "var(--positive)" },
              { label: "Rate", value: `${rate}%`, color: "var(--accent)" },
              { label: "Points", value: board.points, color: "var(--ink)" },
              { label: "Penalty", value: `${board.penaltyMinutes}m`, color: "var(--warning)" },
            ].map((s) => (
              <div key={s.label}>
                <SectionLabel>{s.label}</SectionLabel>
                <p
                  className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums"
                  style={{ color: s.color }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card flush className="mb-4">
          <div className="border-b border-line p-5">
            <CardTitle>Breakdown</CardTitle>
            <p className="mt-0.5 text-[13px] text-muted">
              Tags are revealed now the clock has stopped.
            </p>
          </div>
          <div className="p-2">
            <div className="divide-y divide-line">
              {active.problems.map((p) => {
                const st = active.states[`${p.contestId}-${p.index}`];
                const solved = st?.state === "solved";
                return (
                  <ProblemRow
                    key={`${p.contestId}-${p.index}`}
                    name={p.name}
                    index={slotOf(p)}
                    url={problemUrl(p)}
                    rating={p.rating}
                    tags={p.tags}
                    done={solved}
                    meta={
                      solved && st?.solvedAtSeconds !== undefined
                        ? `Solved at ${formatClock(st.solvedAtSeconds)}${st.wrongAttempts ? ` after ${pluralize(st.wrongAttempts, "wrong try")}` : " first try"}`
                        : st?.wrongAttempts
                          ? `${pluralize(st.wrongAttempts, "attempt")}, not solved`
                          : "Not attempted"
                    }
                    actions={
                      solved ? (
                        <Badge variant="positive">solved</Badge>
                      ) : (
                        <Badge variant="warning">
                          <Undo2 className="size-3" />
                          upsolve
                        </Badge>
                      )
                    }
                  />
                );
              })}
            </div>
          </div>
        </Card>

        <Button variant="accent" className="w-full" onClick={archive}>
          <Trophy />
          Archive and send unsolved to upsolve
        </Button>
      </PageShell>
    );
  }

  // Setup + history
  return (
    <PageShell>
      <PageHeader
        title="Virtual contest"
        description="Contest conditions, a real clock, and Codeforces' own penalty rules."
      />

      <div className="space-y-4">
        <ContestSetup
          handle={handle}
          onStart={(contest) => persist({ active: contest })}
          starting={save.isPending}
        />

        <ContestStats history={history} />

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Past rounds</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted">
                {history.length
                  ? `${pluralize(history.length, "round")} recorded`
                  : "Nothing yet"}
              </p>
            </div>
          </CardHeader>

          {history.length === 0 ? (
            <EmptyState
              icon={Swords}
              title="No virtuals yet"
              description="Finish one and it lands here with its solve count and penalty."
            />
          ) : (
            <ul className="divide-y divide-line">
              {history.map((r) => {
                const rate = r.total ? r.solved / r.total : 0;
                return (
                  <li
                    key={`${r.id}-${r.finishedAt}`}
                    className="flex items-center gap-3 py-3"
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-xl text-[11px] font-bold"
                      style={{
                        color:
                          rate >= 0.6 ? "var(--positive)" : "var(--warning)",
                        backgroundColor: `color-mix(in srgb, ${rate >= 0.6 ? "var(--positive)" : "var(--warning)"} 12%, transparent)`,
                      }}
                    >
                      {r.solved}/{r.total}
                    </span>
                    <div className="min-w-0 grow">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {r.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-faint">
                        {relativeTime(r.finishedAt)} &middot; {r.points} pts
                        &middot; {r.penaltyMinutes}m penalty
                      </p>
                    </div>

                    {/* Which letters actually fell — the shape of the round at a glance. */}
                    {r.problems?.length ? (
                      <div className="hidden shrink-0 gap-1 sm:flex">
                        {r.problems.map((p) => (
                          <span
                            key={`${p.contestId}-${p.index}`}
                            title={`${slotOf(p)} · ${p.name}${p.rating ? ` · ${p.rating}` : ""}${
                              p.solved
                                ? p.solvedAtSeconds != null
                                  ? ` · solved at ${formatClock(p.solvedAtSeconds)}`
                                  : " · solved"
                                : " · not solved"
                            }`}
                            className="grid size-5 place-items-center rounded text-[10px] font-bold"
                            style={{
                              color: p.solved ? "var(--positive)" : "var(--faint)",
                              backgroundColor: p.solved
                                ? "color-mix(in srgb, var(--positive) 14%, transparent)"
                                : "var(--sunken)",
                            }}
                          >
                            {slotOf(p)}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <Badge variant="outline" size="sm">
                      {divisionLabel(r.division)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
