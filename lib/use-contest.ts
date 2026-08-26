"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useContestActive } from "./queries";
import type { ContestActiveDoc, VirtualContest } from "./types";

const SAVE_DEBOUNCE_MS = 500;

async function patchActive(
  version: number,
  contest: VirtualContest,
): Promise<ContestActiveDoc> {
  const response = await fetch("/api/contest/active", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version, contest }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? "Could not save the contest");
  }
  return body as ContestActiveDoc;
}

/**
 * Small, versioned active-state queue. Live clicks update immediately, writes
 * are coalesced, and only one version can be in flight at a time.
 */
export function useContestController(handle?: string | null) {
  const query = useContestActive(handle);
  const queryClient = useQueryClient();
  const [doc, setDoc] = useState<ContestActiveDoc>({
    contest: null,
    version: 0,
    savedAt: null,
  });
  const [saving, setSaving] = useState(false);
  const docRef = useRef(doc);
  const queued = useRef<VirtualContest | null>(null);
  const inFlight = useRef<Promise<ContestActiveDoc> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accept = useCallback(
    (next: ContestActiveDoc) => {
      docRef.current = next;
      setDoc(next);
      queryClient.setQueryData(["contest-system", "active", handle], next);
      return next;
    },
    [handle, queryClient],
  );

  useEffect(() => {
    if (!query.isSuccess || query.isPlaceholderData) return;
    if (queued.current || inFlight.current) return;
    accept(query.data);
  }, [accept, query.data, query.isPlaceholderData, query.isSuccess]);

  const refetch = query.refetch;
  const flush = useCallback((): Promise<ContestActiveDoc> => {
    if (inFlight.current) return inFlight.current;
    const operation = (async () => {
      setSaving(true);
      try {
        while (queued.current) {
          const next = queued.current;
          queued.current = null;
          try {
            accept(await patchActive(docRef.current.version, next));
          } catch (error) {
            toast.error((error as Error).message);
            const refreshed = await refetch();
            if (refreshed.data) accept(refreshed.data);
            throw error;
          }
        }
        return docRef.current;
      } finally {
        inFlight.current = null;
        setSaving(false);
      }
    })();
    inFlight.current = operation;
    return operation;
  }, [accept, refetch]);

  const update = useCallback(
    (contest: VirtualContest) => {
      const local = { ...docRef.current, contest };
      docRef.current = local;
      setDoc(local);
      queued.current = contest;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  const saveNow = useCallback(
    (contest: VirtualContest) => {
      update(contest);
      if (timer.current) clearTimeout(timer.current);
      return flush();
    },
    [flush, update],
  );

  useEffect(() => {
    const flushOnExit = () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    };
    window.addEventListener("pagehide", flushOnExit);
    return () => {
      window.removeEventListener("pagehide", flushOnExit);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);

  return {
    ...doc,
    query,
    ready: query.isSuccess && !query.isPlaceholderData,
    saving,
    update,
    saveNow,
  };
}
