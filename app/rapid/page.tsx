"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  ExternalLink,
  Loader2,
  SkipForward,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCfProfile,
  usePickProblems,
  usePracticeData,
  useSavePracticeData,
  useSaveUpsolveData,
  useSession,
  useUpsolveData,
} from "@/lib/queries";
import { growthBand, problemKey, problemUrl } from "@/lib/cf";
import { cn, formatClock, pluralize, relativeTime } from "@/lib/utils";
import { useNow } from "@/lib/use-now";
import type {
  RapidProblem,
  RapidResult,
  RapidSession,
  RapidSessionResult,
  UpsolveEntry,
} from "@/lib/types";
import { EmptyState, PageHeader, PageShell } from "@/components/layout/page";
import { Card, CardHeader, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingChip } from "@/components/ui/rating";
import { HandlePrompt } from "@/components/handle-prompt";

export default function RapidPage() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const { data: profile } = useCfProfile(handle);

  const query = usePracticeData(handle);
  const save = useSavePracticeData(handle);
  const upsolveQuery = useUpsolveData(handle);
  const upsolveSave = useSaveUpsolveData(handle);

  const active = query.data?.session ?? null;
  const history = useMemo(() => query.data?.sessionHistory ?? [], [query.data]);

  const persist = useCallback(
    (patch: { session?: RapidSession | null; sessionHistory?: RapidSessionResult[] }) => {
      if (!query.data) return;
      save.mutate(
        {
          ...query.data,
          session: patch.session !== undefined ? patch.session : active,
          sessionHistory: patch.sessionHistory ?? history,
          lastKnownSavedAt: query.data.savedAt ?? null,
        },
        { onError: (err) => toast.error(err.message) },
      );
    },
    [query.data, save, active, history],
  );

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Rapid" />
        <HandlePrompt />
      </PageShell>
    );
  }

  if (query.isLoading) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Rapid" />
        <Skeleton className="h-64 rounded-2xl" />
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Rapid"
        description="A hard per-problem cap. At the cap you move on — that is the point, because contests end where the clock runs out, not where the difficulty does."
      />

      {active ? (
        <RapidRunner
          session={active}
          onChange={(s) => persist({ session: s })}
          onFinish={(result, unsolved) => {
            if (unsolved.length && upsolveQuery.data) {
              const existing = upsolveQuery.data.entries ?? [];
              const known = new Set(existing.map((e) => e.key));
              const additions: UpsolveEntry[] = unsolved
                .filter((p) => !known.has(p.key))
                .map((p) => ({
                  key: p.key,
                  contestId: p.contestId,
                  index: p.index,
                  name: p.name,
                  rating: p.rating,
                  tags: p.tags,
                  source: "practice",
                  addedAt: Date.now(),
                  attempts: 0,
                  status: "open",
                }));
              if (additions.length) {
                upsolveSave.mutate({
                  entries: [...additions, ...existing],
                  lastKnownSavedAt: upsolveQuery.data.savedAt ?? null,
                });
              }
            }
            persist({
              session: null,
              sessionHistory: [result, ...history].slice(0, 40),
            });
            toast.success(
              `${result.solved}/${result.total} inside the cap${
                unsolved.length ? ` · ${pluralize(unsolved.length, "problem")} to upsolve` : ""
              }`,
            );
          }}
        />
      ) : (
        <RapidSetup
          handle={handle}
          band={growthBand(profile?.user.rating ?? 800)}
          onStart={(s) => persist({ session: s })}
        />
      )}

      {history.length > 0 && !active && (
        <Card className="mt-4">
          <CardHeader>
            <div>
              <CardTitle>Past sessions</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted">
                {pluralize(history.length, "session")} recorded
              </p>
            </div>
          </CardHeader>
          <ul className="divide-y divide-line">
            {history.map((h) => {
              const rate = h.total ? h.solved / h.total : 0;
              return (
                <li key={h.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold"
                    style={{
                      color: rate >= 0.5 ? "var(--positive)" : "var(--warning)",
                      backgroundColor: `color-mix(in srgb, ${rate >= 0.5 ? "var(--positive)" : "var(--warning)"} 12%, transparent)`,
                    }}
                  >
                    {h.solved}/{h.total}
                  </span>
                  <div className="min-w-0 grow">
                    <p className="text-[13px] font-medium text-ink">
                      {Math.round(h.perProblemSeconds / 60)}-minute cap
                    </p>
                    <p className="mt-0.5 text-[11px] text-faint">
                      {relativeTime(h.finishedAt)}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-muted">
                    {formatClock(
                      h.results.reduce((sum, r) => sum + r.seconds, 0),
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </PageShell>
  );
}

/* ------------------------------ setup ------------------------------ */

function RapidSetup({
  handle,
  band,
  onStart,
}: {
  handle: string;
  band: [number, number];
  onStart: (s: RapidSession) => void;
}) {
  const [minutes, setMinutes] = useState(15);
  const [count, setCount] = useState(3);
  const pick = usePickProblems();
  const { data: practice } = usePracticeData(handle);

  const listCandidates = useMemo(
    () => (practice?.entries ?? []).filter((e) => e.status === "todo"),
    [practice],
  );

  function begin(problems: RapidProblem[]) {
    if (!problems.length) return;
    onStart({
      id: `rapid-${Date.now().toString(36)}`,
      problems,
      perProblemSeconds: minutes * 60,
      startedAt: Date.now(),
      currentIndex: 0,
      currentStartedAt: Date.now(),
      results: [],
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Session shape</CardTitle>
            <p className="mt-0.5 text-[13px] text-muted">
              Fifteen minutes each is the standard drill; twelve if you are
              training contest speed.
            </p>
          </div>
        </CardHeader>

        <div className="space-y-4">
          <div>
            <SectionLabel className="mb-2">Cap per problem</SectionLabel>
            <Segmented
              value={String(minutes)}
              onChange={(v) => setMinutes(Number(v))}
              hideLabelsOnMobile={false}
              options={[
                { value: "10", label: "10 min" },
                { value: "12", label: "12 min" },
                { value: "15", label: "15 min" },
                { value: "20", label: "20 min" },
              ]}
            />
          </div>

          <Field label="How many problems" htmlFor="count">
            <Input
              id="count"
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="font-mono tabular-nums"
            />
          </Field>

          <p className="rounded-lg bg-sunken px-3 py-2 text-[11px] leading-relaxed text-muted">
            Total {count * minutes} minutes. Anything not solved inside its cap
            is sent to upsolve automatically when the session ends.
          </p>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardTitle>Fresh problems</CardTitle>
          <p className="mt-1 text-[13px] text-muted">
            Unsolved, from your {band[0]}&ndash;{band[1]} band.
          </p>
          <Button
            variant="accent"
            className="mt-3 w-full"
            disabled={pick.isPending}
            onClick={() =>
              pick.mutate(
                { handle, min: band[0], max: band[1], count },
                {
                  onError: (err) => toast.error(err.message),
                  onSuccess: (data) => {
                    if (!data.problems.length) {
                      toast.error("Nothing available in that band");
                      return;
                    }
                    begin(
                      data.problems.map((p) => ({
                        key: problemKey(p),
                        contestId: p.contestId,
                        index: p.index,
                        name: p.name,
                        rating: p.rating,
                        tags: p.tags,
                      })),
                    );
                  },
                },
              )
            }
          >
            {pick.isPending ? <Loader2 className="animate-spin" /> : <Timer />}
            Pick and start
          </Button>
        </Card>

        <Card>
          <CardTitle>From your list</CardTitle>
          <p className="mt-1 text-[13px] text-muted">
            {listCandidates.length
              ? `${pluralize(listCandidates.length, "problem")} waiting in Practice.`
              : "Nothing outstanding in Practice."}
          </p>
          {listCandidates.length ? (
            <Button
              variant="secondary"
              className="mt-3 w-full"
              onClick={() =>
                begin(
                  listCandidates.slice(0, count).map((e) => ({
                    key: e.key,
                    contestId: e.contestId,
                    index: e.index,
                    name: e.name,
                    rating: e.rating,
                    tags: e.tags,
                  })),
                )
              }
            >
              <Timer />
              Use first {Math.min(count, listCandidates.length)}
            </Button>
          ) : (
            <Button asChild variant="ghost" className="mt-3 w-full">
              <Link href="/practice">
                Go to Practice
                <ChevronRight />
              </Link>
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------ runner ------------------------------ */

function RapidRunner({
  session,
  onChange,
  onFinish,
}: {
  session: RapidSession;
  onChange: (s: RapidSession) => void;
  onFinish: (result: RapidSessionResult, unsolved: RapidProblem[]) => void;
}) {
  const now = useNow(1000);
  const current = session.problems[session.currentIndex];
  const elapsed = now ? Math.floor((now - session.currentStartedAt) / 1000) : 0;
  const remaining = Math.max(0, session.perProblemSeconds - elapsed);
  const expired = remaining === 0;
  const urgent = remaining > 0 && remaining <= 60;

  const finish = useCallback(
    (results: RapidResult[]) => {
      const solved = results.filter((r) => r.outcome === "solved").length;
      const unsolvedKeys = new Set(
        results.filter((r) => r.outcome !== "solved").map((r) => r.key),
      );
      onFinish(
        {
          id: session.id,
          startedAt: session.startedAt,
          finishedAt: Date.now(),
          total: session.problems.length,
          solved,
          perProblemSeconds: session.perProblemSeconds,
          results,
        },
        session.problems.filter((p) => unsolvedKeys.has(p.key)),
      );
    },
    [session, onFinish],
  );

  const advance = useCallback(
    (outcome: RapidResult["outcome"]) => {
      if (!current) return;
      const seconds = Math.min(
        session.perProblemSeconds,
        Math.floor((Date.now() - session.currentStartedAt) / 1000),
      );
      const results = [...session.results, { key: current.key, outcome, seconds }];

      if (session.currentIndex + 1 >= session.problems.length) finish(results);
      else
        onChange({
          ...session,
          currentIndex: session.currentIndex + 1,
          currentStartedAt: Date.now(),
          results,
        });
    },
    [current, session, onChange, finish],
  );

  // The cap is the whole mechanism, so it enforces itself rather than waiting
  // for a click that may never come.
  const firedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!expired || !current) return;
    if (firedRef.current === current.key) return;
    firedRef.current = current.key;
    toast.info(`Cap reached on ${current.index} — moving on`);
    advance("failed");
  }, [expired, current, advance]);

  if (!current) return null;

  const done = session.results.length;
  const total = session.problems.length;

  return (
    <div className="space-y-4">
      <Card className={cn(urgent && "border-negative/40")}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <SectionLabel>
              Problem {done + 1} of {total}
            </SectionLabel>
            <p
              className={cn(
                "mt-1 font-mono text-4xl font-bold leading-none tabular-nums",
                urgent ? "animate-urgent text-negative" : "text-ink",
              )}
            >
              {now === null ? "--:--" : formatClock(remaining)}
            </p>
          </div>
          <div className="flex gap-1">
            {session.problems.map((p, i) => {
              const r = session.results.find((x) => x.key === p.key);
              return (
                <span
                  key={p.key}
                  className="size-2.5 rounded-full"
                  style={{
                    backgroundColor: r
                      ? r.outcome === "solved"
                        ? "var(--positive)"
                        : r.outcome === "skipped"
                          ? "var(--faint)"
                          : "var(--negative)"
                      : i === session.currentIndex
                        ? "var(--accent)"
                        : "var(--sunken)",
                  }}
                />
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <RatingChip rating={current.rating} />
          <div className="min-w-0 grow">
            <a
              href={problemUrl({ contestId: current.contestId, index: current.index })}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5"
            >
              <span className="text-base font-semibold text-ink group-hover:underline">
                {current.index}. {current.name}
              </span>
              <ExternalLink className="size-3.5 text-faint" />
            </a>
            <p className="mt-1.5 text-[11px] italic text-faint">
              Name the technique before you write any code.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Button variant="accent" onClick={() => advance("solved")}>
            <Check />
            Solved
          </Button>
          <Button variant="secondary" onClick={() => advance("failed")}>
            <X />
            Gave up
          </Button>
          <Button variant="ghost" onClick={() => advance("skipped")}>
            <SkipForward />
            Skip
          </Button>
        </div>
      </Card>

      {session.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>So far</CardTitle>
          </CardHeader>
          <ul className="space-y-1.5">
            {session.results.map((r) => {
              const p = session.problems.find((x) => x.key === r.key)!;
              return (
                <li
                  key={r.key}
                  className="flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="truncate text-muted">
                    {p.index}. {p.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[11px] tabular-nums text-faint">
                      {formatClock(r.seconds)}
                    </span>
                    <Badge
                      variant={
                        r.outcome === "solved"
                          ? "positive"
                          : r.outcome === "skipped"
                            ? "neutral"
                            : "negative"
                      }
                      size="sm"
                    >
                      {r.outcome}
                    </Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <EmptyState
        title="Leave the tab open"
        description="The cap keeps running from when the problem opened, so closing this page mid-problem loses the timer."
      />
    </div>
  );
}
