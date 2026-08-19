"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { TagRecency } from "@/lib/progression";
import { ratingColor } from "@/lib/cf";
import { pluralize } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Bands chosen to match the +7/+21 day spacing the practice schedule uses. */
function staleness(days: number): { label: string; color: string } {
  if (days <= 7) return { label: "fresh", color: "var(--positive)" };
  if (days <= 21) return { label: "due", color: "var(--warning)" };
  if (days <= 60) return { label: "stale", color: "var(--negative)" };
  return { label: "cold", color: "var(--negative)" };
}

/**
 * Topics ordered by how long ago they were last practised. The radar shows
 * volume; this shows decay — a topic with 40 solves, none this quarter, is being
 * forgotten, and volume charts cannot say that.
 */
export function TopicRecency({
  tags,
  limit = 10,
  minCount = 2,
}: {
  tags: TagRecency[];
  limit?: number;
  minCount?: number;
}) {
  // A tag seen once is noise, not a topic that has decayed.
  const rows = tags.filter((t) => t.count >= minCount).slice(0, limit);

  if (!rows.length) {
    return (
      <p className="py-6 text-center text-[13px] text-muted">
        Not enough solve history yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {rows.map((t) => {
        const s = staleness(t.daysSince);
        return (
          <li key={t.tag} className="flex items-center gap-3 py-2.5">
            <span
              className="w-14 shrink-0 text-right font-mono text-[11px] font-semibold tabular-nums"
              style={{ color: s.color }}
            >
              {t.daysSince}d
            </span>

            <div className="min-w-0 grow">
              <p className="truncate text-[13px] font-medium text-ink">{t.tag}</p>
              <p className="mt-0.5 font-mono text-[11px] tabular-nums text-faint">
                {pluralize(t.count, "solve")} &middot; best{" "}
                <span style={{ color: ratingColor(t.bestRating) }}>
                  {t.bestRating || "—"}
                </span>
              </p>
            </div>

            <span
              className={cn(
                "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              )}
              style={{
                color: s.color,
                backgroundColor: `color-mix(in srgb, ${s.color} 12%, transparent)`,
              }}
            >
              {s.label}
            </span>

            <Link
              href={`/practice?tags=${encodeURIComponent(t.tag)}`}
              className="shrink-0 rounded-md p-1 text-faint transition-colors hover:bg-elevated hover:text-accent"
              aria-label={`Practise ${t.tag}`}
            >
              <ArrowUpRight className="size-3.5" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
