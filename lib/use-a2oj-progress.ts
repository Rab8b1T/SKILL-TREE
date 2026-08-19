"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { usePracticeData, useSavePracticeData } from "./queries";

/**
 * Tick-off state for A2OJ ladders and topics, stored inside the practice
 * document under `ladderProgress` keyed by slug. Problems are identified by
 * their URL because the scraped sets span judges that have no shared id scheme.
 */
export function useA2ojProgress(handle: string | null | undefined, slug?: string) {
  const query = usePracticeData(handle);
  const save = useSavePracticeData(handle);

  const all = useMemo(() => query.data?.ladderProgress ?? {}, [query.data]);
  const done = useMemo(
    () => new Set(slug ? (all[slug] ?? []) : []),
    [all, slug],
  );

  const toggle = useCallback(
    (url: string) => {
      if (!slug || !query.data) return;
      const current = new Set(all[slug] ?? []);
      if (current.has(url)) current.delete(url);
      else current.add(url);

      save.mutate(
        {
          ...query.data,
          ladderProgress: { ...all, [slug]: [...current] },
          lastKnownSavedAt: query.data.savedAt ?? null,
        },
        { onError: (err) => toast.error(err.message) },
      );
    },
    [slug, query.data, all, save],
  );

  const countFor = useCallback((s: string) => (all[s] ?? []).length, [all]);

  return { done, toggle, countFor, isLoading: query.isLoading };
}
