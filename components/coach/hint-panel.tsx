"use client";

import { BookOpen, Lightbulb, Lock } from "lucide-react";
import {
  hintAccess,
  phaseAt,
  type CoachProblem,
  type Hint,
  type RunEntry,
} from "@/lib/coach";
import type { RunController } from "@/lib/use-run";
import { cn } from "@/lib/utils";
import { Card, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FigureView } from "@/components/coach/figure";

/**
 * The hints for the problem on the clock, and the lock in front of them.
 *
 * These are written before the session, with the problem already solved and
 * stress-verified, because a hint improvised at the moment you are stuck comes
 * from someone who has not solved it either. Writing them early means they are
 * sitting here from the first second of the attempt, so the discipline has to be
 * the gate rather than their absence: nothing opens while the cap is still
 * yours, and a round seals all of it until the round is over.
 *
 * Rungs open one at a time and never close. The count is the point — a solve
 * that took three rungs is a different result from an unaided one, and only the
 * second is allowed to move mastery, so the number is recorded rather than
 * guessed at afterwards.
 */
export function HintPanel({
  problem,
  seconds,
  entry,
  ctl,
  contestOpen = false,
}: {
  problem: CoachProblem;
  /**
   * The problem's own clock, which selects the phase gate. Omitted by the
   * contest runner: a round has one gate for every problem in it — the round
   * itself — so there is no per-problem phase to consult, and once it is over
   * the whole ladder is open for the upsolve.
   */
  seconds?: number;
  entry: RunEntry | undefined;
  ctl: RunController;
  contestOpen?: boolean;
}) {
  const hints = problem.hints;
  if (!hints?.ladder?.length) return null;

  const phase =
    seconds == null ? null : phaseAt(problem.capMinutes, seconds).phase;
  const access = hintAccess(hints, phase?.id ?? null, contestOpen);
  const total = hints.ladder.length;

  if (access.blocked) {
    return (
      <Card className="flex flex-wrap items-center gap-3 border-line-strong bg-elevated">
        <Lock className="size-4 shrink-0 text-faint" />
        <div className="min-w-0 grow">
          <p className="text-[13px] font-medium text-ink">
            {total} hint{total === 1 ? "" : "s"} ready for this one
          </p>
          <p className="mt-0.5 text-[12px] text-muted">{access.blocked}</p>
        </div>
      </Card>
    );
  }

  const opened = Math.min(entry?.hintsUsed ?? 0, access.rungs);
  const shown = hints.ladder.slice(0, opened);
  const remaining = total - opened;
  const solutionSeen = entry?.solutionSeen === true;

  return (
    <Card flush className="border-warning/30">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-4 text-warning" />
          <CardTitle>Hints</CardTitle>
        </div>
        <Badge variant={opened > 0 ? "warning" : "neutral"}>
          {opened} of {total} opened
        </Badge>
      </div>

      <div className="space-y-4 p-5">
        {opened === 0 && (
          <p className="text-[13px] text-muted">
            Each one is a question first. Take the smallest that gets you moving
            again — every rung you open is recorded, so a hinted solve stays
            honestly separate from an unaided one.
          </p>
        )}

        {shown.map((hint, i) => (
          <Rung key={i} index={i} hint={hint} last={i === shown.length - 1} />
        ))}

        {remaining > 0 && (
          <Button
            variant={opened === 0 ? "accent" : "secondary"}
            onClick={() => ctl.openHint(problem.key)}
          >
            <Lightbulb />
            {opened === 0 ? "Open the first hint" : `Open hint ${opened + 1}`}
            <span className="text-faint">· {remaining} left</span>
          </Button>
        )}

        {remaining === 0 && !access.solution && (
          <p className="text-[12.5px] text-muted">
            That is every hint. The editorial opens when this phase ends — until
            then the idea is still yours to find.
          </p>
        )}

        {hints.solution && access.solution && (
          <div className="border-t border-line pt-4">
            {solutionSeen ? (
              <div>
                <SectionLabel>The idea</SectionLabel>
                <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink">
                  {hints.solution.say}
                </p>
                {hints.solution.figure && (
                  <FigureView spec={hints.solution.figure} />
                )}
                <p className="mt-3 text-[12px] text-muted">
                  Read it once, close this, and re-implement from scratch with
                  nothing open. Copying it out teaches the typing, not the idea.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 grow">
                  <p className="text-[13px] font-medium text-ink">
                    The editorial is open now
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    Opening it makes this an upsolve rather than a solve, which
                    is the honest label and the one the morning plan reads.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => ctl.openSolution(problem.key)}
                >
                  <BookOpen />
                  Show the idea
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * The complete prepared path after an attempt is settled.
 *
 * A verdict clears `activeKey`, so the phase-gated panel above is no longer
 * mounted. Keeping the review here prevents a solved or failed row from falling
 * back to the old one-line `reveal` field and losing every authored question
 * and diagram precisely when the user asks to inspect the intended idea.
 */
export function PreparedHintReview({ problem }: { problem: CoachProblem }) {
  const hints = problem.hints;

  if (!hints?.ladder?.length) {
    return problem.reveal ? (
      <p className="rounded-xl border border-line bg-elevated px-3 py-2 text-[12.5px] leading-relaxed text-ink">
        {problem.reveal}
      </p>
    ) : null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-warning/30 bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-4 text-warning" />
          <CardTitle>Prepared hint path</CardTitle>
        </div>
        <Badge variant="warning">{hints.ladder.length} hints</Badge>
      </div>

      <div className="space-y-4 p-4">
        {hints.ladder.map((hint, i) => (
          <Rung
            key={i}
            index={i}
            hint={hint}
            last={i === hints.ladder.length - 1}
          />
        ))}

        {hints.solution && (
          <div className="border-t border-line pt-4">
            <SectionLabel>The intended idea</SectionLabel>
            <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink">
              {hints.solution.say}
            </p>
            {hints.solution.figure && (
              <FigureView spec={hints.solution.figure} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Rung({
  index,
  hint,
  last,
}: {
  index: number;
  hint: Hint;
  last: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-3",
        !last && "border-b border-line/70 pb-4",
      )}
    >
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-warning/15 font-mono text-[11px] font-semibold text-warning">
        {index + 1}
      </span>
      <div className="min-w-0 grow">
        <p className="text-[13.5px] font-medium leading-relaxed text-ink">
          {hint.ask}
        </p>
        {hint.say && (
          <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-muted">
            {hint.say}
          </p>
        )}
        {hint.figure && <FigureView spec={hint.figure} />}
      </div>
    </div>
  );
}
