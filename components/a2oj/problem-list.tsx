"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import type { A2ojState, A2ojStatus } from "@/lib/a2oj-status";
import { cfKeyOf } from "@/lib/a2oj-status";
import { cn, pluralize } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { RatingChip } from "@/components/ui/rating";
import { Segmented } from "@/components/ui/segmented";

export interface A2ojListProblem {
  n: string;
  u: string;
  r?: number | null;
  c?: number | null;
  i?: string | null;
  /** Judge, on category sets that span more than Codeforces. */
  p?: string | null;
  /** A2OJ difficulty level, where a rating is not available. */
  d?: number | null;
}

type View = "all" | "todo" | "solved" | "attempted";
type RatingBand =
  | "all"
  | "unrated"
  | "newbie"
  | "pupil"
  | "specialist"
  | "expert"
  | "candidate-master"
  | "master"
  | "grandmaster";

const VIEWS: { value: View; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "solved", label: "Solved" },
  { value: "attempted", label: "Attempted" },
];

const RATING_BANDS: {
  value: RatingBand;
  label: string;
  min?: number;
  max?: number;
}[] = [
  { value: "all", label: "All ratings" },
  { value: "newbie", label: "≤ 1199 · Newbie", min: 0, max: 1199 },
  { value: "pupil", label: "1200–1399 · Pupil", min: 1200, max: 1399 },
  {
    value: "specialist",
    label: "1400–1599 · Specialist",
    min: 1400,
    max: 1599,
  },
  { value: "expert", label: "1600–1899 · Expert", min: 1600, max: 1899 },
  {
    value: "candidate-master",
    label: "1900–2099 · CM",
    min: 1900,
    max: 2099,
  },
  { value: "master", label: "2100–2299 · Master", min: 2100, max: 2299 },
  { value: "grandmaster", label: "2300+ · GM", min: 2300 },
  { value: "unrated", label: "Unrated" },
];

const PAGE = 100;

const DOT: Record<A2ojState, string> = {
  solved: "var(--positive)",
  attempted: "var(--warning)",
  unsolved: "var(--line-strong)",
};

function matchesRatingBand(rating: number | null | undefined, band: RatingBand) {
  if (band === "all") return true;
  if (band === "unrated") return !rating;
  if (!rating) return false;
  const option = RATING_BANDS.find((candidate) => candidate.value === band);
  return (
    !!option &&
    rating >= (option.min ?? Number.NEGATIVE_INFINITY) &&
    rating <= (option.max ?? Number.POSITIVE_INFINITY)
  );
}

function shortPlatform(platform: string) {
  const known: Record<string, string> = {
    Codeforces: "CF",
    CodeChef: "CC",
    AtCoder: "AC",
  };
  return known[platform] ?? platform;
}

export function A2ojProblemList({
  problems,
  statusOf,
  onToggle,
  showIndex = true,
  showSearch = true,
}: {
  problems: A2ojListProblem[];
  statusOf: (p: A2ojListProblem) => A2ojStatus;
  onToggle: (url: string) => void;
  /** Ladders are an ordered set, so the position matters; topics are not. */
  showIndex?: boolean;
  showSearch?: boolean;
}) {
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [ratingBand, setRatingBand] = useState<RatingBand>("all");
  const [difficulty, setDifficulty] = useState("all");
  const [limit, setLimit] = useState(PAGE);

  const rows = useMemo(
    () => problems.map((p, i) => ({ p, i, s: statusOf(p) })),
    [problems, statusOf],
  );

  const platforms = useMemo(
    () =>
      [...new Set(problems.map((p) => p.p).filter((p): p is string => !!p))].sort(),
    [problems],
  );
  const difficulties = useMemo(
    () =>
      [
        ...new Set(
          problems.map((p) => p.d).filter((d): d is number => d !== null && d !== undefined),
        ),
      ].sort((a, b) => a - b),
    [problems],
  );
  const hasRatings = useMemo(() => problems.some((p) => !!p.r), [problems]);
  const ratingBands = useMemo(
    () =>
      RATING_BANDS.filter(
        (option) =>
          option.value === "all" ||
          problems.some((p) => matchesRatingBand(p.r, option.value)),
      ),
    [problems],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter(({ p, s }) => {
      if (view === "todo" && s.state === "solved") return false;
      if (view === "solved" && s.state !== "solved") return false;
      if (view === "attempted" && s.state !== "attempted") return false;
      if (platform !== "all" && p.p !== platform) return false;
      if (!matchesRatingBand(p.r, ratingBand)) return false;
      if (difficulty !== "all" && String(p.d) !== difficulty) return false;
      const problemId = p.c && p.i ? `${p.c}${p.i}` : (p.i ?? "");
      const haystack = `${p.n} ${problemId} ${p.p ?? ""}`.toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      return true;
    });
  }, [rows, view, search, platform, ratingBand, difficulty]);

  // These lists run past a thousand problems; rendering all of them at once is
  // the one thing that made the old page janky on a phone.
  const visible = filtered.slice(0, limit);

  const reset = () => setLimit(PAGE);
  const hasActiveFilters =
    !!search ||
    view !== "all" ||
    platform !== "all" ||
    ratingBand !== "all" ||
    difficulty !== "all";

  const clearFilters = () => {
    setSearch("");
    setView("all");
    setPlatform("all");
    setRatingBand("all");
    setDifficulty("all");
    reset();
  };

  return (
    <Card flush>
      <div className="space-y-3 border-b border-line p-4">
        {showSearch && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                reset();
              }}
              placeholder="Search problems"
              className="pl-9"
            />
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          {platforms.length > 0 && (
            <Select
              aria-label="Filter by platform"
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                reset();
              }}
            >
              <option value="all">All platforms</option>
              {platforms.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          )}
          {ratingBands.length > 1 && (
            <Select
              aria-label="Filter by Codeforces rating"
              value={ratingBand}
              onChange={(e) => {
                setRatingBand(e.target.value as RatingBand);
                reset();
              }}
            >
              {ratingBands.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
          {difficulties.length > 0 && (
            <Select
              aria-label="Filter by A2OJ difficulty"
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                reset();
              }}
            >
              <option value="all">All A2OJ levels</option>
              {difficulties.map((level) => (
                <option key={level} value={level}>
                  Level {level}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] text-faint">
              {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} shown
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="cursor-pointer text-[11px] font-medium text-accent hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
          <Segmented
            value={view}
            onChange={(v) => {
              setView(v);
              reset();
            }}
            options={VIEWS}
            hideLabelsOnMobile={false}
            className="max-w-full overflow-x-auto no-scrollbar"
          />
        </div>
      </div>

      <ul className="divide-y divide-line">
        {visible.map(({ p, i, s }) => (
          <ProblemRowItem
            key={p.u}
            problem={p}
            position={showIndex ? i + 1 : null}
            status={s}
            onToggle={() => onToggle(p.u)}
            showRating={hasRatings}
            showDifficulty={difficulties.length > 0}
            showPlatform={platforms.length > 0}
          />
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="px-4 py-10 text-center text-[13px] text-muted">
          {view === "solved"
            ? "Nothing solved here yet."
            : view === "attempted"
              ? "No problems attempted-but-unsolved here."
              : view === "todo"
                ? "All done here."
                : "Nothing matches."}
        </p>
      )}

      {limit < filtered.length && (
        <div className="border-t border-line p-3">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setLimit((l) => l + PAGE * 4)}
          >
            Show more &middot; {pluralize(filtered.length - limit, "problem")} left
          </Button>
        </div>
      )}
    </Card>
  );
}

function ProblemRowItem({
  problem: p,
  position,
  status: s,
  onToggle,
  showRating,
  showDifficulty,
  showPlatform,
}: {
  problem: A2ojListProblem;
  position: number | null;
  status: A2ojStatus;
  onToggle: () => void;
  showRating: boolean;
  showDifficulty: boolean;
  showPlatform: boolean;
}) {
  const solved = s.state === "solved";
  // A verdict from Codeforces is not something a checkbox should be able to
  // undo, so the control is only interactive where the tick is the only source.
  const locked = solved && !s.manual;

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 transition-colors",
        s.state === "solved" && "bg-positive/[0.05]",
        s.state === "attempted" && "bg-warning/[0.05]",
        "hover:bg-elevated",
      )}
    >
      <button
        onClick={locked ? undefined : onToggle}
        aria-label={
          locked
            ? "Solved on Codeforces"
            : solved
              ? "Mark not done"
              : "Mark done"
        }
        title={
          locked
            ? "Accepted on Codeforces"
            : solved
              ? "Ticked by hand — click to clear"
              : "Mark done by hand"
        }
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
          locked ? "cursor-default" : "cursor-pointer",
          solved
            ? "border-positive bg-positive text-canvas"
            : s.state === "attempted"
              ? "border-warning hover:border-accent"
              : "border-line-strong hover:border-accent",
        )}
        style={
          s.state === "attempted"
            ? { backgroundColor: "color-mix(in srgb, var(--warning) 18%, transparent)" }
            : undefined
        }
      >
        {solved ? (
          <Check className="size-3" strokeWidth={3} />
        ) : s.state === "attempted" ? (
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: DOT.attempted }}
          />
        ) : null}
      </button>

      {position !== null && (
        <span className="w-6 shrink-0 font-mono text-[11px] tabular-nums text-faint">
          {position}
        </span>
      )}

      <a
        href={p.u}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "min-w-0 grow truncate text-[13px] font-medium transition-colors hover:underline",
          solved ? "text-faint line-through" : "text-ink",
        )}
      >
        {p.i && p.c ? `${p.c}${p.i} · ` : p.i ? `${p.i} · ` : ""}
        {p.n}
      </a>

      {/* Solved, but not first try — the submit-before-verifying tell. */}
      {s.failedFirst && (
        <span
          title={
            solved
              ? "Accepted, but not on the first submission"
              : "Attempted with a rejected submission"
          }
          className="grid size-4 shrink-0 place-items-center rounded"
          style={{
            color: "var(--negative)",
            backgroundColor: "color-mix(in srgb, var(--negative) 12%, transparent)",
          }}
        >
          <X className="size-2.5" strokeWidth={3} />
        </span>
      )}

      {s.manual && (
        <span
          title="Ticked by hand, not from a Codeforces verdict"
          className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-faint"
        >
          manual
        </span>
      )}

      <div className="flex shrink-0 items-center gap-1">
        {showRating &&
          (p.r ? (
            <span title={`Codeforces rating ${p.r}`}>
              <RatingChip rating={p.r} showUnrated={false} />
            </span>
          ) : (
            <Badge
              variant="outline"
              size="sm"
              className="text-faint"
              title="No current Codeforces rating"
            >
              Unrated
            </Badge>
          ))}
        {showDifficulty && p.d ? (
          <Badge
            variant="outline"
            size="sm"
            title={`A2OJ difficulty level ${p.d}`}
          >
            L{p.d}
          </Badge>
        ) : null}
        {showPlatform && p.p ? (
          <Badge variant="outline" size="sm" title={`Platform: ${p.p}`}>
            <span className="sm:hidden">{shortPlatform(p.p)}</span>
            <span className="hidden sm:inline">{p.p}</span>
          </Badge>
        ) : null}
      </div>
    </li>
  );
}

/** Solved / attempted / remaining for a set, with the bar. */
export function A2ojProgressCard({
  problems,
  statusOf,
  note,
}: {
  problems: A2ojListProblem[];
  statusOf: (p: A2ojListProblem) => A2ojStatus;
  note?: string;
}) {
  const tally = useMemo(() => {
    let solved = 0;
    let attempted = 0;
    let offJudge = 0;
    for (const p of problems) {
      const s = statusOf(p);
      if (s.state === "solved") solved++;
      else if (s.state === "attempted") attempted++;
      if (!cfKeyOf(p)) offJudge++;
    }
    return { solved, attempted, offJudge, total: problems.length };
  }, [problems, statusOf]);

  const pct = tally.total ? (tally.solved / tally.total) * 100 : 0;
  const attemptedPct = tally.total ? (tally.attempted / tally.total) * 100 : 0;

  return (
    <Card className="mb-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Solved", value: tally.solved, color: "var(--positive)" },
          { label: "Attempted", value: tally.attempted, color: "var(--warning)" },
          {
            label: "Remaining",
            value: tally.total - tally.solved,
            color: "var(--ink)",
          },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
              {s.label}
            </p>
            <p
              className="mt-1 font-mono text-xl font-semibold leading-none tabular-nums"
              style={{ color: s.color }}
            >
              {s.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Attempted is stacked behind solved so the bar shows the work already
          started, not just the work finished. */}
      <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-sunken">
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
          style={{ width: `${pct}%`, backgroundColor: "var(--positive)" }}
        />
      </div>

      <p className="mt-2 flex items-baseline justify-between text-[11px] text-faint">
        <span>
          {tally.solved.toLocaleString()} / {tally.total.toLocaleString()}
          {tally.offJudge > 0 &&
            ` · ${tally.offJudge} not on Codeforces, tick those by hand`}
        </span>
        <span className="font-mono font-semibold tabular-nums text-muted">
          {Math.round(pct)}%
        </span>
      </p>

      {note && <p className="mt-2 text-[11px] leading-snug text-faint">{note}</p>}
    </Card>
  );
}
