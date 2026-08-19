import { cn } from "@/lib/utils";
import { rankFor, ratingColor, nextRankAt } from "@/lib/cf";

/** A problem or user rating, coloured by its Codeforces rank band. */
export function RatingChip({
  rating,
  className,
  showUnrated = true,
}: {
  rating?: number | null;
  className?: string;
  showUnrated?: boolean;
}) {
  if (!rating) {
    if (!showUnrated) return null;
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-faint tabular-nums",
          className,
        )}
      >
        &ndash;
      </span>
    );
  }
  const color = ratingColor(rating);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums",
        className,
      )}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {rating}
    </span>
  );
}

/** Handle rendered in its rank colour, the way Codeforces itself shows it. */
export function HandleText({
  handle,
  rating,
  className,
}: {
  handle: string;
  rating?: number | null;
  className?: string;
}) {
  return (
    <span
      className={cn("font-semibold", className)}
      style={{ color: ratingColor(rating) }}
    >
      {handle}
    </span>
  );
}

/** Rank name plus the gap to the next rank — the sidebar's progress readout. */
export function RankProgress({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  const rank = rankFor(rating);
  const next = nextRankAt(rating);
  const span = next ? next.rank.min - rank.min : 1;
  const done = next ? rating - rank.min : span;
  const pct = Math.max(2, Math.min(100, (done / span) * 100));

  return (
    <div className={cn("rounded-xl bg-elevated p-3", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="truncate text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: rank.color }}
        >
          {rank.short === "NB" ? rank.name : rank.short}
        </span>
        <span className="font-mono text-[11px] text-muted tabular-nums">
          {rating}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, backgroundColor: rank.color }}
        />
      </div>
      <p className="mt-1.5 text-[10px] leading-tight text-faint">
        {next
          ? `${next.needed} to ${next.rank.short === "NB" ? next.rank.name : next.rank.short}`
          : "Top rank"}
      </p>
    </div>
  );
}
