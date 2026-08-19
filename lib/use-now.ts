"use client";

import { useSyncExternalStore } from "react";
import { localDayKey } from "./daily";

type Ticker = {
  subscribe: (onChange: () => void) => () => void;
  snapshot: () => number;
};

/** One timer per interval, shared by every consumer of that interval. */
const tickers = new Map<number, Ticker>();

function tickerFor(intervalMs: number): Ticker {
  const existing = tickers.get(intervalMs);
  if (existing) return existing;

  const listeners = new Set<() => void>();
  let value = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;

  const ticker: Ticker = {
    subscribe(onChange) {
      listeners.add(onChange);
      if (timer === null) {
        // The stored value went stale while nothing was subscribed.
        value = Date.now();
        timer = setInterval(() => {
          value = Date.now();
          for (const l of listeners) l();
        }, intervalMs);
      }
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0 && timer !== null) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    snapshot: () => value,
  };

  tickers.set(intervalMs, ticker);
  return ticker;
}

/**
 * Epoch milliseconds, refreshed on an interval. Null on the server and through
 * hydration so both renders agree — a live clock in SSR markup always mismatches.
 */
export function useNow(intervalMs = 1000): number | null {
  const ticker = tickerFor(intervalMs);
  return useSyncExternalStore(ticker.subscribe, ticker.snapshot, () => null);
}

/**
 * Today as `YYYY-MM-DD` in the reader's own timezone. Null until mounted, for
 * the same hydration reason as `useNow`.
 *
 * `isoDate()` cannot be used to pick the current day: it is UTC, so anywhere
 * east of Greenwich it names yesterday for the whole early morning. At IST that
 * covers everything before 05:30 — which is the entire practice window.
 */
export function useLocalToday(): string | null {
  const now = useNow(60_000);
  return now === null ? null : localDayKey(now);
}
