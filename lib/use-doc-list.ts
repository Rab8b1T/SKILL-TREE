"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

/**
 * The three per-user documents are saved whole rather than patched, so every
 * edit is "read current, transform, write back". This wraps that so the pages
 * don't each reimplement it, and so a save conflict surfaces as a toast instead
 * of silently losing the change.
 */
export function useDocList<TDoc extends object, TItem>(
  query: UseQueryResult<TDoc & { savedAt?: string | null }>,
  save: UseMutationResult<{ ok: true; savedAt: string }, Error, TDoc & { lastKnownSavedAt?: string | null }, unknown>,
  key: keyof TDoc,
) {
  const doc = query.data;
  // Memoised so the empty fallback keeps one identity; callers put this in
  // dependency arrays and a fresh [] each render would re-run all of them.
  const items = useMemo(
    () => ((doc?.[key] as TItem[] | undefined) ?? []) as TItem[],
    [doc, key],
  );

  const update = useCallback(
    (
      transform: (current: TItem[]) => TItem[],
      opts?: { extra?: Partial<TDoc>; silent?: boolean },
    ) => {
      if (!doc) return;
      const next = transform(items);
      save.mutate(
        {
          ...doc,
          ...opts?.extra,
          [key]: next,
          lastKnownSavedAt: doc.savedAt ?? null,
        } as TDoc & { lastKnownSavedAt?: string | null },
        {
          onError: (err) => {
            if (!opts?.silent) toast.error(err.message);
          },
          onSuccess: () => {
            // A 409 comes back as an error, so reaching here means the write
            // landed on top of the copy we read.
            void query.refetch;
          },
        },
      );
    },
    [doc, items, key, save, query],
  );

  return { items, update, doc, isSaving: save.isPending };
}
