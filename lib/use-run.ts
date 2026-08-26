"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useArenaData, useSaveArenaData } from "./queries";
import {
  activeSeconds,
  emptyEntry,
  emptyRun,
  runId,
  type CoachDay,
  type RunDoc,
  type RunEntry,
  type RunStatus,
} from "./coach";

/**
 * How the clock decides you are working: you tell it.
 *
 * The app is a companion, not the workspace. The statement is read on
 * Codeforces and the code is written in the editor, so for most of a real
 * session this tab is hidden, receives no events, and has its timers throttled
 * to roughly one a minute. Every attempt to infer effort from that — pointer
 * activity, tab visibility, the lateness of a tick — measures the browser
 * rather than you, and the earlier version of this file stopped the clock once
 * a minute for exactly that reason.
 *
 * So nothing is inferred. A problem's clock starts when you press Start and
 * runs until you press Break or give it a verdict. There is no session clock,
 * no focus ratio, no idle detection and no heartbeat, and losing the tab is not
 * an event the clock can observe: elapsed time is the distance between two
 * stored timestamps, so a reload, a closed tab or a second machine all arrive
 * at the same answer.
 */

/** Writes are coalesced this long so a burst of clicks is one request. */
const FLUSH_DEBOUNCE_MS = 1_200;

export interface RunController {
  run: RunDoc | null;
  ready: boolean;
  saving: boolean;
  begin: () => void;
  /** Puts the clock on a problem. One at a time. */
  startProblem: (key: string) => void;
  /** Stops the running clock. The problem is remembered, the time is not. */
  takeBreak: () => void;
  /** Problem the last break was taken from, while nothing else is running. */
  restingKey: string | null;
  /**
   * `atSeconds` overrides the recorded solve time. Practice leaves it out and
   * is billed its own clock; a contest passes the round clock, because a round
   * charges you for the minutes you spent on a different problem too.
   */
  setStatus: (key: string, status: RunStatus, atSeconds?: number) => void;
  addWrong: (key: string) => void;
  removeWrong: (key: string) => void;
  setTechnique: (key: string, technique: string) => void;
  setTechniqueRight: (key: string, right: boolean) => void;
  /** Opens the next hint rung. Monotonic — a hint cannot be unseen. */
  openHint: (key: string) => void;
  openSolution: (key: string) => void;
  setNote: (key: string, note: string) => void;
  finish: (review?: string) => RunDoc | null;
  reopen: () => void;
}

const entryOf = (run: RunDoc, key: string): RunEntry =>
  run.entries[key] ?? emptyEntry(key);

/** Closes whatever clock is running. Pure, so every action can reuse it. */
function stopClock(prev: RunDoc, at = Date.now()): RunDoc {
  if (!prev.activeKey) return prev;
  const entry = entryOf(prev, prev.activeKey);
  const segments = entry.segments.map((s) =>
    s.to === null ? { from: s.from, to: Math.max(s.from, at) } : s,
  );
  return {
    ...prev,
    activeKey: null,
    entries: { ...prev.entries, [prev.activeKey]: { ...entry, segments } },
  };
}

/** Opens a segment on `key` and makes it the running problem. */
function startClock(prev: RunDoc, key: string, at = Date.now()): RunDoc {
  const entry = entryOf(prev, key);
  return {
    ...prev,
    activeKey: key,
    restingKey: null,
    entries: {
      ...prev.entries,
      [key]: { ...entry, segments: [...entry.segments, { from: at, to: null }] },
    },
  };
}

export function useRun(
  kind: "practice" | "contest",
  day: CoachDay | null,
  handle?: string | null,
): RunController {
  const query = useArenaData(handle);
  const save = useSaveArenaData(handle);

  const [run, setRun] = useState<RunDoc | null>(null);
  const runRef = useRef<RunDoc | null>(null);
  const hydrated = useRef<string | null>(null);
  const savedAtRef = useRef<string | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const id = day ? runId(kind, day.day) : null;

  // `useStore` serves a placeholder `{ runs: {} }` before the fetch lands, so
  // "data exists" is not the same as "data is real". Hydrating from the
  // placeholder would decide the day had never been started and let Start
  // overwrite a session already in progress, which is the one bug in here that
  // destroys work rather than mismeasuring it.
  const loaded = query.isSuccess && !query.isPlaceholderData;

  // Hydrate once per run id, verbatim. A running clock is stored as an open
  // segment and is meant to still be running when it is read back — that is the
  // whole of what "closing the tab does not stop the timer" means, so nothing
  // here is allowed to close it.
  useEffect(() => {
    if (!id || !loaded) return;
    if (hydrated.current === id) return;
    hydrated.current = id;
    savedAtRef.current = query.data?.savedAt ?? null;
    const stored = query.data?.runs?.[id] ?? null;
    runRef.current = stored;
    setRun(stored);
  }, [id, loaded, query.data]);

  // Only ever writes the one run it changed. The server sets it on its own
  // `runs.<id>` path, so a tab holding an incomplete history — a failed refetch,
  // a stale cache — cannot delete the days it does not know about.
  const persist = useCallback(
    (next: RunDoc) => {
      if (!handle || !id) return;
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => {
        save.mutate(
          { runPatch: { [id]: next }, lastKnownSavedAt: savedAtRef.current },
          {
            onSuccess: (res) => {
              savedAtRef.current = res.savedAt;
            },
          },
        );
      }, FLUSH_DEBOUNCE_MS);
    },
    [handle, id, save],
  );

  /** Applies a change to the local run and schedules a write. */
  const update = useCallback(
    (fn: (prev: RunDoc) => RunDoc) => {
      setRun((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        runRef.current = next;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const begin = useCallback(() => {
    if (!day) return;
    const fresh = emptyRun(kind, day);
    runRef.current = fresh;
    setRun(fresh);
    persist(fresh);
  }, [day, kind, persist]);

  const startProblem = useCallback(
    (key: string) => {
      update((prev) => {
        if (prev.activeKey === key) return prev;
        // One problem at a time, and leaving one is a decision you have to make
        // explicitly. Anything already running has to be stopped or given a
        // verdict first, so drifting between problems cannot happen silently.
        if (prev.activeKey) return prev;
        return startClock(prev, key);
      });
    },
    [update],
  );

  const takeBreak = useCallback(() => {
    update((prev) => {
      const key = prev.activeKey ?? prev.restingKey ?? null;
      return { ...stopClock(prev), restingKey: key };
    });
  }, [update]);

  const setStatus = useCallback(
    (key: string, status: RunStatus, atSeconds?: number) => {
      update((prev) => {
        const now = Date.now();
        // A verdict stops that problem's clock — you are done with it either way.
        const stopped = prev.activeKey === key ? stopClock(prev, now) : prev;
        const entry = entryOf(stopped, key);
        const seconds = atSeconds ?? activeSeconds(entry, now);
        const solving = status === "solved";
        return {
          ...stopped,
          restingKey: stopped.restingKey === key ? null : stopped.restingKey,
          entries: {
            ...stopped.entries,
            [key]: {
              ...entry,
              status,
              ...(solving
                ? { solvedAt: now, solvedAtSeconds: seconds }
                : { solvedAt: undefined, solvedAtSeconds: undefined }),
            },
          },
        };
      });
    },
    [update],
  );

  const bumpWrong = useCallback(
    (key: string, delta: number) => {
      update((prev) => {
        const entry = entryOf(prev, key);
        return {
          ...prev,
          entries: {
            ...prev.entries,
            [key]: {
              ...entry,
              wrongAttempts: Math.max(0, entry.wrongAttempts + delta),
            },
          },
        };
      });
    },
    [update],
  );

  const patchEntry = useCallback(
    (key: string, patch: Partial<RunEntry>) => {
      update((prev) => ({
        ...prev,
        entries: { ...prev.entries, [key]: { ...entryOf(prev, key), ...patch } },
      }));
    },
    [update],
  );

  const openHint = useCallback(
    (key: string) => {
      update((prev) => {
        const entry = entryOf(prev, key);
        return {
          ...prev,
          entries: {
            ...prev.entries,
            [key]: { ...entry, hintsUsed: (entry.hintsUsed ?? 0) + 1 },
          },
        };
      });
    },
    [update],
  );

  const finish = useCallback(
    (review?: string) => {
      const previous = runRef.current;
      if (!previous) return null;
      const now = previous.finishedAt ?? Date.now();
      const next = {
        ...stopClock(previous, now),
        restingKey: null,
        finishedAt: previous.finishedAt ?? now,
        ...(review ? { review } : {}),
      };
      runRef.current = next;
      setRun(next);
      persist(next);
      return next;
    },
    [persist],
  );

  const reopen = useCallback(() => {
    update((prev) => ({ ...prev, finishedAt: null }));
  }, [update]);

  return useMemo(
    () => ({
      run,
      ready: loaded,
      saving: save.isPending,
      begin,
      startProblem,
      takeBreak,
      restingKey: run?.activeKey ? null : (run?.restingKey ?? null),
      setStatus,
      addWrong: (key: string) => bumpWrong(key, 1),
      removeWrong: (key: string) => bumpWrong(key, -1),
      setTechnique: (key: string, technique: string) =>
        patchEntry(key, { technique }),
      setTechniqueRight: (key: string, right: boolean) =>
        patchEntry(key, { techniqueRight: right }),
      openHint,
      openSolution: (key: string) => patchEntry(key, { solutionSeen: true }),
      setNote: (key: string, note: string) => patchEntry(key, { note }),
      finish,
      reopen,
    }),
    [
      run,
      loaded,
      save.isPending,
      begin,
      startProblem,
      takeBreak,
      setStatus,
      bumpWrong,
      patchEntry,
      openHint,
      finish,
      reopen,
    ],
  );
}
