"use client";

import { ExternalLink } from "lucide-react";
import {
  VERDICT_LABEL,
  problemUrl,
  verdictColor,
  type CfSubmission,
} from "@/lib/cf";
import { RatingChip } from "@/components/ui/rating";
import { relativeTime } from "@/lib/utils";

export function RecentVerdicts({
  submissions,
  limit = 10,
}: {
  submissions: CfSubmission[];
  limit?: number;
}) {
  const rows = submissions.slice(0, limit);

  if (!rows.length) {
    return (
      <p className="py-6 text-center text-[13px] text-muted">
        No submissions yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {rows.map((s) => (
        <li key={s.id}>
          <a
            href={problemUrl(s.problem)}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 py-2.5 transition-opacity hover:opacity-80"
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: verdictColor(s.verdict) }}
            />
            <span className="min-w-0 grow">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-medium text-ink">
                  {s.problem.index}. {s.problem.name}
                </span>
                <ExternalLink className="size-3 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-faint">
                <span style={{ color: verdictColor(s.verdict) }}>
                  {VERDICT_LABEL[s.verdict ?? ""] ?? s.verdict ?? "Pending"}
                </span>
                <span>&middot;</span>
                <span>{relativeTime(s.creationTimeSeconds * 1000)}</span>
              </span>
            </span>
            <RatingChip rating={s.problem.rating} className="shrink-0" />
          </a>
        </li>
      ))}
    </ul>
  );
}
