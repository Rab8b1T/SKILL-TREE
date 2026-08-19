"use client";

import { useSyncExternalStore } from "react";

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
