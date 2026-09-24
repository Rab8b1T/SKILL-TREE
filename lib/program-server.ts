import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Document } from "mongodb";
import { addTimingNotice, duringProblemWork, ensureTiming } from "./program-timing";
import { getAppDb, HttpError } from "./mongo";
import { getUserStatusSince } from "./cf-server";
import { actionSchema, lessonNotesEvidence, applyAction, closeProblem, assertContestEligible, canonicalJson, createRun, localDate, parseProgram, publicProgram, reconcileCf, sessionId, startWindow, type Program, type ProgramDay, type ProgramRun } from "./program";

export async function loadProgram():Promise<Program> {
  let raw:unknown;
  try {raw=JSON.parse(await readFile(path.join(process.cwd(),"data/coach/program.json"),"utf8"));}
  catch {throw new HttpError(503,"The new program has not been published yet. Your previous history is preserved.");}
  const p=parseProgram(raw);
  const payload={...(raw as Record<string,unknown>)};delete payload.contentHash;
  const digest=createHash("sha256").update(canonicalJson(payload)).digest("hex");
  if(p.contentHash!==digest)throw new HttpError(503,"The published program failed its content check. Ask Mentor to republish it.");
  return p;
}
type StoredRun=Document & {_id:string;ownerId:string;programId:string;sessionId:string;revision:number;run:ProgramRun};
export function runStorageId(userId:string,p:Program,day:number){return `${userId}:${sessionId(p.programId,day)}`;}
export function programDay(p:Program,day?:number):ProgramDay {
  const today=localDate(Date.now());
  const chosen=day===undefined?p.days.find(d=>d.date===today)??p.days.filter(d=>d.date>today).sort((a,b)=>a.date.localeCompare(b.date))[0]:p.days.find(d=>d.programDay===day);
  if(!chosen)throw new HttpError(404,"No current or upcoming day is published. Ask Mentor to prepare the next day, or open Previous program history.");return chosen;
}
export function assertProgramHandle(p:Program,handle:string|null|undefined) {
  if(!handle||handle.toLowerCase()!==p.handle.toLowerCase())throw new HttpError(403,"This authored program belongs to a different Codeforces handle");
}
async function runCollection(){return (await getAppDb()).collection<StoredRun>("program_sessions");}
export async function readProgramRun(userId:string,p:Program,d:ProgramDay) {
  const col=await runCollection(),id=runStorageId(userId,p,d.programDay);
  for(let tries=0;tries<3;tries++){
    const row=await col.findOne({_id:id});if(!row)return null;
    const run=ensureTiming(row.run,Date.now());
    // Persist a migration or deterministic deadline transition. Running clocks
    // need no polling writes: their saved anchors remain authoritative offline.
    const changed=!row.run.timing||run.timing!.notices.length!==row.run.timing.notices.length;
    if(!changed)return run;
    run.revision=row.revision+1;
    const result=await col.updateOne({_id:id,revision:row.revision},{$set:{run,revision:run.revision}});
    if(result.matchedCount)return run;
  }
  throw new HttpError(409,"This session changed while loading. Refresh to read its latest saved state.");
}
export async function getProgramView(userId:string,handle:string|null|undefined,day?:number) {
  const p=await loadProgram();assertProgramHandle(p,handle);
  // Returning tomorrow must reopen an unfinished saved session, rather than
  // letting a calendar lookup hide its paused clocks or force a fresh start.
  let savedDay:ProgramDay|undefined;
  if(day===undefined){
    const rows=await (await runCollection()).find({ownerId:userId,programId:p.programId}).sort({"run.startedAt":-1}).toArray();
    const active=rows.find(row=>!row.run.timing||row.run.timing.currentBlock!==null);
    savedDay=active?.run.snapshot;
  }
  let d=savedDay??programDay(p,day);
  let run=await readProgramRun(userId,p,d);
  if(day===undefined&&!run&&Date.now()>=startWindow(d,Date.now()).endsAt){const upcoming=p.days.filter(x=>x.date>localDate(Date.now())).sort((a,b)=>a.date.localeCompare(b.date))[0];if(upcoming){d=upcoming;run=await readProgramRun(userId,p,d);}}
  return publicProgram(p,run,d,Date.now());
}

type RecentLc={id:string;titleSlug:string;timestamp:string};
export async function recentLeetCode(handle:string):Promise<RecentLc[]> {
  const response=await fetch("https://leetcode.com/graphql",{method:"POST",cache:"no-store",signal:AbortSignal.timeout(15000),headers:{"Content-Type":"application/json"},body:JSON.stringify({query:"query($u:String!){ recentAcSubmissionList(username:$u,limit:20){id titleSlug timestamp} }",variables:{u:handle}})});
  if(!response.ok)throw new Error("LeetCode did not respond");
  const data=await response.json();
  if(!Array.isArray(data?.data?.recentAcSubmissionList))throw new Error("LeetCode recent accepts unavailable");
  return data.data.recentAcSubmissionList;
}
export function reconcileLc(run:ProgramRun,accepts:RecentLc[],now:number):ProgramRun {
  const out=ensureTiming(run,now);
  for(const p of out.snapshot.leetcode.problems){
    const a=out.attempts[`leetcode:${p.slug}`];if(!a)continue;
    const ac=accepts.filter(s=>s.titleSlug===p.slug&&Number(s.timestamp)*1000>=a.startedAt&&Number(s.timestamp)*1000<now&&duringProblemWork(out,"leetcode",p.slug,Number(s.timestamp)*1000,now)).sort((x,y)=>Number(x.timestamp)-Number(y.timestamp))[0];
    if(ac){a.verification="verified";a.solvedAt=Number(ac.timestamp)*1000;a.submissions=[{id:Number(ac.id),at:a.solvedAt,verdict:"OK"}];addTimingNotice(out.timing!,{kind:"accepted",block:"leetcode",key:p.slug,at:a.solvedAt});if(!["completed","guided"].includes(out.timing!.phases.leetcode.problems.find(x=>x.key===p.slug)!.status))closeProblem(out,"leetcode",p.slug,now,"solved",undefined,true);}
    a.lastCheckedAt=now;
  }
  out.verification.lcCheckedAt=now;delete out.verification.lcError;return out;
}
export async function mutateProgram(userId:string,handle:string|null|undefined,body:unknown) {
  if(!body||typeof body!=="object")throw new HttpError(400,"Invalid action");
  const b=body as Record<string,unknown>;
  if(typeof b.eventId!=="string"||!/^[a-zA-Z0-9-]{8,100}$/.test(b.eventId))throw new HttpError(400,"An idempotency event ID is required");
  if(!Number.isInteger(b.programDay))throw new HttpError(400,"A program day is required");
  const parsed=actionSchema.safeParse(b.action);
  if(!parsed.success)throw new HttpError(400,"Complete the required fields before saving this action.");
  const action=parsed.data,p=await loadProgram();assertProgramHandle(p,handle);
  if(b.programId!==p.programId)throw new HttpError(409,"Program changed. Reload before saving.");
  const col=await runCollection(),id=runStorageId(userId,p,b.programDay as number);
  const stored=await col.findOne({_id:id}),now=Date.now(),d=stored?.run.snapshot??programDay(p,b.programDay as number);
  if(action.type==="start"){
    if(stored)return publicProgram(p,stored.run,d,Date.now());
    const window=startWindow(d,now);
    if(!window.canStart)throw new HttpError(409,window.reason);
    if(d.diagnosticBootstrap&&await col.findOne({ownerId:userId,programId:p.programId}))throw new HttpError(409,"A diagnostic bootstrap can only start the first actual session. Ask Mentor to plan from the evidence already recorded.");
    assertContestEligible(p,d,now);
    const run=createRun(p,d,now);run.events.push({id:b.eventId,type:d.diagnosticBootstrap?"diagnostic_preflight_confirmed":"start",at:now});run.processed.push(b.eventId);
    await col.updateOne({_id:id},{$setOnInsert:{_id:id,ownerId:userId,programId:p.programId,sessionId:run.sessionId,revision:0,run}},{upsert:true});
    return publicProgram(p,(await col.findOne({_id:id}))!.run,d,Date.now());
  }
  if(!stored)throw new HttpError(409,"Start the day before recording work");
  if(stored.run.processed.includes(b.eventId))return publicProgram(p,stored.run,d,Date.now());
  if(b.revision!==stored.revision)throw new HttpError(409,"This session changed in another tab. Refresh before saving; your text remains on this device.");
  let run:ProgramRun;
  const assessed={...stored.run,topics:stored.run.topics.map(t=>({...t,evidence:p.topics.find(x=>x.id===t.id)?.evidence??t.evidence}))};
  try {run=applyAction(assessed,action,b.eventId,now);}catch(e){throw new HttpError(400,(e as Error).message);}
  if(action.type==="sync"){
    if(action.source==="cf"){
      try {const submissions=await getUserStatusSince(p.handle,Math.floor(run.startedAt/1000));run=reconcileCf(run,submissions,Date.now());}
      catch {run.verification.cfError="Codeforces is unavailable. Results remain pending; retry sync later.";}
    }else{
      try {
        const recent=await recentLeetCode(p.leetcodeHandle);
        const ledger=(await getAppDb()).collection("program_lc_accepts");
        for(const ac of recent)await ledger.updateOne({_id:`${userId}:${ac.id}` as never},{$setOnInsert:{ownerId:userId,handle:p.leetcodeHandle,...ac,seenAt:now}},{upsert:true});
        const history=await ledger.find({ownerId:userId,handle:p.leetcodeHandle,titleSlug:{$in:run.snapshot.leetcode.problems.map(x=>x.slug)}}).toArray();
        run=reconcileLc(run,history as unknown as RecentLc[],Date.now());
      } catch {run.verification.lcError="LeetCode recent accepts are unavailable. Saved attempts stay self-reported/pending verification.";}
    }
  }
  run=ensureTiming(run,Date.now());
  const result=await col.updateOne({_id:id,revision:stored.revision},{$set:{run,revision:run.revision}});
  if(!result.matchedCount)throw new HttpError(409,"A concurrent save won. Refresh and retry the same action.");
  return publicProgram(p,run,d,Date.now());
}
export async function programExport(userId:string,programId:string) {
  const saved=await (await runCollection()).find({ownerId:userId,programId}).sort({"run.programDay":1}).toArray();
  const exportedAt=Date.now(),rows=saved.map(row=>({...row,run:ensureTiming(row.run,exportedAt)}));
  const sessions=rows.map(({run})=>{
    const {snapshot,topics,processed,...evidence}=run;void topics;void processed;
    return {...evidence,problemMetadata:{contest:snapshot.contest.problems.map(({hints,reveal,...p})=>{void hints;void reveal;return p;}),core:snapshot.core.practice.blocks.flatMap(b=>b.problems).map(({hints,reveal,...p})=>{void hints;void reveal;return p;}),leetcode:snapshot.leetcode.problems.map(({hints,reveal,...p})=>{void hints;void reveal;return p;})}};
  });
  const topicEvidence=rows.flatMap(({run})=>lessonNotesEvidence(run));
  return {schemaVersion:1,programId,exportedAt:new Date().toISOString(),sessions,topicEvidence};
}
