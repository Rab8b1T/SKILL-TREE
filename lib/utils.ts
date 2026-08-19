import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Mixes a hex colour with transparency for tinted backgrounds. */
export function alpha(hex: string, amount: number): string {
  const a = Math.round(Math.max(0, Math.min(1, amount)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

export function pluralize(n: number, singular: string, plural?: string) {
  return `${n} ${n === 1 ? singular : (plural ?? `${singular}s`)}`;
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** "1h 23m" / "23m 4s" / "4s" — used for contest clocks and solve times. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

/** Zero-padded HH:MM:SS for a live countdown. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** "3 days ago" / "in 2 hours" — relative to now, for verdict lists. */
export function relativeTime(msEpoch: number): string {
  const diff = Date.now() - msEpoch;
  const abs = Math.abs(diff);
  const past = diff >= 0;
  const units: [number, string][] = [
    [60_000, "minute"],
    [3_600_000, "hour"],
    [86_400_000, "day"],
    [604_800_000, "week"],
    [2_592_000_000, "month"],
    [31_536_000_000, "year"],
  ];
  if (abs < 60_000) return "just now";
  let value = 0;
  let unit = "minute";
  for (let i = units.length - 1; i >= 0; i--) {
    if (abs >= units[i][0]) {
      value = Math.floor(abs / units[i][0]);
      unit = units[i][1];
      break;
    }
  }
  const label = `${value} ${unit}${value === 1 ? "" : "s"}`;
  return past ? `${label} ago` : `in ${label}`;
}

export function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}
