import "server-only";
import { HttpError } from "./mongo";
import type {
  CfContest,
  CfProblem,
  CfRatingChange,
  CfSubmission,
  CfUser,
} from "./cf";

const BASE = "https://codeforces.com/api";

interface CfEnvelope<T> {
  status: "OK" | "FAILED";
  result?: T;
  comment?: string;
}

interface Entry {
  at: number;
  ttl: number;
  value?: unknown;
  /** Held while a request is open so concurrent callers share one fetch. */
  inflight?: Promise<unknown>;
}

declare global {
  var _stCfCache: Map<string, Entry> | undefined;
}

/*
 * Responses are cached here rather than through `next: { revalidate }`, because
 * the Next data cache refuses anything over 2 MB and `problemset.problems` is
 * ~3 MB — it failed silently on every call, so nothing was ever cached and each
 * pick re-downloaded the whole problemset. A module-level map survives warm
 * invocations, which is where the repeat calls actually come from.
 */
const cache = (global._stCfCache ??= new Map<string, Entry>());

async function cfFetch<T>(
  path: string,
  params: Record<string, string | undefined>,
  ttlSeconds: number,
): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const url = `${BASE}/${path}${qs.size ? `?${qs}` : ""}`;

  const hit = cache.get(url);
  if (hit) {
    if (hit.inflight) return hit.inflight as Promise<T>;
    if (Date.now() - hit.at < hit.ttl * 1000) return hit.value as T;
  }

  const inflight = (async (): Promise<T> => {
    let res: Response;
    try {
      res = await fetch(url, {
        cache: "no-store",
        headers: { "User-Agent": "skill-tree/2.0" },
      });
    } catch {
      throw new HttpError(504, "Codeforces did not respond");
    }

    // Codeforces allows roughly one call every two seconds per IP and answers a
    // throttle with 403 and an HTML body, so nothing here is trusted.
    if (res.status === 403) {
      throw new HttpError(429, "Codeforces is rate-limiting; try again shortly");
    }

    const text = await res.text();
    let body: CfEnvelope<T>;
    try {
      body = JSON.parse(text) as CfEnvelope<T>;
    } catch {
      throw new HttpError(502, "Codeforces returned an unexpected response");
    }

    if (body.status !== "OK" || body.result === undefined) {
      const comment = body.comment ?? "Codeforces request failed";
      // A bad handle is the user's mistake, not a server fault.
      const status = /not found|should contain/i.test(comment) ? 404 : 502;
      throw new HttpError(status, comment);
    }
    return body.result;
  })();

  cache.set(url, { at: Date.now(), ttl: ttlSeconds, inflight });

  try {
    const value = await inflight;
    cache.set(url, { at: Date.now(), ttl: ttlSeconds, value });
    return value;
  } catch (err) {
    // A failure must not be cached, or one throttled call poisons the TTL.
    cache.delete(url);
    throw err;
  }
}

export function getUserInfo(handle: string) {
  return cfFetch<CfUser[]>("user.info", { handles: handle }, 300).then((r) => {
    if (!r.length) throw new HttpError(404, `No such handle: ${handle}`);
    return r[0];
  });
}

export function getUserRating(handle: string) {
  return cfFetch<CfRatingChange[]>("user.rating", { handle }, 300);
}

export function getUserStatus(handle: string, count?: number) {
  return cfFetch<CfSubmission[]>(
    "user.status",
    { handle, from: "1", count: count ? String(count) : undefined },
    120,
  );
}

export function getProblemset(tags?: string[]) {
  return cfFetch<{ problems: CfProblem[]; problemStatistics: { contestId: number; index: string; solvedCount: number }[] }>(
    "problemset.problems",
    { tags: tags?.length ? tags.join(";") : undefined },
    // The problemset only changes when new rounds are added.
    3600,
  );
}

export function getContestList(gym = false) {
  return cfFetch<CfContest[]>("contest.list", { gym: gym ? "true" : undefined }, 900);
}

export function getContestStandings(contestId: number) {
  return cfFetch<{
    contest: CfContest;
    problems: CfProblem[];
  }>(
    "contest.standings",
    { contestId: String(contestId), from: "1", count: "1" },
    3600,
  );
}
