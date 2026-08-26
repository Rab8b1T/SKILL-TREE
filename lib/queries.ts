"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { ArenaDataDoc, RunDoc } from "./coach";
import type { ContestEvaluation } from "./contest-eval";
import { parseCoachPlan } from "./coach-plan";
import type {
  CategoryDetail,
  CategoryIndex,
  CfProfile,
  ContestActiveDoc,
  ContestDataDoc,
  ContestDivision,
  ContestProgramDoc,
  ContestRoundDoc,
  ContestRoundsPage,
  LadderDetail,
  LadderIndex,
  PracticeDataDoc,
  SessionUser,
  UpsolveDataDoc,
} from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (body as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

/* ---------------- session ---------------- */

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => request<{ user: SessionUser | null }>("/api/auth/me"),
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { username: string; password: string }) =>
      request<{ user: SessionUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["session"], { user: data.user });
      qc.invalidateQueries();
    },
  });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      username: string;
      password: string;
      email?: string;
      cfHandle?: string;
    }) =>
      request<{ user: SessionUser }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["session"], { user: data.user });
      qc.invalidateQueries();
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      qc.setQueryData(["session"], { user: null });
      qc.clear();
    },
  });
}

export function useSetHandle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cfHandle: string | null) =>
      request<{ ok: true; cfHandle: string | null }>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ cfHandle }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session"] });
      qc.invalidateQueries({ queryKey: ["cf"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      request<{ ok: true }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

/* ---------------- codeforces ---------------- */

export function useCfProfile(handle?: string | null): UseQueryResult<CfProfile> {
  return useQuery({
    queryKey: ["cf", "profile", handle],
    queryFn: () =>
      request<CfProfile>(`/api/cf/profile?handle=${encodeURIComponent(handle!)}`),
    enabled: !!handle,
    // Codeforces is rate-limited and submissions change slowly; five minutes
    // keeps navigation instant without going stale in a session.
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export interface PickedProblem {
  contestId?: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
  solvedCount: number;
}

export function usePickProblems() {
  return useMutation({
    mutationFn: (params: {
      handle?: string | null;
      min: number;
      max: number;
      count: number;
      tags?: string[];
      matchAll?: boolean;
    }) => {
      const qs = new URLSearchParams({
        min: String(params.min),
        max: String(params.max),
        count: String(params.count),
      });
      if (params.handle) qs.set("handle", params.handle);
      if (params.tags?.length) qs.set("tags", params.tags.join(","));
      if (params.matchAll) qs.set("matchAll", "1");
      return request<{ problems: PickedProblem[]; poolSize: number }>(
        `/api/cf/pick?${qs}`,
      );
    },
  });
}

/* ---------------- per-user documents ---------------- */

type StoreKind = "contest" | "practice" | "upsolve" | "arena";

function useStore<T>(kind: StoreKind, handle?: string | null, empty?: T) {
  return useQuery({
    queryKey: ["store", kind, handle],
    queryFn: () =>
      request<T & { savedAt?: string | null }>(
        `/api/store/${kind}?handle=${encodeURIComponent(handle ?? "")}`,
      ),
    enabled: !!handle,
    placeholderData: empty as never,
    staleTime: 30_000,
  });
}

function useStoreMutation<T extends object>(kind: StoreKind, handle?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: T & { lastKnownSavedAt?: string | null }) =>
      request<{ ok: true; savedAt: string }>(`/api/store/${kind}`, {
        method: "PUT",
        body: JSON.stringify({ ...payload, handle }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store", kind, handle] });
    },
  });
}

export const useContestData = (handle?: string | null) =>
  useStore<ContestDataDoc>("contest", handle, { active: null, history: [] });
export const useSaveContestData = (handle?: string | null) =>
  useStoreMutation<ContestDataDoc>("contest", handle);

/* ---------------- durable contest system ---------------- */

export function useContestActive(handle?: string | null) {
  return useQuery({
    queryKey: ["contest-system", "active", handle],
    queryFn: () => request<ContestActiveDoc>("/api/contest/active"),
    enabled: !!handle,
    placeholderData: {
      contest: null,
      version: 0,
      savedAt: null,
    } satisfies ContestActiveDoc,
    staleTime: 10_000,
  });
}

export function useStartContest(handle?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      division: Exclude<ContestDivision, "custom">;
      slots: number;
      minutes: number;
    }) =>
      request<ContestActiveDoc>("/api/contest/start", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["contest-system", "active", handle], data);
    },
  });
}

export function useSaveContestActive(handle?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ContestActiveDoc) =>
      request<ContestActiveDoc>("/api/contest/active", {
        method: "PATCH",
        body: JSON.stringify({
          version: body.version,
          contest: body.contest,
        }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["contest-system", "active", handle], data);
    },
  });
}

export function useArchiveContest(handle?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { version: number; roundId: string }) =>
      request<{ round: ContestRoundDoc; program: ContestProgramDoc }>(
        "/api/contest/archive",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),
    onSuccess: (data) => {
      qc.setQueryData(["contest-system", "active", handle], {
        contest: null,
        version: 0,
        savedAt: null,
      } satisfies ContestActiveDoc);
      qc.setQueryData(["contest-system", "program", handle], data.program);
      qc.invalidateQueries({ queryKey: ["contest-system", "rounds", handle] });
      qc.invalidateQueries({ queryKey: ["contest-system", "evaluation", handle] });
      qc.invalidateQueries({ queryKey: ["store", "upsolve", handle] });
    },
  });
}

export function useArchiveCoachContest(handle?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { day: number; run: RunDoc }) =>
      request<{ round: ContestRoundDoc; program: ContestProgramDoc }>(
        "/api/contest/coach",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),
    onSuccess: (data) => {
      qc.setQueryData(["contest-system", "program", handle], data.program);
      qc.invalidateQueries({ queryKey: ["contest-system", "rounds", handle] });
      qc.invalidateQueries({ queryKey: ["contest-system", "evaluation", handle] });
      qc.invalidateQueries({ queryKey: ["store", "arena", handle] });
      qc.invalidateQueries({ queryKey: ["store", "upsolve", handle] });
    },
  });
}

export function useContestRounds(
  handle?: string | null,
  section: "standard" | "first-time-trials" = "standard",
  cursor?: string | null,
  limit = 20,
) {
  const qs = new URLSearchParams({ section, limit: String(limit) });
  if (cursor) qs.set("cursor", cursor);
  return useQuery({
    queryKey: ["contest-system", "rounds", handle, section, cursor, limit],
    queryFn: () =>
      request<ContestRoundsPage>(`/api/contest/rounds?${qs.toString()}`),
    enabled: !!handle,
    placeholderData: { rounds: [], nextCursor: null, total: 0 },
    staleTime: 30_000,
  });
}

export function useContestRound(handle?: string | null, roundId?: string | null) {
  return useQuery({
    queryKey: ["contest-system", "round", handle, roundId],
    queryFn: () =>
      request<ContestRoundDoc>(
        `/api/contest/rounds/${encodeURIComponent(roundId!)}`,
      ),
    enabled: !!handle && !!roundId,
  });
}

export function useContestProgram(handle?: string | null) {
  return useQuery({
    queryKey: ["contest-system", "program", handle],
    queryFn: () => request<ContestProgramDoc>("/api/contest/program"),
    enabled: !!handle,
    placeholderData: {
      targetRounds: 200,
      completedRounds: 0,
      createdAt: null,
      updatedAt: null,
    } satisfies ContestProgramDoc,
    staleTime: 30_000,
  });
}

export function useContestEvaluation(
  handle?: string | null,
  timezone = "UTC",
) {
  return useQuery({
    queryKey: ["contest-system", "evaluation", handle, timezone],
    queryFn: () =>
      request<ContestEvaluation>(
        `/api/contest/evaluation?timezone=${encodeURIComponent(timezone)}`,
      ),
    enabled: !!handle,
    staleTime: 30_000,
  });
}

export const usePracticeData = (handle?: string | null) =>
  useStore<PracticeDataDoc>("practice", handle, { entries: [] });
export const useSavePracticeData = (handle?: string | null) =>
  useStoreMutation<PracticeDataDoc>("practice", handle);

export const useUpsolveData = (handle?: string | null) =>
  useStore<UpsolveDataDoc>("upsolve", handle, { entries: [] });
export const useSaveUpsolveData = (handle?: string | null) =>
  useStoreMutation<UpsolveDataDoc>("upsolve", handle);

export const useArenaData = (handle?: string | null) =>
  useStore<ArenaDataDoc>("arena", handle, { runs: {} });

/**
 * Runs are saved one at a time. The server sets each on its own `runs.<id>`
 * path, so a save can add or update a session but never remove another one.
 */
export const useSaveArenaData = (handle?: string | null) =>
  useStoreMutation<{ runPatch: Record<string, RunDoc> }>("arena", handle);

/* ---------------- coach plan ----------------
 * Static JSON committed to git, so a published session cannot be edited from
 * the browser. `staleTime: 0` because the coach may push a new plan while a tab
 * is open, and the day's set changing under you is the correct behaviour there.
 */

export function useCoachPlan() {
  return useQuery({
    queryKey: ["coach", "plan"],
    queryFn: () =>
      request<unknown>("/data/coach/plan.json", { cache: "no-store" }).then(
        parseCoachPlan,
      ),
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/* ---------------- A2OJ static datasets ----------------
 * Served from /public/data as plain JSON so 12,738 scraped problems never enter
 * the JavaScript bundle. The index is a few KB; a ladder's problems are fetched
 * only when that ladder is opened.
 */

const STATIC = { staleTime: Infinity, gcTime: Infinity } as const;

export function useLadderIndex() {
  return useQuery({
    queryKey: ["a2oj", "ladders", "index"],
    queryFn: () => request<LadderIndex>("/data/ladders/index.json"),
    ...STATIC,
  });
}

export function useLadder(slug?: string) {
  return useQuery({
    queryKey: ["a2oj", "ladders", slug],
    queryFn: () => request<LadderDetail>(`/data/ladders/${slug}.json`),
    enabled: !!slug,
    ...STATIC,
  });
}

export function useCategoryIndex() {
  return useQuery({
    queryKey: ["a2oj", "categories", "index"],
    queryFn: () => request<CategoryIndex>("/data/categories/index.json"),
    ...STATIC,
  });
}

export function useCategory(slug?: string) {
  return useQuery({
    queryKey: ["a2oj", "categories", slug],
    queryFn: () => request<CategoryDetail>(`/data/categories/${slug}.json`),
    enabled: !!slug,
    ...STATIC,
  });
}

/**
 * Every set's Codeforces problem keys, so the overview pages can show real
 * progress without fetching 55 problem files. Split out of the index and gated on
 * `enabled` because it is only useful once a handle exists to compare against.
 */
export function useLadderKeys(enabled = true) {
  return useQuery({
    queryKey: ["a2oj", "ladders", "keys"],
    queryFn: () => request<Record<string, string[]>>("/data/ladders/keys.json"),
    enabled,
    ...STATIC,
  });
}

export function useCategoryKeys(enabled = true) {
  return useQuery({
    queryKey: ["a2oj", "categories", "keys"],
    queryFn: () => request<Record<string, string[]>>("/data/categories/keys.json"),
    enabled,
    ...STATIC,
  });
}
