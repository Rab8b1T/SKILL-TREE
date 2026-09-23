import { beforeEach,describe,it,expect,vi } from "vitest";
import { createHash } from "node:crypto";
import { canonicalJson,createRun,applyAction } from "./program";
import { fixture,NOW } from "./testing/program-fixture";
const state=vi.hoisted(()=>({json:"",rows:new Map<string,Record<string,unknown>>(),accepts:new Map<string,Record<string,unknown>>(),subs:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("node:fs/promises",()=>({readFile:async()=>state.json}));
vi.mock("./cf-server",()=>({getUserStatusSince:state.subs}));
vi.mock("./mongo",()=>({
 HttpError:class extends Error{constructor(public status:number,message:string){super(message);}},
 getAppDb:async()=>({collection:(name:string)=>{
  const rows=name==="program_lc_accepts"?state.accepts:state.rows;
  return {
   findOne:async(q:Record<string,unknown>)=>structuredClone(q._id?rows.get(q._id as string)??null:[...rows.values()].find(r=>(!q.ownerId||r.ownerId===q.ownerId)&&(!q.programId||r.programId===q.programId))??null),
   updateOne:async(q:Record<string,unknown>,u:{$setOnInsert?:Record<string,unknown>;$set?:Record<string,unknown>},options?:{upsert?:boolean})=>{
    const existing=rows.get(q._id as string);
    if(q.revision!==undefined&&existing?.revision!==q.revision)return{matchedCount:0};
    if(!existing&&!options?.upsert)return{matchedCount:0};
    const next={...(existing??u.$setOnInsert),...u.$set};rows.set(q._id as string,structuredClone(next));return{matchedCount:existing?1:0,upsertedCount:existing?0:1};
   },
   find:(q:Record<string,unknown>)=>{const data=[...rows.values()].filter(r=>(!q.ownerId||r.ownerId===q.ownerId)&&(!q.programId||r.programId===q.programId));return{sort:()=>({toArray:async()=>structuredClone(data)}),toArray:async()=>structuredClone(data)};},
  };
 }}),
}));
import { getProgramView,loadProgram,mutateProgram,programExport,reconcileLc } from "./program-server";
function publish(p=fixture()){const {contentHash,...payload}=p;void contentHash;p.contentHash=createHash("sha256").update(canonicalJson(payload)).digest("hex");state.json=JSON.stringify(p);return p;}
function body(action:unknown,revision=0,eventId="event-123456"){return{programId:"expert-2026-09-23",programDay:1,eventId,revision,action};}
beforeEach(()=>{state.rows.clear();state.accepts.clear();state.subs.mockReset();publish();vi.spyOn(Date,"now").mockReturnValue(NOW);});
describe("program backend with isolated fake store",()=>{
 it("rejects a start before the morning or at and after 06:30",async()=>{
  for(const time of [NOW-1,NOW+7200000,NOW+21600000]){
   vi.mocked(Date.now).mockReturnValue(time);
   await expect(mutateProgram("one","tester",body({type:"start",confirmedPrerequisites:true}))).rejects.toThrow(/Prepared|passed/);
  }
  expect(state.rows.size).toBe(0);
 });
 it("keeps a late start anchored and does not award pre-start accepts",async()=>{
  vi.mocked(Date.now).mockReturnValue(NOW+3600000);
  const view=await mutateProgram("one","tester",body({type:"start",confirmedPrerequisites:true}));
  expect(view.run?.blocks.contest.endsAt).toBe(NOW+7200000);
  expect(view.run?.blocks.leetcode.endsAt).toBe(NOW+21600000);
 });
 it("shows the next prepared day after an unstarted window, without manufacturing a session",async()=>{
  const p=fixture();p.days.push({...structuredClone(p.days[0]),programDay:2,date:"2026-09-24"});publish(p);
  vi.mocked(Date.now).mockReturnValue(NOW+21600000);
  const view=await getProgramView("one","tester");expect(view.day.programDay).toBe(2);expect(view.startWindow.canStart).toBe(false);expect(view.run).toBeNull();expect(state.rows.size).toBe(0);
  expect((await getProgramView("one","tester",1)).day.programDay).toBe(1);
 });
 it("does not fall back to a past plan when no day is prepared",async()=>{
  vi.mocked(Date.now).mockReturnValue(NOW+86400000);
  await expect(getProgramView("one","tester")).rejects.toThrow(/No current or upcoming/);
 });
 it("allows the authorized Day 2 diagnostic only as the first actual program session",async()=>{
  const p=fixture();p.days.push({...structuredClone(p.days[0]),programDay:2,date:"2026-09-24"});publish(p);
  await mutateProgram("one","tester",body({type:"start",confirmedPrerequisites:true}));
  vi.mocked(Date.now).mockReturnValue(NOW+86400000);
  const day2={...body({type:"start",confirmedPrerequisites:true}),programDay:2};
  await expect(mutateProgram("one","tester",day2)).rejects.toThrow(/first actual session/);
  const view=await mutateProgram("new-owner","tester",day2);expect(view.run?.programDay).toBe(2);
 });
 it("rejects mismatched publisher hashes",async()=>{state.json=state.json.replace('"contentHash":"','"contentHash":"broken');await expect(loadProgram()).rejects.toThrow(/content check/);});
 it("requires the authored account",async()=>{await expect(getProgramView("owner","other")).rejects.toThrow(/different/);});
 it("starts once, snapshots contents and isolates owners",async()=>{const start=body({type:"start",confirmedPrerequisites:true});const a=await mutateProgram("one","tester",start);await mutateProgram("one","tester",start);await mutateProgram("two","tester",start);expect(state.rows.size).toBe(2);expect(a.run?.revision).toBe(0);expect(a.day.contest.problems[0]?.name).toBe("Secret name");const p=JSON.parse(state.json);p.days[0].contest.problems[0].name="Tomorrow's changed plan";const{contentHash,...payload}=p;void contentHash;p.contentHash=createHash("sha256").update(canonicalJson(payload)).digest("hex");state.json=JSON.stringify(p);expect((await getProgramView("one","tester")).day.contest.problems[0]?.name).toBe("Secret name");});
 it("uses compare-and-set revisions and idempotent action retries",async()=>{await mutateProgram("one","tester",body({type:"start",confirmedPrerequisites:true}));const attempt=body({type:"attempt",block:"contest",key:"1-A",technique:"Scan"},0,"attempt-12345");const first=await mutateProgram("one","tester",attempt);const retry=await mutateProgram("one","tester",attempt);expect(retry.run?.revision).toBe(first.run?.revision);await expect(mutateProgram("one","tester",body({type:"report",block:"contest",key:"1-A",reported:"solved",note:"done"},0,"report-12345"))).rejects.toThrow(/another tab/);});
 it("does not alter evidence on a rejected hint request",async()=>{await mutateProgram("one","tester",body({type:"start",confirmedPrerequisites:true}));await expect(mutateProgram("one","tester",body({type:"hint",block:"review",key:"1-A"},0,"hint-12345"))).rejects.toThrow(/locked/);expect((await getProgramView("one","tester")).run?.revision).toBe(0);});
 it("persists honest pending status when Codeforces is down",async()=>{await mutateProgram("one","tester",body({type:"start",confirmedPrerequisites:true}));state.subs.mockRejectedValue(new Error("offline"));const view=await mutateProgram("one","tester",body({type:"sync",source:"cf"},0,"sync-12345"));expect(view.run?.verification.cfError).toMatch(/pending/);expect(view.run?.score).toBe(0);});
 it("exports only this owner's records with stable session and event IDs",async()=>{await mutateProgram("one","tester",body({type:"start",confirmedPrerequisites:true}));await mutateProgram("two","tester",body({type:"start",confirmedPrerequisites:true}));const out=await programExport("one","expert-2026-09-23");expect(out.sessions).toHaveLength(1);expect(out.sessions[0].events[0].id).toBe("event-123456");expect(JSON.stringify(out)).not.toContain("SECRET SOLUTION");});
 it("persists the complete four-block morning with truthful pending outcomes",async()=>{
  let revision=0,event=0;
  const act=async(action:unknown,at:number)=>{vi.mocked(Date.now).mockReturnValue(at);const v=await mutateProgram("one","tester",body(action,revision,`journey-${++event}`));revision=v.run!.revision;return v;};
  await act({type:"start",confirmedPrerequisites:true},NOW);
  await act({type:"attempt",block:"contest",key:"1-A",technique:"Scan each value"},NOW+1000);
  await act({type:"report",block:"contest",key:"1-A",reported:"incomplete",note:"Could not prove it"},NOW+7000000);
  await act({type:"review",rootCause:"proof",upsolveKey:"1-A",note:"Prove the invariant before coding"},NOW+7200000);
  await act({type:"attempt",block:"review",key:"1-A",technique:"Prove and scan"},NOW+7300000);
  await act({type:"hint",block:"review",key:"1-A"},NOW+7400000);
  await act({type:"lesson",teachBack:"Count how often each key occurs",answers:["A count per key"],primitiveCode:"counts[x] = counts.get(x, 0) + 1"},NOW+10900000);
  await act({type:"attempt",block:"core",key:"3-C",technique:"Frequency dictionary"},NOW+11000000);
  await act({type:"attempt",block:"leetcode",key:"two-sum",technique:"Store seen keys"},NOW+18000000);
  const view=await act({type:"report",block:"leetcode",key:"two-sum",reported:"solved",note:"Local examples pass; await acceptance check"},NOW+19000000);
  expect(view.run?.score).toBe(0);expect(view.run?.lessonEvidence?.recallPassed).toBe(true);
  expect(view.run?.attempts["leetcode:two-sum"].verification).toBe("pending");
  const exportData=await programExport("one","expert-2026-09-23");expect(exportData.sessions[0].review?.rootCause).toBe("proof");expect(exportData.topicEvidence[0].kind).toBe("taught");
 });
});
describe("LeetCode evidence",()=>{
 it("ignores earlier accepts and preserves unavailable-window results",()=>{
  const p=fixture();let r=createRun(p,p.days[0],NOW);
  r.lessonEvidence={submittedAt:NOW+12000000,teachBack:"counts",answers:["count"],primitiveCode:"counts[x]=1",recallPassed:true,assessment:"recall_checked",topicIds:["basics","frequency"]};
  r=applyAction(r,{type:"attempt",block:"leetcode",key:"two-sum",technique:"dictionary"},"lc-attempt",NOW+18000000);
  const old={id:"1",titleSlug:"two-sum",timestamp:String(NOW/1000-100)};
  expect(reconcileLc(r,[old],NOW+18500000).attempts["leetcode:two-sum"].verification).toBe("pending");
  const ac={id:"2",titleSlug:"two-sum",timestamp:String(NOW/1000+18100)};
  const verified=reconcileLc(r,[old,ac],NOW+18500000);expect(verified.attempts["leetcode:two-sum"].verification).toBe("verified");
  expect(reconcileLc(verified,[],NOW+19000000).attempts["leetcode:two-sum"].verification).toBe("verified");
 });
});
