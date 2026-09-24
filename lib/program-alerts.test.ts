import { describe, expect, it } from "vitest";
import { programNoticeMessage, recordProgramNotice, type ProgramNotice } from "./program-alerts";

const notice: ProgramNotice = { id: "contest:1-A:deadline:60000", kind: "problem-expired", block: "contest", key: "1-A", at: 60_000 };

describe("session notifications", () => {
  it("alerts exactly once for a stable deadline ID, including a restored ledger after reload", () => {
    const first = recordProgramNotice([], notice, 60_000);
    expect(first.shouldAlert).toBe(true);
    expect(recordProgramNotice(first.seen, notice, 70_000).shouldAlert).toBe(false);
    const reloaded = JSON.parse(JSON.stringify(first.seen)) as string[];
    expect(recordProgramNotice(reloaded, notice, 80_000)).toEqual({ seen: first.seen, shouldAlert: false });
  });

  it("does not consume or announce a deadline that has not happened", () => {
    const future = recordProgramNotice([], notice, 59_999);
    expect(future).toEqual({ seen: [], shouldAlert: false });
    const eligible = recordProgramNotice(future.seen, notice, 60_000);
    expect(eligible.shouldAlert).toBe(true);
    expect(eligible.seen).toEqual([notice.id]);
    expect(recordProgramNotice(eligible.seen, notice, 60_001).shouldAlert).toBe(false);
  });

  it("announces elapsed timers on reconnect and explains the practice clock has paused", () => {
    expect(recordProgramNotice([], notice, 10_000_000).shouldAlert).toBe(true);
    const message = programNoticeMessage(notice, { "contest:1-A": "First problem" }, 10_000_000);
    expect(message.title).toBe("First problem: time finished");
    expect(message.body).toMatch(/while you were away/);
    expect(message.body).toMatch(/paused/);
  });

  it("deduplicates recent AC and suppresses old acceptance sounds while retaining the ledger", () => {
    const accepted: ProgramNotice = { ...notice, id: "accepted:contest:1-A:123", kind: "accepted" };
    const recent = recordProgramNotice([], accepted, 70_000);
    expect(recent.shouldAlert).toBe(true);
    expect(recordProgramNotice(recent.seen, accepted, 71_000).shouldAlert).toBe(false);
    const old = recordProgramNotice([], accepted, 151_000);
    expect(old.shouldAlert).toBe(false);
    expect(old.seen).toContain(accepted.id);
    expect(programNoticeMessage(accepted, {}, 70_000).body).toMatch(/verified/);
  });

  it("announces a newly observed delayed AC once without replaying old acceptance history", () => {
    const accepted: ProgramNotice = { ...notice, id: "accepted:contest:1-A:delayed", kind: "accepted" };
    const now = accepted.at + 10 * 60_000;
    const initial = recordProgramNotice([], accepted, now);
    expect(initial.shouldAlert).toBe(false);
    const newlyObserved = recordProgramNotice([], accepted, now, { newlyObserved: true });
    expect(newlyObserved.shouldAlert).toBe(true);
    expect(recordProgramNotice(newlyObserved.seen, accepted, now + 1_000, { newlyObserved: true }).shouldAlert).toBe(false);
    const reloaded = JSON.parse(JSON.stringify(newlyObserved.seen)) as string[];
    expect(recordProgramNotice(reloaded, accepted, now + 2_000).shouldAlert).toBe(false);
    expect(recordProgramNotice(initial.seen, accepted, now + 2_000, { newlyObserved: true }).shouldAlert).toBe(false);
  });

  it("keeps new acceptance and phase timeout notices distinct from a problem timeout", () => {
    const first = recordProgramNotice([], notice, 60_000);
    const phase: ProgramNotice = { ...notice, id: "contest:deadline:120000", kind: "phase-expired", key: undefined, at: 120_000 };
    const next = recordProgramNotice(first.seen, phase, 120_000);
    expect(next.shouldAlert).toBe(true);
    expect(programNoticeMessage(phase, { contest: "Contest" }, 120_000).title).toBe("Contest: time finished");
  });
});
