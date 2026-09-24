import { describe,it,expect } from "vitest";
import { actionSchema,applyAction,assertContestEligible,blockAt,canonicalJson,contestScore,createRun,parseProgram,publicProgram,reconcileCf,sessionId } from "./program";
import type { CfSubmission } from "./cf";
import type { BlockId, ProgramRun } from "./program";

import { NOW, fixture } from "./testing/program-fixture";
function sub(id:number,seconds:number,verdict="OK",contestId=1,index="A"):CfSubmission{return {id,creationTimeSeconds:Math.floor(NOW/1000)+seconds,verdict,problem:{contestId,index,name:"test",tags:[]},author:{},passedTestCount:2} as unknown as CfSubmission;}
function openPhase(run:ProgramRun,target:BlockId,at:number):ProgramRun {
 const order:BlockId[]=["contest","review","core","leetcode"];
 while(run.timing!.currentBlock!==target){const block=run.timing!.currentBlock!;run=applyAction(run,{type:"phase-next",block},`open-next-${block}-${at}`,at);}
 return applyAction(run,{type:"phase-start",block:order[order.indexOf(target)]},`open-start-${target}-${at}`,at);
}
describe("published program",()=>{
 it("validates exact block budgets and two LC assignments",()=>{const p=fixture();const bad=structuredClone(p);bad.days[0].leetcode.problems.pop();expect(()=>parseProgram(bad)).toThrow();expect(()=>parseProgram({...p,days:[{...p.days[0],contest:{...p.days[0].contest,minutes:90}}]})).toThrow();});
 it("uses new IDs without overwriting a legacy day",()=>{expect(sessionId("expert-2026-09-23",23)).not.toBe("contest-23");expect(sessionId("expert-2026-09-23",1)).not.toBe(sessionId("another-program",1));});
 it("requires explicit preflight confirmation",()=>{expect(actionSchema.safeParse({type:"start"}).success).toBe(false);expect(actionSchema.safeParse({type:"start",confirmedPrerequisites:true}).success).toBe(true);});
 it("requires an explicit authorized diagnostic bootstrap",()=>{const p=fixture();expect(()=>assertContestEligible(p,p.days[0],NOW)).not.toThrow();expect(()=>assertContestEligible(p,{...p.days[0],programDay:2,diagnosticBootstrap:false},NOW+86400000)).toThrow();});
 it("rejects cyclic and unknown prerequisites",()=>{const p=fixture();p.topics[0].prerequisites=["frequency"];expect(()=>parseProgram(p)).toThrow(/cycle/);});
 it("honors external assessment provenance and a later reopened prerequisite",()=>{const p=fixture();p.topics[0].diagnosticEligible=false;p.topics[0].evidence=[{kind:"independent",at:new Date(NOW-2000).toISOString(),source:"Mentor reviewed session evidence abc"}];expect(()=>assertContestEligible(p,p.days[0],NOW)).not.toThrow();p.topics[0].evidence.push({kind:"reopened",at:new Date(NOW-1000).toISOString(),source:"Failed recall event def"});expect(()=>assertContestEligible(p,p.days[0],NOW)).toThrow();});
 it("canonicalizes nested keys for the Python publisher",()=>{expect(canonicalJson({z:[{b:"é",a:1}],a:2})).toBe('{"a":2,"z":[{"a":1,"b":"é"}]}');});
});
describe("server-owned session",()=>{
 it("finishes early without changing earned points or admitting later contest submissions",()=>{
  const p=fixture(),d=p.days[0],at=NOW+600000;
  const before=reconcileCf(createRun(p,d,NOW),[sub(1,120)],at);
  const finished=applyAction(before,{type:"finish-contest"},"finish-12345",at);
  expect(blockAt(finished,at)).toBe("review");
  expect(finished.timing!.phases.review.status).toBe("ready");
  expect(finished.timing!.phases.review.budgetMs).toBe(60*60000);
  expect(finished.timing!.phases.leetcode.elapsedMs).toBe(0);
  expect(finished.snapshot).toEqual(before.snapshot);
  expect(finished.attempts["contest:1-A"].verification).toBe(before.attempts["contest:1-A"].verification);
  expect(contestScore(finished)).toBe(contestScore(before));
  expect(publicProgram(p,finished,d,at).day.review.problems).toHaveLength(2);
  expect(publicProgram(p,finished,d,at).day.core.lesson).toBeNull();
  expect(applyAction(finished,{type:"finish-contest"},"finish-12345",at+1000)).toEqual(finished);
  expect(applyAction(finished,{type:"finish-contest"},"finish-again",at+1000)).toEqual(finished);
  expect(()=>applyAction(finished,{type:"attempt",block:"contest",key:"2-B",technique:"Scan"},"late-attempt",at+1000)).toThrow(/phase/);
  const reviewed=applyAction(finished,{type:"attempt",block:"review",key:"2-B",technique:"Repair"},"review-start",at);
  const checked=reconcileCf(reviewed,[sub(1,120),sub(2,700,"OK",2,"B")],NOW+800000);
  expect(checked.attempts["contest:2-B"]?.verification).not.toBe("verified");
  expect(checked.attempts["review:2-B"].verification).toBe("verified");
  expect(contestScore(checked)).toBe(contestScore(before));
 });
 it("permits manual completion after timeout without inventing a solved result",()=>{
  const p=fixture(),r=createRun(p,p.days[0],NOW);
  const finished=applyAction(r,{type:"finish-contest"},"finish-empty",NOW+7200000);
  expect(finished.timing!.phases.review.status).toBe("ready");
  expect(Object.values(finished.attempts).every(a=>a.verification==="pending")).toBe(true);expect(contestScore(finished)).toBe(0);
 });
 it("retains the current phase across reloads and sleep until an explicit transition",()=>{const p=fixture(),r=createRun(p,p.days[0],NOW);for(const at of [NOW+7199999,NOW+7200000,NOW+10800000,NOW+18000000,NOW+21600000])expect(blockAt(JSON.parse(JSON.stringify(r)),at)).toBe("contest");});
 it("keeps started contents unchanged on republish",()=>{const p=fixture(),r=createRun(p,p.days[0],NOW);p.days[0].contest.problems[0].name="changed";expect(r.snapshot.contest.problems[0].name).toBe("Secret name");});
 it("does not serialize protected content during the contest or before start",()=>{const p=fixture(),d=p.days[0],r=createRun(p,d,NOW);const before=JSON.stringify(publicProgram(p,null,d,NOW));expect(before).not.toContain("Secret name");for(const time of [NOW,NOW+7199999]){const text=JSON.stringify(publicProgram(p,r,d,time));for(const secret of ["SECRET TAG","SECRET HINT","SECRET NUDGE","SECRET ANSWER","SECRET SOLUTION","SECRET LESSON CODE","SECRET RECALL ANSWER"])expect(text).not.toContain(secret);}});
 it("releases only hints actually opened after an attempt",()=>{const p=fixture(),d=p.days[0];let r=createRun(p,d,NOW);expect(()=>applyAction(r,{type:"hint",block:"review",key:"1-A"},"hint-event",NOW+100)).toThrow();r=openPhase(r,"review",NOW+7200000);r=applyAction(r,{type:"attempt",block:"review",key:"1-A",technique:"Try counting"},"attempt-1",NOW+7200000);r=applyAction(r,{type:"hint",block:"review",key:"1-A"},"hint-123",NOW+7201000);const view=JSON.stringify(publicProgram(p,r,d,NOW+7201000));expect(view).toContain("SECRET HINT");expect(view).not.toContain("SECRET SOLUTION");});
 it("checks recall before a new-topic practice attempt and saves evidence",()=>{const p=fixture();let r=openPhase(createRun(p,p.days[0],NOW),"core",NOW+10800000);const action={type:"attempt",block:"core",key:"3-C",technique:"Frequency map"} as const;expect(()=>applyAction(r,action,"attempt-core",NOW+10800000)).toThrow(/Teach/);r=applyAction(r,{type:"lesson",teachBack:"A frequency count per key",answers:["A count per key"],primitiveCode:"counts[x] = counts.get(x, 0) + 1"},"lesson-save",NOW+10900000);expect(r.lessonEvidence?.recallPassed).toBe(true);expect(applyAction(r,action,"attempt-core",NOW+11000000).attempts["core:3-C"]).toBeDefined();});
 it("never treats diagnostic preflight as a core prerequisite check, including Day 2",()=>{
  for(const day of [1,2]){
   const p=fixture(),d=p.days[0];d.programDay=day;d.date=day===1?"2026-09-23":"2026-09-24";
   const at=NOW+(day-1)*86400000;let r=createRun(p,d,at);
   r.snapshot.core.lesson.topicIds=["frequency"];
   r=openPhase(r,"core",at+10800000);
   r=applyAction(r,{type:"lesson",teachBack:"A frequency count per key",answers:["A count per key"],primitiveCode:"counts[x] = counts.get(x, 0) + 1"},"lesson-save",at+10900000);
   expect(()=>applyAction(r,{type:"attempt",block:"core",key:"3-C",technique:"Count values"},"core-attempt",at+11000000)).toThrow(/Teach/);
   expect(()=>applyAction(r,{type:"attempt",block:"leetcode",key:"two-sum",technique:"Store seen keys"},"lc-attempt",at+18000000)).toThrow(/Teach/);
  }
 });
 it("allows assessed prior prerequisites but respects a later reopened assessment",()=>{
  const p=fixture(),d=p.days[0];d.core.lesson.topicIds=["frequency"];
  p.topics[0].evidence=[{kind:"taught",at:new Date(NOW-1000).toISOString(),source:"Coach checked the primitive"}];
  let r=createRun(p,d,NOW);
  r=openPhase(r,"core",NOW+10800000);
  r=applyAction(r,{type:"lesson",teachBack:"A frequency count per key",answers:["A count per key"],primitiveCode:"counts[x] = counts.get(x, 0) + 1"},"lesson-save",NOW+10900000);
  const attempt={type:"attempt",block:"core",key:"3-C",technique:"Count values"} as const;
  expect(applyAction(r,attempt,"core-start",NOW+11000000).attempts["core:3-C"]).toBeDefined();
  r.topics[0].evidence!.push({kind:"reopened",at:new Date(NOW+10950000).toISOString(),source:"The prerequisite recall failed"});
  expect(()=>applyAction(r,attempt,"core-start",NOW+11000000)).toThrow(/Teach/);
 });
 it("does not reveal the recall answer key after an unsuccessful check",()=>{const p=fixture();let r=openPhase(createRun(p,p.days[0],NOW),"core",NOW+10800000);r=applyAction(r,{type:"lesson",teachBack:"I am still confused",answers:["I do not know"],primitiveCode:"pass # unsure"},"lesson-failed",NOW+10900000);expect(JSON.stringify(publicProgram(p,r,p.days[0],NOW+10900000))).not.toContain("SECRET RECALL ANSWER");});
 it("makes event retries idempotent",()=>{const p=fixture(),r=createRun(p,p.days[0],NOW);const a={type:"attempt",block:"contest",key:"1-A",technique:"Scan"} as const;const once=applyAction(r,a,"same-event",NOW);expect(applyAction(once,a,"same-event",NOW+1000)).toEqual(once);});
 it("never turns a self-reported solve into verified points",()=>{const p=fixture();let r=createRun(p,p.days[0],NOW);r=applyAction(r,{type:"attempt",block:"contest",key:"1-A",technique:"Scan"},"attempt-id",NOW);r=applyAction(r,{type:"report",block:"contest",key:"1-A",reported:"solved",note:"passed sample"},"report-id",NOW+1000);expect(contestScore(r)).toBe(0);});
 it("excludes old and post-clock AC while counting late-arriving in-window verdicts",()=>{const p=fixture(),r=createRun(p,p.days[0],NOW);const checked=reconcileCf(r,[sub(1,-1),sub(2,7200),sub(3,60,"WRONG_ANSWER"),sub(4,120)],NOW+8000000);expect(checked.attempts["contest:1-A"].submissions?.map(s=>s.id)).toEqual([3,4]);expect(checked.attempts["contest:1-A"].wrongAttempts).toBe(1);expect(contestScore(checked)).toBe(446);});
 it("keeps upsolve acceptance separate from the original round",()=>{const p=fixture();let r=openPhase(createRun(p,p.days[0],NOW),"review",NOW+7200000);r=applyAction(r,{type:"attempt",block:"review",key:"1-A",technique:"Repair"},"review-attempt",NOW+7200000);r=reconcileCf(r,[sub(3,7300)],NOW+7400000);expect(r.attempts["review:1-A"].verification).toBe("verified");expect(r.attempts["contest:1-A"]?.verification).not.toBe("verified");expect(contestScore(r)).toBe(0);});
});
