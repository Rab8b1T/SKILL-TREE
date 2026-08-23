"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useArenaData, useSaveArenaData } from "./queries";
import {
  activeSeconds,
  AUTO_BREAK_THRESHOLD_MS,
  emptyEntry,
  emptyRun,
  isOnBreak,
  repairRun,
  runId,
  settlePause,
  type CoachDay,
  type RunDoc,
  type RunEntry,
  type RunStatus,
} from "./coach";

/**
 * How the clock decides you are working.
 *
 * The app is a companion, not the workspace: the statement is read on
 * Codeforces and the code is written in the editor, so for most of a real
 * session this tab is hidden and receives no events at all. Anything that
 * treats "no pointer event here" or "tab not visible" as idleness therefore
 * measures the opposite of the truth.
 *
 * So the clock runs from when you say you are working until you pause it, give
 * the problem a verdict, or declare a break. The only thing detected
 * automatically is the machine going away — a closed lid or a frozen tab — and
 * that is detected from a gap between ticks, which is real evidence rather than
 * an inference about your attention.
 */
const TICK_MS = 15_000;
/**
 * A tick this late means time passed without the machine running.
 *
 * The threshold has to clear the browser's own scheduling noise, and that noise
 * is enormous. Once a page has been hidden for five minutes Chrome checks its
 * chained timers **once a minute**, so the tab left behind to read the
 * statement reports a ~60s gap on every single tick for as long as you are
 * away. A threshold anywhere near that reads a tab switch as the machine going
 * away — the exact inference the note above says never to make — and stops the
 * clock once a minute for the whole session.
 *
 * Five minutes sits well clear of that floor, and it is already this app's
 * definition of an absence worth recording, so a gap that trips it is a break
 * by construction.
 */
const GAP_MS = AUTO_BREAK_THRESHOLD_MS;
/** How often a running tab records that it is still alive. */
const HEARTBEAT_MS = 20_000;
/** Writes are coalesced this long so a burst of clicks is one request. */
const FLUSH_DEBOUNCE_MS = 1_200;

export interface Interruption {
  key: string;
  awaySeconds: number;
}

export interface RunController {
  run: RunDoc | null;
  ready: boolean;
  saving: boolean;
  /** Set when the machine was away while a problem was on the clock. */
  interrupted: Interruption | null;
  /** Puts the clock back on the interrupted problem. */
  resume: () => void;
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
  /** True while a declared break is open. */
  onBreak: boolean;
  startBreak: () => void;
  endBreak: () => void;
  /** Open pause, if the session is holding rather than running. */
  paused: { at: number; key?: string } | null;
  resumePaused: () => void;
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

/** Opens a segment on `key` and makes it the active problem. */
function openOn(prev: RunDoc, key: string, at = Date.now()): RunDoc {
  const entry = entryOf(prev, key);
  return {
    ...prev,
    activeKey: key,
    heartbeat: at,
    entries: {
      ...prev.entries,
      [key]: { ...entry, segments: [...entry.segments, { from: at, to: null }] },
    },
  };
}

/** Closes an open break, if there is one, and reports what it was resuming. */
function closeBreak(prev: RunDoc, at = Date.now()): { run: RunDoc; resumeKey?: string } {
  const breaks = prev.breaks ?? [];
  const last = breaks[breaks.length - 1];
  if (!last || last.to !== null) return { run: prev };
  return {
    run: {
      ...prev,
      breaks: [...breaks.slice(0, -1), { ...last, to: Math.max(last.from, at) }],
    },
    resumeKey: last.resumeKey,
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
  const [interrupted, setInterrupted] = useState<Interruption | null>(null);
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

  // Hydrate once per run id. After that the local copy is authoritative: this
  // is a single-user stopwatch, and letting a background refetch overwrite it
  // mid-problem would lose the open segment.
  useEffect(() => {
    if (!id || !loaded) return;
    if (hydrated.current === id) return;
    hydrated.current = id;
    savedAtRef.current = query.data?.savedAt ?? null;
    const stored = query.data?.runs?.[id];
    setRun(stored ? repairRun(stored) : null);
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
      setInterrupted(null);
      update((prev) => {
        const now = Date.now();
        if (prev.activeKey === key) return prev;
        // One problem at a time, and leaving one is a decision you have to make
        // explicitly. Anything already running has to be paused or given a
        // verdict first, so drifting between problems cannot happen silently.
        if (prev.activeKey) return prev;
        // Going back to work ends a break and settles a pause, so you never
        // have to remember which one you left open.
        return openOn(settlePause(closeBreak(prev, now).run, now), key, now);
      });
    },
    [update],
  );

  const pause = useCallback(() => {
    setInterrupted(null);
    update((prev) => {
      const now = Date.now();
      const key = prev.activeKey ?? prev.paused?.key;
      return { ...closeOpen(prev, now), paused: { at: now, key } };
    });
  }, [update]);

  const resume = useCallback(() => {
    const parked = interrupted?.key;
    setInterrupted(null);
    if (!parked) return;
    update((prev) => (prev.activeKey ? prev : openOn(prev, parked)));
  }, [interrupted, update]);

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

  const startBreak = useCallback(() => {
    setInterrupted(null);
    update((prev) => {
      if (isOnBreak(prev)) return prev;
      const now = Date.now();
      // A pause that turns into a declared break keeps its own start time, so
      // the minutes between pausing and pressing Break are not counted twice.
      const from = prev.paused?.at ?? now;
      const resumeKey = prev.activeKey ?? prev.paused?.key;
      const closed = closeOpen(prev, now);
      return {
        ...closed,
        paused: null,
        breaks: [...(closed.breaks ?? []), { from, to: null, resumeKey }],
      };
    });
  }, [update]);

  const endBreak = useCallback(() => {
    update((prev) => {
      const now = Date.now();
      const { run: closed, resumeKey } = closeBreak(prev, now);
      if (!resumeKey) return closed;
      // Put the clock back on whatever you walked away from.
      if (entryOf(closed, resumeKey).status !== "todo") return closed;
      return openOn(closed, resumeKey, now);
    });
  }, [update]);

  const resumePaused = useCallback(() => {
    update((prev) => {
      const now = Date.now();
      const key = prev.paused?.key;
      const settled = settlePause(prev, now);
      if (!key || settled.activeKey) return settled;
      if (entryOf(settled, key).status !== "todo") return settled;
      return openOn(settled, key, now);
    });
  }, [update]);

  const finish = useCallback(
    (review?: string) => {
      setInterrupted(null);
      update((prev) => {
        const now = Date.now();
        const closed = closeOpen(
          settlePause(closeBreak(prev, now).run, now),
          now,
        );
        return { ...closed, finishedAt: now, ...(review ? { review } : {}) };
      });
    },
    [update],
  );

  const reopen = useCallback(() => {
    update((prev) => ({ ...prev, finishedAt: null }));
  }, [update]);

  const running = !!run && !run.finishedAt && !!run.activeKey;

  // Machine-absence detector. A suspended laptop or a frozen tab does not fire
  // timers, so a tick arriving late is the only honest evidence that time
  // passed while nobody was here — and it is the one case timestamps alone get
  // wrong, because an open segment would otherwise bill the whole sleep.
  //
  // The reference point is a ref, not a local: this effect is re-created every
  // time `persist` changes identity, and a local would reset the detector's
  // memory on an unrelated re-render.
  const lastTick = useRef(0);

  useEffect(() => {
    if (!running) {
      lastTick.current = 0;
      return;
    }
    if (!lastTick.current) lastTick.current = Date.now();

    const check = () => {
      const now = Date.now();
      const seen = lastTick.current;
      const gap = now - seen;
      lastTick.current = now;
      if (gap <= GAP_MS) return;

      setRun((prev) => {
        if (!prev?.activeKey) return prev;
        setInterrupted({ key: prev.activeKey, awaySeconds: Math.floor(gap / 1000) });
        // The gap leaves the denominator too. A closed lid over lunch is a
        // break, and charging it to the focus ratio would only teach you to
        // distrust the number.
        const next = {
          ...closeOpen(prev, seen),
          breaks: [
            ...(prev.breaks ?? []),
            { from: seen, to: now, auto: true, resumeKey: prev.activeKey },
          ],
        };
        persist(next);
        return next;
      });
    };

    const timer = setInterval(check, TICK_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [running, persist]);

  // Heartbeat, so a tab that never comes back can be trimmed rather than believed.
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
      ready: loaded,
      saving: save.isPending,
      interrupted,
      resume,
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
      onBreak: run ? isOnBreak(run) : false,
      startBreak,
      endBreak,
      paused: run?.paused ?? null,
      resumePaused,
      finish,
      reopen,
    }),
    [
      run,
      loaded,
      save.isPending,
      interrupted,
      resume,
      begin,
      focusProblem,
      pause,
      setStatus,
      bumpWrong,
      patchEntry,
      startBreak,
      endBreak,
      resumePaused,
      finish,
      reopen,
    ],
  );
}
