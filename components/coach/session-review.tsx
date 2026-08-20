"use client";

import { Check, Minus, SkipForward, X } from "lucide-react";
import { problemUrl, ratingColor } from "@/lib/cf";
import type { ProblemVerdictLine, RunAnalysis, RunDoc } from "@/lib/coach";
import { cn, formatClock, formatDuration } from "@/lib/utils";
import { SectionLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * The verified record of one session: the same figures the coach reads the next
 * morning, so there is never a private version of what happened.
 */
export function SessionReview({
  analysis,
  run,
  showFocus,
}: {
  analysis: RunAnalysis;
  run: RunDoc;
  showFocus: boolean;
}) {
  const deskMinutes = Math.max(0, analysis.wallMinutes - analysis.breakMinutes);

  return (
    <div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Stat label="Solved" value={`${analysis.solved}/${analysis.total}`} />
        <Stat label="Engaged" value={`${analysis.engagedMinutes}m`} />
        <Stat label="At the desk" value={`${deskMinutes}m`} />
        {analysis.breakMinutes > 0 && (
          <Stat
            label={`Break${analysis.breakCount > 1 ? `s (${analysis.breakCount})` : ""}`}
            value={`${analysis.breakMinutes}m`}
          />
        )}
        {showFocus && (
          <Stat label="Focus" value={`${Math.round(analysis.focus * 100)}%`} />
        )}
        {analysis.overCap > 0 && (
          <Stat label="Over cap" value={String(analysis.overCap)} tone="warning" />
        )}
        {analysis.wrongAttempts > 0 && (
          <Stat
            label="Wrong attempts"
            value={String(analysis.wrongAttempts)}
            tone="negative"
          />
        )}
        {analysis.discriminationAttempts > 0 && (
          <Stat
            label="Technique named"
            value={`${analysis.discriminationAttempts - analysis.discriminationErrors}/${analysis.discriminationAttempts}`}
            tone={analysis.discriminationErrors > 0 ? "warning" : undefined}
          />
        )}
      </div>

      {!run.finishedAt && (
        <p className="mt-3 text-[12px] text-warning">
          This session was never closed out, so the desk figure runs to now.
        </p>
      )}

      <ul className="mt-4 divide-y divide-line border-t border-line">
        {analysis.lines.map((line) => (
          <ProblemLine key={line.problem.key} line={line} run={run} />
        ))}
      </ul>
    </div>
  );
}

const STATUS: Record<
  ProblemVerdictLine["status"],
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    className: string;
  }
> = {
  solved: { icon: Check, label: "solved", className: "text-positive" },
  failed: { icon: X, label: "failed", className: "text-negative" },
  skipped: { icon: SkipForward, label: "skipped", className: "text-muted" },
  todo: { icon: Minus, label: "never attempted", className: "text-faint" },
};

function ProblemLine({ line, run }: { line: ProblemVerdictLine; run: RunDoc }) {
  const { problem, seconds, status, wrongAttempts, overCap } = line;
  const entry = run.entries[problem.key];
  const status_ = STATUS[status];
  const Icon = status_.icon;

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Icon className={cn("size-4 shrink-0", status_.className)} />
        <a
          href={problemUrl(problem)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13.5px] font-medium text-ink hover:text-accent hover:underline"
        >
          {problem.index}. {problem.name}
        </a>
        <span
          className="font-mono text-[11.5px] tabular-nums"
          style={{ color: ratingColor(problem.rating) }}
        >
          {problem.rating}
        </span>
        <div className="grow" />
        {wrongAttempts > 0 && (
          <Badge variant="negative">
            {wrongAttempts} wrong
          </Badge>
        )}
        <span
          className={cn(
            "font-mono text-[12.5px] tabular-nums",
            overCap ? "text-warning" : "text-muted",
          )}
        >
          {seconds > 0 ? formatClock(seconds) : "—"}
          <span className="text-faint"> / {problem.capMinutes}m cap</span>
        </span>
      </div>

      {(entry?.technique || entry?.note) && (
        <div className="mt-1.5 space-y-1 pl-7">
          {entry.technique && (
            <p className="text-[12.5px] text-muted">
              <span className="text-faint">Called it: </span>
              {entry.technique}
              {entry.techniqueRight === false && (
                <span className="text-negative"> — wrong technique</span>
              )}
              {entry.techniqueRight === true && (
                <span className="text-positive"> — right</span>
              )}
            </p>
          )}
          {entry.note && (
            <p className="text-[12.5px] italic text-muted">{entry.note}</p>
          )}
        </div>
      )}

      {status === "solved" && entry?.solvedAtSeconds !== undefined && (
        <p className="mt-1 pl-7 text-[11.5px] text-faint">
          Accepted after {formatDuration(entry.solvedAtSeconds)} of engaged work.
        </p>
      )}
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning" | "negative";
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p
        className={cn(
          "mt-0.5 font-mono text-lg font-semibold leading-none tabular-nums",
          tone === "warning" && "text-warning",
          tone === "negative" && "text-negative",
          !tone && "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}
