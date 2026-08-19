"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Dices,
  Loader2,
  Plus,
  RotateCcw,
  Target,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCfProfile,
  usePickProblems,
  usePracticeData,
  useSavePracticeData,
  useSession,
  useSaveUpsolveData,
  useUpsolveData,
  type PickedProblem,
} from "@/lib/queries";
import { useDocList } from "@/lib/use-doc-list";
import { CF_TAGS, growthBand, problemKey, problemUrl } from "@/lib/cf";
import { cn, pluralize, relativeTime } from "@/lib/utils";
import type { PracticeEntry, UpsolveEntry } from "@/lib/types";
import {
  EmptyState,
  PageHeader,
  PageShell,
} from "@/components/layout/page";
import { Card, CardHeader, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { ProblemRow } from "@/components/problem-row";
import { HandlePrompt } from "@/components/handle-prompt";

export default function PracticePage() {
  return (
    <Suspense fallback={null}>
      <PracticeInner />
    </Suspense>
  );
}

type Filter = "todo" | "solved" | "all";

function PracticeInner() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const { data: profile } = useCfProfile(handle);

  const practiceQuery = usePracticeData(handle);
  const practiceSave = useSavePracticeData(handle);
  const { items: entries, update: updateEntries } = useDocList<
    { entries: PracticeEntry[]; prefs?: object },
    PracticeEntry
  >(practiceQuery, practiceSave, "entries");

  const upsolveQuery = useUpsolveData(handle);
  const upsolveSave = useSaveUpsolveData(handle);
  const { update: updateUpsolve } = useDocList<
    { entries: UpsolveEntry[] },
    UpsolveEntry
  >(upsolveQuery, upsolveSave, "entries");

  const band = useMemo(
    () => growthBand(profile?.user.rating ?? 800),
    [profile?.user.rating],
  );

  // Null means "untouched": the inputs follow the growth band, which only
  // settles once live rating arrives, until the user overrides them.
  const [minDraft, setMinDraft] = useState<number | null>(null);
  const [maxDraft, setMaxDraft] = useState<number | null>(null);
  const [count, setCount] = useState(7);
  const [tagsDraft, setTagsDraft] = useState<string[] | null>(null);
  const [filter, setFilter] = useState<Filter>("todo");

  // Deep links: the dashboard's weakest-tags list, and the contest page's wall,
  // which links the rating band its slot analysis says is worth drilling.
  const linked = useMemo(() => {
    const num = (key: string) => {
      const raw = searchParams.get(key);
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : null;
    };
    const t = searchParams.get("tags");
    return {
      tags: t ? t.split(",").filter(Boolean) : [],
      min: num("min"),
      max: num("max"),
    };
  }, [searchParams]);

  const min = minDraft ?? linked.min ?? band[0];
  const max = maxDraft ?? linked.max ?? band[1];
  const tags = tagsDraft ?? linked.tags;

  const pick = usePickProblems();
  const picked = pick.data?.problems ?? [];

  const savedKeys = useMemo(
    () => new Set(entries.map((e) => e.key)),
    [entries],
  );

  const visible = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      if (a.status !== b.status) return a.status === "todo" ? -1 : 1;
      return b.addedAt - a.addedAt;
    });
    if (filter === "all") return sorted;
    if (filter === "solved") return sorted.filter((e) => e.status === "solved");
    return sorted.filter((e) => e.status === "todo");
  }, [entries, filter]);

  const todoCount = entries.filter((e) => e.status === "todo").length;

  function runPick() {
    pick.mutate(
      { handle, min, max, count, tags },
      {
        onError: (err) => toast.error(err.message),
        onSuccess: (data) => {
          if (!data.problems.length) {
            toast.error("Nothing matched — widen the band or drop a tag");
          }
        },
      },
    );
  }

  function addProblem(p: PickedProblem) {
    const key = problemKey(p);
    if (savedKeys.has(key)) return;
    updateEntries((cur) => [
      {
        key,
        contestId: p.contestId,
        index: p.index,
        name: p.name,
        rating: p.rating,
        tags: p.tags,
        addedAt: Date.now(),
        status: "todo",
      },
      ...cur,
    ]);
  }

  function addAll() {
    const fresh = picked.filter((p) => !savedKeys.has(problemKey(p)));
    if (!fresh.length) return;
    updateEntries((cur) => [
      ...fresh.map((p) => ({
        key: problemKey(p),
        contestId: p.contestId,
        index: p.index,
        name: p.name,
        rating: p.rating,
        tags: p.tags,
        addedAt: Date.now(),
        status: "todo" as const,
      })),
      ...cur,
    ]);
    toast.success(`Added ${pluralize(fresh.length, "problem")}`);
  }

  function setStatus(key: string, status: PracticeEntry["status"]) {
    updateEntries((cur) =>
      cur.map((e) =>
        e.key === key
          ? { ...e, status, solvedAt: status === "solved" ? Date.now() : undefined }
          : e,
      ),
    );
  }

  function remove(key: string) {
    updateEntries((cur) => cur.filter((e) => e.key !== key));
  }

  /** Moving a problem to upsolve is the honest outcome when the timebox ran out. */
  function sendToUpsolve(entry: PracticeEntry) {
    updateUpsolve((cur) =>
      cur.some((e) => e.key === entry.key)
        ? cur
        : [
            {
              key: entry.key,
              contestId: entry.contestId,
              index: entry.index,
              name: entry.name,
              rating: entry.rating,
              tags: entry.tags,
              source: "practice",
              addedAt: Date.now(),
              attempts: 0,
              status: "open",
            },
            ...cur,
          ],
    );
    remove(entry.key);
    toast.success("Moved to upsolve");
  }

  if (!handle) {
    return (
      <PageShell width="narrow">
        <PageHeader title="Practice" />
        <HandlePrompt />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Practice"
        description={
          profile
            ? `Your growth band is ${band[0]}–${band[1]}. Below it, volume isn't progress.`
            : "Loading your rating…"
        }
      />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr] lg:items-start">
        {/* Picker */}
        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <div>
              <CardTitle>Pick problems</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted">
                Unsolved only — your accepted list is excluded automatically.
              </p>
            </div>
          </CardHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min rating" htmlFor="min">
                <Input
                  id="min"
                  type="number"
                  step={100}
                  min={800}
                  max={3500}
                  value={min}
                  onChange={(e) => setMinDraft(Number(e.target.value))}
                  className="font-mono tabular-nums"
                />
              </Field>
              <Field label="Max rating" htmlFor="max">
                <Input
                  id="max"
                  type="number"
                  step={100}
                  min={800}
                  max={3500}
                  value={max}
                  onChange={(e) => setMaxDraft(Number(e.target.value))}
                  className="font-mono tabular-nums"
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={
                  min === band[0] && max === band[1] ? "accent" : "secondary"
                }
                onClick={() => {
                  setMinDraft(null);
                  setMaxDraft(null);
                }}
              >
                <Target />
                Growth band
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setMinDraft(Math.max(800, (profile?.user.rating ?? 800) - 100));
                  setMaxDraft((profile?.user.rating ?? 800) + 100);
                }}
              >
                Speed drill
              </Button>
            </div>

            <div>
              <SectionLabel className="mb-2">
                Tags {tags.length > 0 && `· ${tags.length} selected`}
              </SectionLabel>
              <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                <div className="flex flex-wrap gap-1.5">
                  {CF_TAGS.slice(0, 22).map((tag) => {
                    const on = tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() =>
                          setTagsDraft(
                            on ? tags.filter((t) => t !== tag) : [...tags, tag],
                          )
                        }
                        className={cn(
                          "cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                          on
                            ? "border-accent/30 bg-accent-soft text-accent"
                            : "border-line bg-elevated text-muted hover:text-ink",
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              {tags.length > 0 && (
                <button
                  onClick={() => setTagsDraft([])}
                  className="mt-2 cursor-pointer text-[11px] font-medium text-accent hover:underline"
                >
                  Clear tags
                </button>
              )}
            </div>

            <Field label="How many" htmlFor="count">
              <Input
                id="count"
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="font-mono tabular-nums"
              />
            </Field>

            <Button
              variant="accent"
              className="w-full"
              onClick={runPick}
              disabled={pick.isPending}
            >
              {pick.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Dices />
              )}
              Pick
            </Button>

            {pick.data && (
              <p className="text-center text-[11px] text-faint">
                {pick.data.poolSize} unsolved problems match
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          {/* Picked results */}
          {picked.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Suggestions</CardTitle>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Fresh shuffle from the matching pool.
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={runPick}>
                    <RotateCcw />
                    Reroll
                  </Button>
                  <Button size="sm" variant="secondary" onClick={addAll}>
                    <Plus />
                    Add all
                  </Button>
                </div>
              </CardHeader>

              <div className="-mx-1 divide-y divide-line">
                {picked.map((p) => {
                  const key = problemKey(p);
                  const saved = savedKeys.has(key);
                  return (
                    <ProblemRow
                      key={key}
                      name={p.name}
                      index={p.index}
                      url={problemUrl(p)}
                      rating={p.rating}
                      tags={p.tags}
                      meta={`${p.solvedCount.toLocaleString()} solved`}
                      actions={
                        <Button
                          size="icon-sm"
                          variant={saved ? "ghost" : "secondary"}
                          disabled={saved}
                          onClick={() => addProblem(p)}
                          title={saved ? "Already on your list" : "Add to list"}
                        >
                          {saved ? <Check /> : <Plus />}
                        </Button>
                      }
                    />
                  );
                })}
              </div>
            </Card>
          )}

          {/* Saved list */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Your list</CardTitle>
                <p className="mt-0.5 text-[13px] text-muted">
                  {todoCount > 0
                    ? `${pluralize(todoCount, "problem")} waiting`
                    : "Nothing outstanding"}
                </p>
              </div>
              <Segmented
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "todo", label: "To do" },
                  { value: "solved", label: "Solved" },
                  { value: "all", label: "All" },
                ]}
              />
            </CardHeader>

            {practiceQuery.isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={Target}
                title={
                  filter === "solved" ? "Nothing solved yet" : "Your list is empty"
                }
                description="Pick a few problems in your band and they'll show up here."
              />
            ) : (
              <div className="-mx-1 divide-y divide-line">
                {visible.map((e) => (
                  <ProblemRow
                    key={e.key}
                    name={e.name}
                    index={e.index}
                    url={problemUrl({ contestId: e.contestId, index: e.index })}
                    rating={e.rating}
                    tags={e.tags}
                    done={e.status === "solved"}
                    meta={
                      e.status === "solved" && e.solvedAt
                        ? `Solved ${relativeTime(e.solvedAt)}`
                        : `Added ${relativeTime(e.addedAt)}`
                    }
                    actions={
                      <>
                        {e.status === "todo" ? (
                          <>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Move to upsolve"
                              onClick={() => sendToUpsolve(e)}
                            >
                              <Undo2 />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="secondary"
                              title="Mark solved"
                              onClick={() => setStatus(e.key, "solved")}
                            >
                              <Check />
                            </Button>
                          </>
                        ) : (
                          <Badge variant="positive">solved</Badge>
                        )}
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Remove"
                          onClick={() => remove(e.key)}
                        >
                          <Trash2 />
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
