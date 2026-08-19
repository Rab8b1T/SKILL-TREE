"use client";

import { useCallback, useMemo } from "react";
import { useCfProfile } from "./queries";
import { useA2ojProgress } from "./use-a2oj-progress";
import {
  statusFor,
  type A2ojProblemRef,
  type CfSolveIndex,
} from "./a2oj-status";

/** Submission history collapsed into the two lookups the A2OJ views need. */
export function useCfSolveIndex(handle: string | null | undefined) {
  const { data: profile, isLoading } = useCfProfile(handle);

  const index = useMemo<CfSolveIndex | null>(() => {
    if (!profile) return null;
    const solved = new Map<string, number>();
    for (const p of profile.stats.solved) solved.set(p.key, p.attempts);
    return {
      solved,
      attempted: new Set(profile.stats.unsolved.map((p) => p.key)),
    };
  }, [profile]);

  return { index, isLoading };
}

/**
 * Status for one ladder or category, plus the manual toggle. `slug` scopes the
 * ticks; omit it on overview pages that only need the Codeforces index.
 */
export function useA2ojStatus(
  handle: string | null | undefined,
  slug?: string,
) {
  const { index, isLoading } = useCfSolveIndex(handle);
  const { done, toggle } = useA2ojProgress(handle, slug);

  const statusOf = useCallback(
    (p: A2ojProblemRef) => statusFor(p, index, done),
    [index, done],
  );

  return { statusOf, toggle, cf: index, done, isLoading };
}
