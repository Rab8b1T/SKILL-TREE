"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useArenaData, useSaveArenaData } from "./queries";
import {
  activeSeconds,
  emptyEntry,
  emptyRun,
  repairRun,
  runId,
  type CoachDay,
  type RunDoc,
  type RunEntry,
  type RunStatus,
} from "./coach";

/**
 * No pointer, key or focus event for this long and the clock stops on its own.
 *
 * The session is supposed to answer "how long was I actually working", so an
 * idle stretch has to be excluded rather than trusted. Ninety seconds is long
 * enough to think with your hands off the keyboard and short enough that a
 * coffee break never counts.
 */
const IDLE_MS = 90_000;
/** How often a running tab records that it is still alive. */
const HEARTBEAT_MS = 20_000;
/** Writes are coalesced this long so a burst of clicks is one request. */
const FLUSH_DEBOUNCE_MS = 1_200;

export interface RunController {
  run: RunDoc | null;
  ready: boolean;
  /** True while the clock is stopped because nothing has happened for a while. */
  idle: boolean;
  saving: boolean;
  begin: () => void;
  focusProblem: (key: string) => void;
  pause: () => void;
  /**
   * `atSeconds` overrides the recorded solve time. Practice leaves it out and is
   * billed engaged seconds; a contest passes the round clock, because a round
   * charges you for the minutes you spent on a different problem too.
   */
  setStatus: (key: string, status: RunStatus, atSeconds?: number) => void;
  addWrong: (key: string) => void;
  removeWrong: (key: string) => void;
  setTechnique: (key: string, technique: string) => void;
  setTechniqueRight: (key: string, right: boolean) => void;
  setNote: (key: string, note: string) => void;
  finish: (review?: string) => void;
  reopen: () => void;
}

const entryOf = (run: RunDoc, key: string): RunEntry =>
  run.entries[key] ?? emptyEntry(key);

/** Closes whatever segment is open. Pure, so every action can reuse it. */
function closeOpen(prev: RunDoc, at = Date.now()): RunDoc {
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

export function useRun(
  kind: "practice" | "contest",
  day: CoachDay | null,
  handle?: string | null,
): RunController {
  const query = useArenaData(handle);
  const save = useSaveArenaData(handle);

  const [run, setRun] = useState<RunDoc | null>(null);
  const [idle, setIdle] = useState(false);
  const hydrated = useRef<string | null>(null);
  const savedAtRef = useRef<string | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Problem the idle watchdog paused, so activity can resume the same one. */
  const idleParked = useRef<string | null>(null);

  const id = day ? runId(kind, day.day) : null;

  // Hydrate once per run id. After that the local copy is authoritative: this
  // is a single-user stopwatch, and letting a background refetch overwrite it
  // mid-problem would lose the open segment.
  useEffect(() => {
    if (!id || !query.data) return;
    if (hydrated.current === id) return;
    hydrated.current = id;
    savedAtRef.current = query.data.savedAt ?? null;
    const stored = query.data.runs?.[id];
    setRun(stored ? repairRun(stored) : null);
  }, [id, query.data]);

  const persist = useCallback(
    (next: RunDoc) => {
      if (!handle || !id) return;
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => {
        const runs = { ...(query.data?.runs ?? {}), [id]: next };
        save.mutate(
          { runs, lastKnownSavedAt: savedAtRef.current },
          {
            onSuccess: (res) => {
              savedAtRef.current = res.savedAt;
            },
          },
        );
      }, FLUSH_DEBOUNCE_MS);
    },
    [handle, id, query.data, save],
  );

  /** Applies a change to the local run and schedules a write. */
  const update = useCallback(
    (fn: (prev: RunDoc) => RunDoc) => {
      setRun((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const begin = useCallback(() => {
    if (!day) return;
    const fresh = emptyRun(kind, day);
    setRun(fresh);
    persist(fresh);
  }, [day, kind, persist]);

  const focusProblem = useCallback(
    (key: string) => {
      idleParked.current = null;
      setIdle(false);
      update((prev) => {
        const now = Date.now();
        // Clicking the problem already running is a no-op, not a restart.
        if (prev.activeKey === key) return prev;
        const closed = closeOpen(prev, now);
        const entry = entryOf(closed, key);
        return {
          ...closed,
          activeKey: key,
          heartbeat: now,
          entries: {
            ...closed.entries,
            [key]: { ...entry, segments: [...entry.segments, { from: now, to: null }] },
          },
        };
      });
    },
    [update],
  );

  const pause = useCallback(() => {
    idleParked.current = null;
    update((prev) => closeOpen(prev));
  }, [update]);

  const setStatus = useCallback(
    (key: string, status: RunStatus, atSeconds?: number) => {
      update((prev) => {
        const now = Date.now();
        // A verdict stops that problem's clock — you are done with it either way.
        const closed = prev.activeKey === key ? closeOpen(prev, now) : prev;
        const entry = entryOf(closed, key);
        const seconds = atSeconds ?? activeSeconds(entry, now);
        const solving = status === "solved";
        return {
          ...closed,
          entries: {
            ...closed.entries,
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

  const finish = useCallback(
    (review?: string) => {
      idleParked.current = null;
      update((prev) => {
        const now = Date.now();
        const closed = closeOpen(prev, now);
        return { ...closed, finishedAt: now, ...(review ? { review } : {}) };
      });
    },
    [update],
  );

  const reopen = useCallback(() => {
    update((prev) => ({ ...prev, finishedAt: null }));
  }, [update]);

  const running = !!run && !run.finishedAt && !!run.activeKey;

  // Idle watchdog. Any real interaction resets it; silence stops the clock and
  // remembers which problem to put back when the user returns.
  useEffect(() => {
    if (!running) return;
    let timer: ReturnType<typeof setTimeout>;

    const park = () => {
      setIdle(true);
      setRun((prev) => {
        if (!prev?.activeKey) return prev;
        idleParked.current = prev.activeKey;
        const next = closeOpen(prev, Date.now() - IDLE_MS);
        persist(next);
        return next;
      });
    };

    const bump = () => {
      clearTimeout(timer);
      if (idleParked.current) {
        const key = idleParked.current;
        idleParked.current = null;
        setIdle(false);
        focusProblem(key);
        return;
      }
      timer = setTimeout(park, IDLE_MS);
    };

    const events = ["pointerdown", "keydown", "wheel", "focus"] as const;
    for (const e of events) window.addEventListener(e, bump, { passive: true });
    timer = setTimeout(park, IDLE_MS);

    return () => {
      clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, bump);
    };
  }, [running, persist, focusProblem]);

  // Leaving the tab is idleness we do not have to guess at.
  useEffect(() => {
    if (!running) return;
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      setRun((prev) => {
        if (!prev?.activeKey) return prev;
        idleParked.current = prev.activeKey;
        const next = closeOpen(prev);
        persist(next);
        return next;
      });
      setIdle(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [running, persist]);

  // Heartbeat, so a crashed tab can be trimmed rather than believed.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      update((prev) => ({ ...prev, heartbeat: Date.now() }));
    }, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [running, update]);

  return useMemo(
    () => ({
      run,
      ready: !!query.data,
      idle,
      saving: save.isPending,
      begin,
      focusProblem,
      pause,
      setStatus,
      addWrong: (key: string) => bumpWrong(key, 1),
      removeWrong: (key: string) => bumpWrong(key, -1),
      setTechnique: (key: string, technique: string) =>
        patchEntry(key, { technique }),
      setTechniqueRight: (key: string, right: boolean) =>
        patchEntry(key, { techniqueRight: right }),
      setNote: (key: string, note: string) => patchEntry(key, { note }),
      finish,
      reopen,
    }),
    [
      run,
      query.data,
      idle,
      save.isPending,
      begin,
      focusProblem,
      pause,
      setStatus,
      bumpWrong,
      patchEntry,
      finish,
      reopen,
    ],
  );
}
