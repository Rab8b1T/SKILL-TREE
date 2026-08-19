/**
 * Real solve state for A2OJ problems, read from Codeforces submissions rather
 * than from a checkbox.
 *
 * A ladder is a list of problems you may well have already solved — through a
 * contest, the picker, or years ago. Requiring a manual tick to turn a row green
 * means an account with hundreds of accepted problems shows an empty ladder,
 * which is both wrong and demoralising. The tick survives only as an override for
 * problems Codeforces cannot speak for: the category sets include SPOJ, UVa and
 * other judges.
 *
 * Pure and universal on purpose — the hooks live in `use-a2oj-status.ts` so this
 * half stays callable from a route handler.
 */

export type A2ojState = "solved" | "attempted" | "unsolved";

export interface A2ojStatus {
  state: A2ojState;
  /** Accepted, but only after a rejected submission on the same problem. */
  failedFirst: boolean;
  /** Ticked by hand rather than derived from a verdict. */
  manual: boolean;
}

const UNSOLVED: A2ojStatus = {
  state: "unsolved",
  failedFirst: false,
  manual: false,
};

export interface A2ojProblemRef {
  /** Problem URL, the manual tick-off key. */
  u: string;
  /** Codeforces contest id, absent on problems from other judges. */
  c?: number | null;
  /** Codeforces problem index. */
  i?: string | null;
}

export function cfKeyOf(p: A2ojProblemRef): string | null {
  return p.c && p.i ? `${p.c}-${p.i}` : null;
}

export interface CfSolveIndex {
  /** Problem key to the number of submissions it took. */
  solved: Map<string, number>;
  /** Attempted with a rejected verdict and never accepted. */
  attempted: Set<string>;
}

export function statusFor(
  p: A2ojProblemRef,
  cf: CfSolveIndex | null,
  manuallyDone: ReadonlySet<string>,
): A2ojStatus {
  const key = cfKeyOf(p);

  // An accept on Codeforces is the one signal that cannot be wrong, so it wins.
  if (key && cf) {
    const attempts = cf.solved.get(key);
    if (attempts !== undefined) {
      return { state: "solved", failedFirst: attempts > 1, manual: false };
    }
  }

  // Then the manual override, which is how a non-Codeforces problem gets ticked.
  if (manuallyDone.has(p.u)) {
    return { state: "solved", failedFirst: false, manual: true };
  }

  if (key && cf?.attempted.has(key)) {
    return { state: "attempted", failedFirst: true, manual: false };
  }

  return UNSOLVED;
}

export interface Tally {
  solved: number;
  attempted: number;
  total: number;
}

/**
 * Progress for a set given only its Codeforces keys — what the overview pages
 * have, since they deliberately do not load every problem list.
 */
export function tallyKeys(
  keys: string[] | undefined,
  cf: CfSolveIndex | null,
  total: number,
  manualCount = 0,
): Tally {
  if (!keys || !cf) return { solved: manualCount, attempted: 0, total };

  let solved = 0;
  let attempted = 0;
  for (const key of keys) {
    if (cf.solved.has(key)) solved++;
    else if (cf.attempted.has(key)) attempted++;
  }

  // Manual ticks can only add problems Codeforces has no record of, so they are
  // capped at the unaccounted remainder rather than double-counted.
  const room = Math.max(0, total - solved);
  return { solved: solved + Math.min(manualCount, room), attempted, total };
}
