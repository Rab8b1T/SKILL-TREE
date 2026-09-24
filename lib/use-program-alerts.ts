"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { programNoticeMessage, recordProgramNotice, type ProgramNotice } from "./program-alerts";

const SOUND_KEY = "st.program.sound";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  window.addEventListener("focus", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener("focus", listener);
  };
}
function read(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Alerts still work for this visit. */ }
}
const soundSnapshot = () => read(SOUND_KEY) === "1";
const permissionSnapshot = (): NotificationPermission | "unsupported" =>
  typeof Notification === "undefined" ? "unsupported" : Notification.permission;

function chime(context: AudioContext, accepted: boolean) {
  const frequencies = accepted ? [660, 880, 1100] : [880, 660, 440];
  frequencies.forEach((frequency, i) => {
    const oscillator = context.createOscillator(), gain = context.createGain();
    const start = context.currentTime + i * .18;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(.14, start + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, start + .28);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + .3);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  });
}

/** Saved notice IDs prevent a refresh, a poll, or a second tab replaying an alert. */
export function useProgramAlerts(sessionKey: string, notices: ProgramNotice[], names: Record<string, string>, now: number) {
  const sound = useSyncExternalStore(subscribe, soundSnapshot, () => false);
  const permission = useSyncExternalStore(subscribe, permissionSnapshot, () => "default" as const);
  const [audioReady, setAudioReady] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const seenInVisit = useRef(new Set<string>());
  const initialNotices = useRef(new Map<string, Set<string>>());
  const seenKey = `st.program.alerts.${sessionKey}`;

  const arm = useCallback(async () => {
    try {
      const Constructor = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
      if (!Constructor) throw new Error("Sound is unavailable in this browser.");
      if (!context.current || context.current.state === "closed") context.current = new Constructor();
      if (context.current.state === "suspended") await context.current.resume();
      setAudioReady(context.current.state === "running");
      return context.current.state === "running";
    } catch {
      setAudioReady(false);
      toast.error("Sound could not start. Try Test alert after checking your browser’s sound settings.");
      return false;
    }
  }, []);

  // Previously opted-in audio still needs a browser gesture after reopening.
  useEffect(() => {
    if (!sound) return;
    const onGesture = () => { void arm(); };
    document.addEventListener("pointerdown", onGesture, {once: true});
    return () => document.removeEventListener("pointerdown", onGesture);
  }, [arm, sound]);
  useEffect(() => () => { void context.current?.close(); }, []);

  const deliver = useCallback((title: string, body: string, accepted: boolean, id: string) => {
    if (accepted) toast.success(title, {id, description: body, duration: 8000});
    else toast.warning(title, {id, description: body, duration: 15000});
    const playing = soundSnapshot() && context.current?.state === "running";
    if (playing && context.current) chime(context.current, accepted);
    if (permissionSnapshot() === "granted") {
      try {
        const notification = new Notification(title, {body, tag: id, silent: playing || !soundSnapshot()});
        notification.onclick = () => { window.focus(); notification.close(); };
      } catch { /* The visible notice remains when desktop alerts are unavailable. */ }
    }
  }, []);

  useEffect(() => {
    if (!sessionKey) return;
    if (!initialNotices.current.has(sessionKey)) initialNotices.current.set(sessionKey, new Set(notices.map(notice => notice.id)));
    const initialIds = initialNotices.current.get(sessionKey)!;
    for (const notice of notices) {
      const fullId = `${sessionKey}:${notice.id}`;
      if (notice.at > now) continue;
      if (seenInVisit.current.has(fullId)) continue;
      seenInVisit.current.add(fullId);
      const claim = () => {
        let seen: string[] = [];
        try { const value: unknown = JSON.parse(read(seenKey) ?? "[]"); if (Array.isArray(value)) seen = value.filter(v => typeof v === "string"); } catch { /* Recover a malformed local alert ledger. */ }
        const recorded = recordProgramNotice(seen, notice, now, {newlyObserved: !initialIds.has(notice.id)});
        write(seenKey, JSON.stringify(recorded.seen));
        if (!recorded.shouldAlert) return;
        const message = programNoticeMessage(notice, names, now);
        deliver(message.title, message.body, notice.kind === "accepted", fullId);
      };
      // A lock prevents duplicate sounds when two copies of this page are open.
      if (navigator.locks) void navigator.locks.request(`program-alert:${fullId}`, claim).catch(claim);
      else claim();
    }
  }, [deliver, names, notices, now, seenKey, sessionKey]);

  const toggleSound = useCallback(async () => {
    if (sound && audioReady) { write(SOUND_KEY, "0"); emit(); return; }
    if (await arm()) { write(SOUND_KEY, "1"); emit(); }
  }, [arm, audioReady, sound]);
  const requestNotifications = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    try { await Notification.requestPermission(); emit(); } catch { toast.error("Desktop notifications are unavailable in this browser."); }
  }, []);
  const test = useCallback(async () => {
    if (await arm()) {
      write(SOUND_KEY, "1"); emit();
      deliver("Test alert", "This is the sound for a finished timer. Actual timers are unchanged.", false, "st-program-test");
    }
  }, [arm, deliver]);

  return {sound, audioReady, permission, toggleSound, requestNotifications, test};
}
