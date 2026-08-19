"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { tagGaps, type SolvedProblem } from "@/lib/cf";
import { Badge } from "@/components/ui/badge";

/**
 * Tags ranked by how few in-band solves they have. A tag with zero solves at or
 * above the growth floor is a real blind spot and outranks a topic that merely
 * feels weak, so those are surfaced first and labelled as such.
 */
export function TagGapList({
  solved,
  floor,
  limit = 8,
}: {
  solved: SolvedProblem[];
  floor: number;
  limit?: number;
}) {
  const gaps = tagGaps(solved, floor).slice(0, limit);

  if (!gaps.length) {
    return (
      <p className="py-6 text-center text-[13px] text-muted">
        Not enough solves to find gaps yet.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {gaps.map(({ tag, total, inBand }) => (
        <li key={tag}>
          <Link
            href={`/practice?tags=${encodeURIComponent(tag)}`}
            className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-elevated"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[13px] font-medium text-ink">
                {tag}
              </span>
              {inBand === 0 && (
                <Badge variant="negative" size="sm">
                  blind spot
                </Badge>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="font-mono text-[11px] tabular-nums text-muted">
                {inBand}
                <span className="text-faint">/{total}</span>
              </span>
              <ArrowUpRight className="size-3.5 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
