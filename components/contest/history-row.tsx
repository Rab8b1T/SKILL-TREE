"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { divisionLabel } from "@/lib/contest";
import { relativeTime } from "@/lib/utils";
import type { ContestRoundDoc } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function ContestHistoryRow({ round }: { round: ContestRoundDoc }) {
  return (
    <li>
      <Link
        href={`/contest/rounds/${encodeURIComponent(round.roundId)}`}
        className="flex items-center gap-3 py-3 transition-colors hover:bg-elevated"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sunken text-[11px] font-bold text-ink">
          {round.solved}/{round.total}
        </span>
        <div className="min-w-0 grow">
          <p className="truncate text-[13px] font-medium text-ink">{round.name}</p>
          <p className="mt-0.5 text-[11px] text-faint">
            {relativeTime(round.finishedAt)}
            {round.programSequence ? ` · contest ${round.programSequence}` : ""}
            {round.scoringMode === "cf"
              ? ` · ${round.points} pts`
              : ` · ${round.penaltyMinutes}m penalty`}
          </p>
        </div>
        <Badge variant="outline" size="sm">
          {round.source === "coach" ? "Coach" : divisionLabel(round.division)}
        </Badge>
        <ArrowRight className="size-4 text-faint" />
      </Link>
    </li>
  );
}
