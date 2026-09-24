import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAction, canonicalJson, createRun, type Program } from "./program";
import { fixture, NOW } from "./testing/program-fixture";

const state = vi.hoisted(() => ({
  json: "", rows: new Map<string, Record<string, unknown>>(),
  accepts: new Map<string, Record<string, unknown>>(), subs: vi.fn(), rejectNextCas: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("node:fs/promises", () => ({ readFile: async () => state.json }));
vi.mock("./cf-server", () => ({ getUserStatusSince: state.subs }));
vi.mock("./mongo", () => ({
  HttpError: class extends Error { constructor(public status: number, message: string) { super(message); } },
  getAppDb: async () => ({ collection: (name: string) => {
    const rows = name === "program_lc_accepts" ? state.accepts : state.rows;
    const matches = (r: Record<string, unknown>, q: Record<string, unknown>) => Object.entries(q).every(([key, value]) =>
      value && typeof value === "object" && "$in" in value
        ? (value.$in as unknown[]).includes(r[key]) : r[key] === value);
    return {
      findOne: async (q: Record<string, unknown>) => structuredClone([...rows.values()].find(r => matches(r, q)) ?? null),
      updateOne: async (q: Record<string, unknown>, u: { $setOnInsert?: Record<string, unknown>; $set?: Record<string, unknown> }, options?: { upsert?: boolean }) => {
        if (q.revision !== undefined && state.rejectNextCas) { state.rejectNextCas = false; return { matchedCount: 0 }; }
        const existing = rows.get(q._id as string);
        if (existing && !matches(existing, q)) return { matchedCount: 0 };
        if (!existing && !options?.upsert) return { matchedCount: 0 };
        rows.set(q._id as string, structuredClone({ ...(existing ?? u.$setOnInsert), ...u.$set }));
        return { matchedCount: existing ? 1 : 0, upsertedCount: existing ? 0 : 1 };
      },
      find: (q: Record<string, unknown>) => {
        const all = [...rows.values()].filter(r => matches(r, q));
        return { sort: () => ({ toArray: async () => structuredClone(all) }), toArray: async () => structuredClone(all) };
      },
    };
  } }),
}));
import { getProgramView, mutateProgram, programExport, reconcileLc, runStorageId } from "./program-server";

const MINUTE = 60_000;
function publish(p = fixture()) {
  const { contentHash, ...payload } = p;
  void contentHash;
  p.contentHash = createHash("sha256").update(canonicalJson(payload)).digest("hex");
  state.json = JSON.stringify(p);
  return p;
}
function request(action: unknown, revision = 0, eventId = "manual-server-start") {
  return { programId: "expert-2026-09-23", programDay: 1, eventId, revision, action };
}
async function start(owner = "one") {
  return mutateProgram(owner, "tester", request({ type: "start", confirmedPrerequisites: true }));
}
function seedLegacy(p: Program) {
  const run = createRun(p, p.days[0], NOW);
  delete run.timing;
  run.contestCompletion = { finishedAt: NOW + 29 * MINUTE, scheduledEndsAt: NOW + 120 * MINUTE };
  run.blocks.contest.endsAt = NOW + 29 * MINUTE;
  run.blocks.review = { startedAt: NOW + 29 * MINUTE, endsAt: NOW + 89 * MINUTE };
  run.review = { rootCause: "clean", note: "Both problems independently checked", upsolveKey: "", submittedAt: NOW + 32 * MINUTE };
  const id = runStorageId("one", p, 1);
  state.rows.set(id, { _id: id, ownerId: "one", programId: p.programId, sessionId: run.sessionId, revision: run.revision, run });
  return run;
}

beforeEach(() => {
  state.rows.clear(); state.accepts.clear(); state.subs.mockReset(); state.rejectNextCas = false;
  publish(); vi.spyOn(Date, "now").mockReturnValue(NOW);
});

describe("saved manual session lifecycle", () => {
  it("anchors the next problem and response clock after a delayed verification request completes", async () => {
    const started = await start();
    const requestAt = NOW + MINUTE;
    const responseAt = requestAt + 15_000;
    vi.mocked(Date.now).mockReturnValue(requestAt);
    state.subs.mockImplementation(async () => {
      vi.mocked(Date.now).mockReturnValue(responseAt);
      return [{ id: 789, creationTimeSeconds: NOW / 1000 + 30, verdict: "OK", programmingLanguage: "Python 3", passedTestCount: 2,
        problem: { contestId: 1, index: "A", name: "Secret name", tags: [] } }];
    });
    const view = await mutateProgram("one", "tester", request({ type: "sync", source: "cf" }, started.run!.revision, "delayed-cf-sync-result"));
    expect(view.serverNow).toBe(responseAt);
    expect(view.run!.verification.cfCheckedAt).toBe(responseAt);
    expect(view.run!.attempts["contest:1-A"].verification).toBe("verified");
    expect(view.run!.attempts["contest:2-B"].startedAt).toBe(responseAt);
    const phase = view.run!.timing.phases.contest;
    const next = phase.problems.find(p => p.key === "2-B")!;
    expect(phase.activeKey).toBe("2-B");
    expect(phase.elapsedMs).toBe(MINUTE + 15_000);
    expect(next.runningSince).toBe(responseAt);
    expect(next.elapsedMs).toBe(0);
    vi.mocked(Date.now).mockReturnValue(responseAt + 5_000);
    const reloaded = await getProgramView("one", "tester", 1);
    expect(reloaded.run!.timing.phases.contest.problems.find(p => p.key === "2-B")!.elapsedMs).toBe(5_000);
  });

  it.each([false, true])("keeps accepted LeetCode guided work awaiting manual completion (paused: %s)", (paused) => {
    const p = fixture();
    let run = createRun(p, p.days[0], NOW);
    for (const block of ["contest", "review"] as const) run = applyAction(run, { type: "phase-next", block }, `open-${block}`, NOW);
    run = applyAction(run, { type: "lesson", teachBack: "Each key stores its count", answers: ["The count"], primitiveCode: "counts[x] = counts.get(x, 0) + 1" }, "lc-prerequisite-lesson", NOW);
    run = applyAction(run, { type: "phase-next", block: "core" }, "open-leetcode-next", NOW);
    run = applyAction(run, { type: "phase-start", block: "leetcode" }, "start-leetcode-phase", NOW);
    run = applyAction(run, { type: "problem-help", block: "leetcode", key: "two-sum" }, "guided-leetcode-start", NOW + MINUTE);
    if (paused) run = applyAction(run, { type: "phase-pause", block: "leetcode" }, "guided-leetcode-pause", NOW + 3 * MINUTE);
    run = reconcileLc(run, [{ id: "123", titleSlug: "two-sum", timestamp: String(NOW / 1000 + 120) }], NOW + 5 * MINUTE);
    expect(run.attempts["leetcode:two-sum"].verification).toBe("verified");
    expect(run.attempts["leetcode:two-sum"].reported).toBe("aided");
    expect(run.timing!.phases.leetcode.elapsedMs).toBe(MINUTE);
    expect(run.timing!.phases.leetcode.problems[0].status).toBe("guided");
    expect(run.timing!.phases.leetcode.problems[0].guidedElapsedMs).toBe((paused ? 2 : 4) * MINUTE);
    expect(run.timing!.phases.leetcode.problems[1].status).toBe("queued");
    run = applyAction(run, { type: "problem-complete", block: "leetcode", key: "two-sum", reported: "solved" }, "guided-leetcode-complete", NOW + 5 * MINUTE);
    expect(run.timing!.phases.leetcode.problems[1].status).toBe("running");
    expect(run.attempts["leetcode:two-sum"].reported).toBe("aided");
  });

  it("advances review without waiting, requires the next phase Start, and round-trips reloads", async () => {
    let view = await start();
    view = await mutateProgram("one", "tester", request({ type: "phase-next", block: "contest" }, view.run!.revision, "finish-contest-manual"));
    expect(view.run!.currentBlock).toBe("review");
    expect(view.run!.timing.phases.review.status).toBe("ready");
    view = await mutateProgram("one", "tester", request({ type: "phase-start", block: "review" }, view.run!.revision, "start-review-manual"));
    vi.mocked(Date.now).mockReturnValue(NOW + MINUTE);
    view = await mutateProgram("one", "tester", request({ type: "review", rootCause: "clean", note: "Both solutions checked", upsolveKey: "" }, view.run!.revision, "save-review-evidence"));
    view = await mutateProgram("one", "tester", request({ type: "phase-next", block: "review" }, view.run!.revision, "finish-review-manual"));
    expect(view.run!.currentBlock).toBe("core");
    expect(view.run!.timing.phases.core.status).toBe("ready");
    expect(view.day.core.lesson).not.toBeNull();
    vi.mocked(Date.now).mockReturnValue(NOW + 2 * 60 * MINUTE);
    const reloaded = await getProgramView("one", "tester", 1);
    expect(reloaded.run!.timing.phases.core.elapsedMs).toBe(0);
    expect(reloaded.run!.review?.note).toBe("Both solutions checked");
    expect(reloaded.run!.currentBlock).toBe("core");
  });

  it("reconciles expiry at the saved deadline after closed tabs or a connection outage", async () => {
    const view = await start();
    const phase = view.run!.timing.phases.contest;
    const first = phase.problems.find(p => p.key === phase.activeKey)!;
    vi.mocked(Date.now).mockReturnValue(NOW + first.capMs + 5 * 60 * MINUTE);
    const reloaded = await getProgramView("one", "tester", 1);
    expect(reloaded.run!.currentBlock).toBe("contest");
    expect(reloaded.run!.timing.phases.contest.elapsedMs).toBe(first.capMs);
    expect(reloaded.run!.timing.phases.contest.status).toBe("paused");
    expect(reloaded.run!.timing.notices.find(n => n.kind === "problem-expired")?.at).toBe(NOW + first.capMs);
    expect((await getProgramView("one", "tester", 1)).run!.timing).toEqual(reloaded.run!.timing);
  });

  it("persists pause despite refresh and next-day reopening, and resumes only on a click", async () => {
    const started = await start();
    vi.mocked(Date.now).mockReturnValue(NOW + MINUTE);
    const paused = await mutateProgram("one", "tester", request({ type: "phase-pause", block: "contest" }, started.run!.revision, "pause-for-disconnect"));
    vi.mocked(Date.now).mockReturnValue(NOW + 24 * 60 * MINUTE);
    const reopened = await getProgramView("one", "tester", 1);
    expect(reopened.run!.timing.phases.contest.elapsedMs).toBe(MINUTE);
    expect(reopened.run!.timing.phases.contest.status).toBe("paused");
    expect(reopened.run!.revision).toBe(paused.run!.revision);
    const resumed = await mutateProgram("one", "tester", request({ type: "phase-start", block: "contest" }, reopened.run!.revision, "resume-after-return"));
    expect(resumed.run!.timing.phases.contest.status).toBe("running");
    vi.mocked(Date.now).mockReturnValue(NOW + 24 * 60 * MINUTE + 5_000);
    expect((await getProgramView("one", "tester", 1)).run!.timing.phases.contest.elapsedMs).toBe(MINUTE + 5_000);
  });

  it("retries a save whose response was lost without duplicating an action", async () => {
    const view = await start();
    vi.mocked(Date.now).mockReturnValue(NOW + MINUTE);
    const action = request({ type: "phase-next", block: "contest" }, view.run!.revision, "response-lost-next");
    const saved = await mutateProgram("one", "tester", action);
    vi.mocked(Date.now).mockReturnValue(NOW + 5 * MINUTE);
    const retry = await mutateProgram("one", "tester", action);
    expect(retry.run!.revision).toBe(saved.run!.revision);
    expect(retry.run!.currentBlock).toBe("review");
    expect(retry.run!.timing.phases.review.status).toBe("ready");
    const exported = await programExport("one", "expert-2026-09-23");
    expect(exported.sessions[0].events.filter(e => e.id === action.eventId)).toHaveLength(1);
    expect(exported.sessions[0].timing).toBeDefined();
  });

  it("rejects stale revisions and a racing CAS without changing saved timing", async () => {
    const initial = await start();
    const paused = await mutateProgram("one", "tester", request({ type: "phase-pause", block: "contest" }, initial.run!.revision, "cas-pause-original"));
    await expect(mutateProgram("one", "tester", request({ type: "phase-next", block: "contest" }, initial.run!.revision, "stale-next-request"))).rejects.toThrow(/another tab|changed/i);
    state.rejectNextCas = true;
    await expect(mutateProgram("one", "tester", request({ type: "phase-start", block: "contest" }, paused.run!.revision, "racing-resume-request"))).rejects.toThrow(/concurrent|retry|changed/i);
    expect((await getProgramView("one", "tester", 1)).run!.timing.phases.contest.status).toBe("paused");
    expect((await getProgramView("one", "tester", 1)).run!.revision).toBe(paused.run!.revision);
  });

  it("isolates identical session and event IDs by authenticated owner", async () => {
    const one = await start("one");
    await start("two");
    const action = request({ type: "phase-next", block: "contest" }, one.run!.revision, "owner-shared-event");
    await mutateProgram("one", "tester", action);
    expect((await getProgramView("two", "tester", 1)).run!.currentBlock).toBe("contest");
    await expect(mutateProgram("third", "tester", action)).rejects.toThrow(/Start the day/);
    expect((await programExport("one", "expert-2026-09-23")).sessions).toHaveLength(1);
    expect((await programExport("two", "expert-2026-09-23")).sessions[0].events.some(e => e.id === action.eventId)).toBe(false);
  });

  it("migrates the existing saved review without moving to unseen phases or losing it on first save", async () => {
    const p = publish();
    const legacy = seedLegacy(p);
    vi.mocked(Date.now).mockReturnValue(NOW + 24 * 60 * MINUTE);
    const view = await getProgramView("one", "tester", 1);
    expect(view.run!.currentBlock).toBe("review");
    expect(view.run!.timing.phases.review.status).toBe("paused");
    expect(view.run!.review).toEqual(legacy.review);
    expect(view.run!.timing.phases.core.status).toBe("ready");
    const next = await mutateProgram("one", "tester", request({ type: "phase-next", block: "review" }, view.run!.revision, "migrated-review-next"));
    expect(next.run!.currentBlock).toBe("core");
    expect(next.run!.review).toEqual(legacy.review);
    expect((await getProgramView("one", "tester", 1)).run!.currentBlock).toBe("core");
  });

  it("reopens the unfinished saved session on the default page after midnight", async () => {
    const first = await start();
    await mutateProgram("one", "tester", request({ type: "phase-pause", block: "contest" }, first.run!.revision, "pause-before-midnight"));
    vi.mocked(Date.now).mockReturnValue(NOW + 24 * 60 * MINUTE);
    const reopened = await getProgramView("one", "tester");
    expect(reopened.day.programDay).toBe(1);
    expect(reopened.run!.sessionId).toBe(first.run!.sessionId);
    expect(reopened.run!.timing.phases.contest.status).toBe("paused");
  });

  it("continues from its saved snapshot if the current publication no longer lists that day", async () => {
    const first = await start();
    const p = fixture();
    p.days[0].programDay = 2; p.days[0].date = "2026-09-24";
    p.days[0].contest.problems[0].name = "Different future content";
    publish(p);
    vi.mocked(Date.now).mockReturnValue(NOW + MINUTE);
    const paused = await mutateProgram("one", "tester", request({ type: "phase-pause", block: "contest" }, first.run!.revision, "snapshot-authority-pause"));
    expect(paused.day.programDay).toBe(1);
    expect(paused.day.contest.problems[0]?.name).toBe("Secret name");
    const reopened = await getProgramView("one", "tester");
    expect(reopened.run!.sessionId).toBe(first.run!.sessionId);
    expect(reopened.run!.timing.phases.contest.status).toBe("paused");
  });
});
