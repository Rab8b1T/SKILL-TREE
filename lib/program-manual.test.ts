import { describe, expect, it } from "vitest";
import {
  actionSchema, applyAction, contestScore, createRun, publicProgram, reconcileCf,
  type BlockId, type ProgramAction, type ProgramRun,
} from "./program";
import { ensureTiming, projectTiming, timingForDay } from "./program-timing";
import { fixture, NOW } from "./testing/program-fixture";
import type { CfSubmission } from "./cf";

const MINUTE = 60_000;
const blocks: BlockId[] = ["contest", "review", "core", "leetcode"];
let event = 0;
function act(run: ProgramRun, action: ProgramAction, at = NOW) {
  return applyAction(run, action, `manual-event-${++event}`, at);
}
function phase(run: ProgramRun, block: BlockId, at = NOW) {
  return ensureTiming(run, at).timing!.phases[block];
}
function runAt(block: BlockId, at = NOW) {
  const p = fixture();
  let run = createRun(p, p.days[0], at);
  for (const previous of blocks.slice(0, blocks.indexOf(block))) {
    if (previous === "core") run = act(run, { type: "lesson", teachBack: "Each key stores its count", answers: ["The count"], primitiveCode: "counts[x] = counts.get(x, 0) + 1" }, at);
    run = act(run, { type: "phase-next", block: previous }, at);
    const next = blocks[blocks.indexOf(previous) + 1];
    run = act(run, { type: "phase-start", block: next }, at);
  }
  return run;
}
function submission(id: number, seconds: number, verdict = "OK", index = "A", contestId = 1): CfSubmission {
  return { id, creationTimeSeconds: NOW / 1000 + seconds, verdict, programmingLanguage: "Python 3",
    problem: { contestId, index, name: "test", tags: [] }, passedTestCount: 2,
  } as CfSubmission;
}

describe("manual phase clocks", () => {
  it("starts only the contest and keeps each later phase ready until its Start click", () => {
    const p = fixture();
    let run = createRun(p, p.days[0], NOW);
    expect(phase(run, "contest").status).toBe("running");
    for (const block of blocks.slice(1)) expect(phase(run, block).status).toBe("ready");
    for (const [index, block] of blocks.entries()) {
      const nextAt = NOW + (index + 1) * MINUTE;
      if (block === "core") run = act(run, { type: "lesson", teachBack: "Each key stores its count", answers: ["The count"], primitiveCode: "counts[x] = counts.get(x, 0) + 1" }, nextAt);
      run = act(run, { type: "phase-next", block }, nextAt);
      expect(phase(run, block, nextAt).status).toBe("completed");
      if (index < blocks.length - 1) {
        const next = blocks[index + 1];
        expect(run.timing!.currentBlock).toBe(next);
        expect(phase(run, next, nextAt).status).toBe("ready");
        expect(phase(run, next, nextAt + 4 * MINUTE).elapsedMs).toBe(0);
        run = act(run, { type: "phase-start", block: next }, nextAt);
        expect(phase(run, next, nextAt).status).toBe("running");
      } else expect(run.timing!.currentBlock).toBeNull();
    }
  });

  it.each(blocks)("persists %s pause, resume, and elapsed time across reloads", (block) => {
    let run = runAt(block);
    run = act(run, { type: "phase-pause", block }, NOW + MINUTE);
    const paused = phase(run, block, NOW + MINUTE);
    expect(paused.status).toBe("paused");
    expect(paused.elapsedMs).toBe(MINUTE);
    const reloaded = JSON.parse(JSON.stringify(run)) as ProgramRun;
    expect(phase(reloaded, block, NOW + 24 * 60 * MINUTE).elapsedMs).toBe(MINUTE);
    run = act(reloaded, { type: "phase-start", block }, NOW + 24 * 60 * MINUTE);
    expect(phase(run, block, NOW + 24 * 60 * MINUTE + 5_000).elapsedMs).toBe(MINUTE + 5_000);
  });

  it("expires at the original problem deadline while offline, freezes the main clock, and does not skip a phase", () => {
    const run = runAt("contest");
    const initial = phase(run, "contest");
    const active = initial.problems.find(p => p.key === initial.activeKey)!;
    const deadline = NOW + active.capMs;
    const reconnect = ensureTiming(JSON.parse(JSON.stringify(run)), deadline + 7 * 60 * MINUTE);
    const current = reconnect.timing!.phases.contest;
    expect(reconnect.timing!.currentBlock).toBe("contest");
    expect(current.status).toBe("paused");
    expect(current.elapsedMs).toBe(active.capMs);
    expect(current.problems.find(p => p.key === active.key)?.status).toBe("expired");
    expect(current.problems.find(p => p.key === active.key)?.elapsedMs).toBe(active.capMs);
    expect(reconnect.timing!.notices.find(n => n.kind === "problem-expired")?.at).toBe(deadline);
    expect(current.problems.filter(p => p.status === "queued")).toHaveLength(1);
    expect(reconnect.timing!.phases.review.status).toBe("ready");
    const later = projectTiming(reconnect.timing!, deadline + 8 * 60 * MINUTE);
    expect(later.phases.contest.elapsedMs).toBe(current.elapsedMs);
    expect(later.phases.contest.problems).toEqual(current.problems);
    expect(later.notices).toEqual(reconnect.timing!.notices);
  });

  it("does not drift or generate duplicate expiry events across repeated projections", () => {
    const run = runAt("contest");
    const initial = run.timing!;
    const direct = projectTiming(initial, NOW + 2 * MINUTE);
    const reloaded = projectTiming(JSON.parse(JSON.stringify(projectTiming(initial, NOW + MINUTE))), NOW + 2 * MINUTE);
    expect(reloaded).toEqual(direct);
    const expired = projectTiming(initial, NOW + 3 * 60 * MINUTE);
    const later = projectTiming(expired, NOW + 6 * 60 * MINUTE);
    expect(later.phases.contest.elapsedMs).toBe(expired.phases.contest.elapsedMs);
    expect(later.phases.contest.problems).toEqual(expired.phases.contest.problems);
    expect(later.notices).toEqual(expired.notices);
    for (const clock of Object.values(expired.phases)) {
      expect(clock.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(clock.elapsedMs).toBeLessThanOrEqual(clock.budgetMs);
      for (const problem of clock.problems) {
        expect(problem.elapsedMs).toBeGreaterThanOrEqual(0);
        expect(problem.elapsedMs).toBeLessThanOrEqual(problem.capMs);
      }
    }
  });

  it("does not start or advance a phase out of order", () => {
    const run = runAt("contest");
    expect(() => act(run, { type: "phase-start", block: "core" })).toThrow();
    expect(() => act(run, { type: "phase-next", block: "review" })).toThrow();
    expect(() => act(run, { type: "phase-pause", block: "leetcode" })).toThrow();
  });

  it("recovers skipped core recall from LeetCode without resetting timers or requiring a new day", () => {
    let run = runAt("core");
    run = act(run, { type: "phase-next", block: "core" }, NOW + MINUTE);
    expect(run.timing!.currentBlock).toBe("leetcode");
    expect(() => act(run, { type: "phase-start", block: "leetcode" }, NOW + MINUTE)).toThrow(/recall|Teach/);
    const lesson = { type: "lesson", teachBack: "Each dictionary key stores its count", answers: ["The count"], primitiveCode: "counts[x] = counts.get(x, 0) + 1" } as const;
    run = act(run, { ...lesson, answers: [...lesson.answers] }, NOW + 2 * MINUTE);
    expect(run.lessonEvidence?.recallPassed).toBe(true);
    expect(run.timing!.currentBlock).toBe("leetcode");
    expect(phase(run, "leetcode", NOW + 2 * MINUTE).elapsedMs).toBe(0);
    run = act(run, { type: "phase-start", block: "leetcode" }, NOW + 2 * MINUTE);
    expect(() => act(run, { ...lesson, answers: [...lesson.answers] }, NOW + 3 * MINUTE)).toThrow(/Pause/);
    run = act(run, { type: "phase-pause", block: "leetcode" }, NOW + 3 * MINUTE);
    run = act(run, { ...lesson, answers: [...lesson.answers] }, NOW + 4 * MINUTE);
    expect(phase(run, "leetcode", NOW + 4 * MINUTE).elapsedMs).toBe(MINUTE);
    expect(phase(run, "leetcode", NOW + 4 * MINUTE).status).toBe("paused");
    expect(phase(run, "core", NOW + 4 * MINUTE).elapsedMs).toBe(MINUTE);
  });

  it("records a retry once without shifting any deadline twice", () => {
    const run = runAt("contest");
    const action = { type: "phase-pause", block: "contest" } as const;
    const once = applyAction(run, action, "same-pause-event", NOW + MINUTE);
    expect(applyAction(once, action, "same-pause-event", NOW + 10 * MINUTE)).toEqual(once);
  });

  it("waits for a manual Next at phase expiry even if more problems remain", () => {
    const run = runAt("contest");
    // A persisted phase may already have spent time on planning or review before
    // a problem starts; its total budget remains the outer limit.
    run.timing!.phases.contest.elapsedMs = run.timing!.phases.contest.budgetMs - 1_000;
    const expired = ensureTiming(run, NOW + MINUTE);
    expect(expired.timing!.currentBlock).toBe("contest");
    expect(expired.timing!.phases.contest.status).toBe("expired");
    expect(expired.timing!.phases.contest.elapsedMs).toBe(expired.timing!.phases.contest.budgetMs);
    expect(expired.timing!.phases.contest.problems.some(p => p.status === "queued")).toBe(true);
    expect(expired.timing!.notices.find(n => n.kind === "phase-expired")?.at).toBe(NOW + 1_000);
    const next = act(expired, { type: "phase-next", block: "contest" }, NOW + MINUTE);
    expect(next.timing!.currentBlock).toBe("review");
    expect(next.timing!.phases.review.status).toBe("ready");
  });
});

describe("problem budgets and timeout choices", () => {
  it("allocates a 1400 problem up to 30 minutes and scales the queue to the available phase budget", () => {
    const p = fixture(), d = p.days[0];
    d.contest.problems[0].rating = 800;
    d.contest.problems[1].rating = 1400;
    d.contest.problems.forEach(x => { x.capMinutes = 60; });
    const ample = timingForDay(d).phases.contest;
    const easy = ample.problems[0], hard = ample.problems[1];
    expect(hard.capMs).toBe(30 * MINUTE);
    expect(hard.capMs).toBeGreaterThan(easy.capMs);
    d.contest.minutes = 20;
    const short = timingForDay(d).phases.contest;
    expect(short.problems.reduce((total, q) => total + q.capMs, 0)).toBeLessThanOrEqual(short.budgetMs);
    expect(short.problems.every(q => q.capMs > 0)).toBe(true);
    expect(short.problems[1].capMs).toBeGreaterThan(short.problems[0].capMs);
  });

  it("skips an expired problem honestly and starts the next problem without counting decision time", () => {
    let run = runAt("contest");
    const first = phase(run, "contest").problems[0];
    const deadline = NOW + first.capMs;
    run = act(run, { type: "problem-skip", block: "contest", key: first.key }, deadline + 10 * MINUTE);
    const clock = phase(run, "contest", deadline + 10 * MINUTE);
    expect(clock.status).toBe("running");
    expect(clock.elapsedMs).toBe(first.capMs);
    expect(clock.problems[0].status).toBe("incomplete");
    expect(clock.problems[1].status).toBe("running");
    expect(clock.problems[1].elapsedMs).toBe(0);
    expect(run.attempts[`contest:${first.key}`].reported).toBe("incomplete");
    expect(contestScore(run)).toBe(0);
  });

  it("freezes main time during guided solving, supports pausing it, and resumes on completion", () => {
    let run = runAt("review");
    const first = phase(run, "review").problems[0];
    const expiredAt = NOW + first.capMs;
    run = act(run, { type: "problem-help", block: "review", key: first.key }, expiredAt + MINUTE);
    expect(phase(run, "review", expiredAt + 6 * MINUTE).elapsedMs).toBe(first.capMs);
    expect(phase(run, "review", expiredAt + 6 * MINUTE).problems[0].guidedElapsedMs).toBe(5 * MINUTE);
    run = act(run, { type: "phase-pause", block: "review" }, expiredAt + 6 * MINUTE);
    expect(phase(run, "review", expiredAt + 60 * MINUTE).problems[0].guidedElapsedMs).toBe(5 * MINUTE);
    run = act(run, { type: "phase-start", block: "review" }, expiredAt + 60 * MINUTE);
    run = act(run, { type: "problem-complete", block: "review", key: first.key, reported: "aided", note: "Rebuilt the reasoning" }, expiredAt + 62 * MINUTE);
    const clock = phase(run, "review", expiredAt + 62 * MINUTE);
    expect(clock.problems[0].guidedElapsedMs).toBe(7 * MINUTE);
    expect(clock.problems[0].status).toBe("completed");
    expect(clock.problems[1].status).toBe("running");
    expect(clock.elapsedMs).toBe(first.capMs);
    expect(run.attempts[`review:${first.key}`].reported).toBe("aided");
    expect(run.attempts[`review:${first.key}`].verification).toBe("pending");
  });

  it("stops on the final completed problem and waits for Next phase", () => {
    let run = runAt("contest");
    const keys = phase(run, "contest").problems.map(p => p.key);
    keys.forEach((key, i) => {
      run = act(run, { type: "problem-complete", block: "contest", key, reported: "solved" }, NOW + (i + 1) * MINUTE);
    });
    const clock = phase(run, "contest", NOW + 10 * MINUTE);
    expect(clock.status).toBe("paused");
    expect(clock.activeKey).toBeUndefined();
    expect(clock.elapsedMs).toBe(2 * MINUTE);
    expect(run.timing!.currentBlock).toBe("contest");
    expect(clock.problems.every(p => p.status === "completed")).toBe(true);
    expect(contestScore(run)).toBe(0);
    expect(run.timing!.notices.some(n => n.kind === "accepted")).toBe(false);
  });

  it("cannot relabel an assisted solve as independent, even when help took less than a clock tick", () => {
    let run = runAt("review");
    run = act(run, { type: "problem-help", block: "review", key: "1-A" });
    run = act(run, { type: "problem-complete", block: "review", key: "1-A", reported: "solved" });
    expect(run.attempts["review:1-A"].reported).toBe("aided");
    expect(run.attempts["review:1-A"].helpStartedAt).toBe(NOW);
    expect(run.attempts["review:1-A"].verification).toBe("pending");
    run = act(run, { type: "phase-next", block: "review" });
    run = act(run, { type: "report", block: "review", key: "1-A", reported: "solved", note: "Trying to edit the report" });
    expect(run.attempts["review:1-A"].reported).toBe("aided");
  });

  it.each([false, true])("keeps guided work waiting for manual completion when AC arrives (manually paused: %s)", (paused) => {
    let run = runAt("review");
    run = act(run, { type: "problem-help", block: "review", key: "1-A" }, NOW + MINUTE);
    if (paused) run = act(run, { type: "phase-pause", block: "review" }, NOW + 3 * MINUTE);
    run = reconcileCf(run, [submission(88, 2 * 60)], NOW + 5 * MINUTE);
    expect(run.attempts["review:1-A"].verification).toBe("verified");
    expect(run.attempts["review:1-A"].reported).toBe("aided");
    const clock = phase(run, "review", NOW + 5 * MINUTE);
    expect(clock.status).toBe("paused");
    expect(clock.activeKey).toBe("1-A");
    expect(clock.elapsedMs).toBe(MINUTE);
    expect(clock.problems[0].status).toBe("guided");
    expect(clock.problems[0].guidedElapsedMs).toBe((paused ? 2 : 4) * MINUTE);
    expect(clock.problems[1].status).toBe("queued");
    expect(run.timing!.notices.filter(n => n.kind === "accepted" && n.key === "1-A")).toHaveLength(1);
    run = act(run, { type: "problem-complete", block: "review", key: "1-A", reported: "solved" }, NOW + 5 * MINUTE);
    expect(phase(run, "review", NOW + 5 * MINUTE).problems[1].status).toBe("running");
    expect(run.attempts["review:1-A"].reported).toBe("aided");
  });

  it("moves contest help to assisted review atomically, sealing the scored interval first", () => {
    const p = fixture();
    let run = createRun(p, p.days[0], NOW);
    const first = phase(run, "contest").problems[0];
    const at = NOW + first.capMs + MINUTE;
    run = act(run, { type: "problem-help", block: "contest", key: first.key }, at);
    expect(run.timing!.currentBlock).toBe("review");
    expect(phase(run, "contest", at).status).toBe("completed");
    expect(phase(run, "review", at).problems.find(q => q.key === first.key)?.status).toBe("guided");
    expect(phase(run, "review", at).elapsedMs).toBe(0);
    run = act(run, { type: "hint", block: "review", key: first.key }, at + 1);
    expect(JSON.stringify(publicProgram(p, run, p.days[0], at + 1))).toContain("SECRET HINT");
    run = reconcileCf(run, [submission(77, (at - NOW) / 1000 + 20)], at + MINUTE);
    expect(contestScore(run)).toBe(0);
    expect(run.attempts[`review:${first.key}`].verification).toBe("verified");
    expect(run.attempts[`contest:${first.key}`].verification).not.toBe("verified");
  });

  it("does not serialize assistance in a paused contest", () => {
    const p = fixture();
    const run = act(createRun(p, p.days[0], NOW), { type: "phase-pause", block: "contest" }, NOW + MINUTE);
    const view = JSON.stringify(publicProgram(p, run, p.days[0], NOW + 10 * MINUTE));
    for (const secret of ["SECRET HINT", "SECRET SOLUTION", "SECRET LESSON CODE", "SECRET RECALL ANSWER"]) expect(view).not.toContain(secret);
    expect(actionSchema.safeParse({ type: "hint", block: "contest", key: "1-A" }).success).toBe(false);
    expect(() => act(run, { type: "hint", block: "review", key: "1-A" }, NOW + 10 * MINUTE)).toThrow();
  });

  it("keeps future problem IDs sealed in the public timer state until that phase is unlocked", () => {
    const p = fixture();
    let run = createRun(p, p.days[0], NOW);
    for (const current of ["contest", "review"] as const) {
      const view = publicProgram(p, run, p.days[0], NOW);
      expect(view.run!.timing.phases.core.problems).toEqual([]);
      expect(view.run!.timing.phases.leetcode.problems).toEqual([]);
      for (const key of ["3-C", "two-sum", "valid-anagram"]) expect(JSON.stringify(view)).not.toContain(key);
      run = act(run, { type: "phase-next", block: current });
    }
    const core = publicProgram(p, run, p.days[0], NOW);
    expect(core.run!.timing.phases.core.problems.map(p => p.key)).toContain("3-C");
    expect(core.run!.timing.phases.leetcode.problems).toEqual([]);
  });
});

describe("manual evidence and migration", () => {
  it("scores only submissions in active intervals, with elapsed practice time rather than pause time", () => {
    let run = runAt("contest");
    run = act(run, { type: "phase-pause", block: "contest" }, NOW + MINUTE);
    run = act(run, { type: "phase-start", block: "contest" }, NOW + 11 * MINUTE);
    const checked = reconcileCf(run, [submission(1, 5 * 60), submission(2, 12 * 60)], NOW + 13 * MINUTE);
    expect(checked.attempts["contest:1-A"].submissions?.map(s => s.id)).toEqual([2]);
    const unpaused = reconcileCf(runAt("contest"), [submission(2, 2 * 60)], NOW + 3 * MINUTE);
    expect(contestScore(checked)).toBe(contestScore(unpaused));
  });

  it("records late AC during a manual pause without resuming the user's clock", () => {
    let run = runAt("contest");
    run = act(run, { type: "phase-pause", block: "contest" }, NOW + 2 * MINUTE);
    run = reconcileCf(run, [submission(11, 60)], NOW + 5 * MINUTE);
    const clock = phase(run, "contest", NOW + 10 * MINUTE);
    expect(clock.status).toBe("paused");
    expect(clock.elapsedMs).toBe(2 * MINUTE);
    expect(clock.problems[0].status).toBe("completed");
    expect(clock.problems[1].status).toBe("queued");
    run = act(run, { type: "phase-start", block: "contest" }, NOW + 10 * MINUTE);
    expect(phase(run, "contest", NOW + 10 * MINUTE).problems[1].status).toBe("running");
  });

  it("retains late-judged in-window acceptance after a manual phase advance", () => {
    let run = runAt("contest");
    run = act(run, { type: "phase-next", block: "contest" }, NOW + 3 * MINUTE);
    const checked = reconcileCf(run, [submission(1, 60, "WRONG_ANSWER"), submission(2, 120), submission(3, 181)], NOW + 10 * MINUTE);
    expect(checked.attempts["contest:1-A"].submissions?.map(s => s.id)).toEqual([1, 2]);
    expect(checked.attempts["contest:1-A"].verification).toBe("verified");
    expect(checked.attempts["contest:1-A"].wrongAttempts).toBe(1);
    expect(contestScore(checked)).toBeGreaterThan(0);
  });

  it("merges updated verdicts by submission ID and retains saved acceptance through empty or truncated responses", () => {
    let run = reconcileCf(runAt("contest"), [submission(1, 30, "WRONG_ANSWER"), submission(2, 60, "TESTING")], NOW + 2 * MINUTE);
    expect(run.attempts["contest:1-A"].verification).toBe("pending");
    run = reconcileCf(run, [submission(2, 60)], NOW + 3 * MINUTE);
    const attempt = run.attempts["contest:1-A"];
    expect(attempt.verification).toBe("verified");
    expect(attempt.submissions?.map(s => [s.id, s.verdict])).toEqual([[1, "WRONG_ANSWER"], [2, "OK"]]);
    expect(attempt.wrongAttempts).toBe(1);
    const score = contestScore(run);
    const retry = reconcileCf(run, [], NOW + 4 * MINUTE);
    expect(retry.attempts["contest:1-A"].verification).toBe("verified");
    expect(retry.attempts["contest:1-A"].submissions).toEqual(attempt.submissions);
    expect(contestScore(retry)).toBe(score);
    expect(retry.timing!.notices.filter(n => n.kind === "accepted" && n.key === "1-A")).toHaveLength(1);
  });

  it("migrates an expired old session at its last engaged review and retains its evidence", () => {
    const p = fixture();
    const legacy = createRun(p, p.days[0], NOW);
    delete legacy.timing;
    legacy.contestCompletion = { finishedAt: NOW + 29 * MINUTE, scheduledEndsAt: NOW + 120 * MINUTE };
    legacy.blocks.contest.endsAt = NOW + 29 * MINUTE;
    legacy.blocks.review = { startedAt: NOW + 29 * MINUTE, endsAt: NOW + 89 * MINUTE };
    legacy.review = { rootCause: "clean", note: "Both problems checked", upsolveKey: "", submittedAt: NOW + 32 * MINUTE };
    legacy.attempts["contest:1-A"] = { key: "1-A", block: "contest", startedAt: NOW, technique: "Scan", hintsUsed: 0, solutionSeen: false, verification: "verified", solvedAt: NOW + 5 * MINUTE };
    const beforeEvidence = structuredClone(legacy.attempts);
    const migrated = ensureTiming(legacy, NOW + 24 * 60 * MINUTE);
    expect(migrated.timing!.currentBlock).toBe("review");
    expect(migrated.timing!.phases.review.status).toBe("paused");
    expect(migrated.timing!.phases.core.status).toBe("ready");
    expect(migrated.timing!.phases.leetcode.status).toBe("ready");
    expect(migrated.review).toEqual(legacy.review);
    expect(migrated.attempts).toEqual(beforeEvidence);
    expect(contestScore(migrated)).toBe(contestScore(legacy));
    const reopened = ensureTiming(migrated, NOW + 48 * 60 * MINUTE);
    expect(reopened.timing!.phases.review.elapsedMs).toBe(migrated.timing!.phases.review.elapsedMs);
    expect(reopened.timing!.phases.review.problems).toEqual(migrated.timing!.phases.review.problems);
    expect(reopened.timing!.migratedAt).toBe(migrated.timing!.migratedAt);
  });
});
