"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from "react";
import type { AlertKind } from "./coach";

/**
 * Desktop alerts at the phase boundaries of a running attempt.
 *
 * The whole three-phase design assumes you find out when the phase changed, and
 * during a real session this tab is hidden — the statement is on Codeforces and
 * the code is in the editor. A ring that quietly turns amber behind two other
 * windows tells you nothing, so each boundary is announced by the OS instead.
 *
 * Timing comes from `public/phase-alarm-worker.js` rather than a timer here,
 * because Chrome throttles a hidden page's timers to about one wake-up a minute
 * and a five-minute warning that lands four minutes out is not a warning. The
 * page still does the firing: a worker cannot touch `Notification`.
 *
 * Nothing is ever scheduled in the past. Reloading mid-attempt re-arms only the
 * boundaries still ahead, so a refresh never replays hint time.
 */

const SOUND_KEY = "skill-tree:alert-sound";
/** One tag for all of them: the newest instruction replaces the last, rather
 *  than stacking four stale banners while you were heads-down. */
const TAG = "skill-tree-phase";

export interface Alarm {
  id: string;
  /** Epoch ms. */
  at: number;
  kind: AlertKind;
  title: string;
  body: string;
}

export type AlertPermission = NotificationPermission | "unsupported";

export interface PhaseAlerts {
  permission: AlertPermission;
  /** Asks the browser for permission. Must be called from a click. */
  request: () => void;
  sound: boolean;
  setSound: (on: boolean) => void;
  /** Fires a sample alert, to prove the OS is not swallowing them. */
  demo: () => void;
}

/* ---------------------------------------------------------------- stores --- */

/**
 * Both settings live in the browser rather than in React — one in the
 * permission store, one in `localStorage` — so they are read through
 * `useSyncExternalStore`. The permission half genuinely changes underneath us:
 * revoking it in Chrome's site settings fires `change` and the prompt comes
 * back without a reload.
 */

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);

  let status: PermissionStatus | null = null;
  let live = true;
  if (navigator.permissions?.query) {
    navigator.permissions
      .query({ name: "notifications" as PermissionName })
      .then((result) => {
        if (!live) return;
        status = result;
        result.addEventListener("change", onChange);
      })
      .catch(() => {
        // Safari refuses the notifications descriptor; the snapshot still works.
      });
  }

  return () => {
    live = false;
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
    status?.removeEventListener("change", onChange);
  };
}

function readPermission(): AlertPermission {
  return typeof Notification === "undefined"
    ? "unsupported"
    : Notification.permission;
}

function readSound(): boolean {
  return window.localStorage.getItem(SOUND_KEY) !== "0";
}

const serverPermission = (): AlertPermission => "default";
const serverSound = () => true;

/* ----------------------------------------------------------------- sound --- */

const TONES: Record<AlertKind, number[]> = {
  // A soft single note for "wrap up", a rising pair for a phase change, and a
  // falling triad for the end of the budget — tellable apart without looking.
  warn: [660],
  enter: [880, 1175],
  spent: [880, 740, 587],
};

function chime(ctx: AudioContext, kind: AlertKind) {
  const base = ctx.currentTime;
  TONES[kind].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = base + i * 0.17;

    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.26);
  });
}

/** Autoplay policy: the context must be built or resumed inside a gesture. */
async function armAudio(ref: RefObject<AudioContext | null>) {
  if (!ref.current) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    ref.current = new Ctor();
  }
  if (ref.current.state === "suspended") await ref.current.resume();
}

/* ------------------------------------------------------------------ hook --- */

export function usePhaseAlerts(alarms: Alarm[] | null): PhaseAlerts {
  const permission = useSyncExternalStore(
    subscribe,
    readPermission,
    serverPermission,
  );
  const sound = useSyncExternalStore(subscribe, readSound, serverSound);

  const workerRef = useRef<Worker | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const lookupRef = useRef(new Map<string, Alarm>());

  // Any click anywhere satisfies the autoplay policy, so the chime is ready
  // long before the first boundary lands.
  useEffect(() => {
    const arm = () => void armAudio(audioRef);
    document.addEventListener("pointerdown", arm, { once: true });
    return () => document.removeEventListener("pointerdown", arm);
  }, []);

  const fire = useCallback((alarm: Alarm) => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      // `silent` because the chime below is ours; without it macOS plays its
      // own sound over the top of it.
      const note = new Notification(alarm.title, {
        body: alarm.body,
        tag: TAG,
        silent: true,
      });
      note.onclick = () => {
        window.focus();
        note.close();
      };
    }
    if (readSound() && audioRef.current) chime(audioRef.current, alarm.kind);
  }, []);

  useEffect(() => {
    const worker = new Worker("/phase-alarm-worker.js");
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<{ type: string; id: string }>) => {
      if (event.data?.type !== "due") return;
      const alarm = lookupRef.current.get(event.data.id);
      if (alarm) fire(alarm);
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [fire]);

  // The caller memoises `alarms`; its identity is the schedule.
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;

    const list = alarms ?? [];
    lookupRef.current = new Map(list.map((a) => [a.id, a]));
    worker.postMessage(
      list.length > 0
        ? { type: "schedule", alarms: list.map((a) => ({ id: a.id, at: a.at })) }
        : { type: "clear" },
    );
  }, [alarms]);

  const request = useCallback(() => {
    void armAudio(audioRef);
    if (typeof Notification === "undefined") return;
    void Notification.requestPermission().then(emit);
  }, []);

  const setSound = useCallback((on: boolean) => {
    window.localStorage.setItem(SOUND_KEY, on ? "1" : "0");
    void armAudio(audioRef);
    emit();
  }, []);

  const demo = useCallback(() => {
    void armAudio(audioRef).then(() =>
      fire({
        id: "demo",
        at: Date.now(),
        kind: "enter",
        title: "Hint time",
        body: "Sample alert · this is what a phase change looks like.",
      }),
    );
  }, [fire]);

  return { permission, request, sound, setSound, demo };
}
