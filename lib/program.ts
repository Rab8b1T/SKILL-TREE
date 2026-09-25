import { z } from "zod";
import type { CoachContest, CoachLesson, CoachLeetCode, CoachPractice, CoachProblem } from "./coach";
import type { CfSubmission } from "./cf";
import { codeforcesProblemPoints, countsAsWrongSubmission } from "./contest";
import { activeElapsedAt, addTimingNotice, duringProblemWork, ensureTiming, finishPhase, nextQueuedProblem, pausePhase, PHASE_ORDER, startPhase, startProblem, timingForDay, type ProgramTiming } from "./program-timing";

export const BLOCKS = [
  { id: "contest", label: "Contest", minutes: 120, starts: "04:30", ends: "06:30" },
  { id: "review", label: "Review and upsolve", minutes: 60, starts: "06:30", ends: "07:30" },
  { id: "core", label: "Codeforces: learn and apply", minutes: 120, starts: "07:30", ends: "09:30" },
  { id: "leetcode", label: "Two LeetCode questions", minutes: 60, starts: "09:30", ends: "10:30" },
] as const;
export type BlockId = (typeof BLOCKS)[number]["id"];
export type Topic = { id: string; name: string; prerequisites: string[]; diagnosticEligible?: boolean; status?: string; evidence?: { kind: string; at: string; source: string }[] };
export type ProgramProblem = CoachProblem & { topicIds: string[] };
export type ProgramDay = {
  programDay: number; date: string; focus: string;
  diagnosticBootstrap?: boolean; diagnosticReason?: string;
  // programDay is the calendar index and stays derived from the date. label
  // names the session the learner is actually sitting, which drifts apart
  // whenever a prepared day never runs.
  label?: string;
  scheduleOverride?: { mode: "from-start"; authorizedAt: string; reason: string; totalMinutes?: number };
  contest: Omit<CoachContest,"problems"> & { problems: (ProgramProblem & { slot: string; points: number })[] };
  review: { minutes: number; prompt: string };
  core: { minutes: number; lesson: Omit<CoachLesson,"check"> & { topicIds: string[]; check: { q: string; a: string; keywords?: string[] }[] }; practice: CoachPractice };
  leetcode: Omit<CoachLeetCode,"problems"> & { problems: (CoachLeetCode["problems"][number] & { topicIds: string[] })[] };
};
export type Program = {
  schemaVersion: 1; programId: string; planVersion: number; contentHash: string; title: string;
  startDate: string; timezone: string; handle: string; leetcodeHandle: string;
  goals: { day: number; date: string; rating: number }[]; topics: Topic[]; days: ProgramDay[];
  curriculum?: { programDay?: number; day?: number; date: string; focus: string }[];
};
export function dayBlocks(d:ProgramDay) {
  let offsetMinutes=0;
  return BLOCKS.map(b=>{
    const minutes=d[b.id].minutes,block={...b,minutes,offsetMinutes};
    offsetMinutes+=minutes;
    return block;
  });
}
export function dayMinutes(d:ProgramDay){return dayBlocks(d).reduce((sum,b)=>sum+b.minutes,0);}
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const cfProblem = z.object({ key: z.string().regex(/^\d+-[A-Za-z]\d*$/), contestId: z.number().int().positive(), index: z.string(), name: z.string().min(1), rating: z.number().nonnegative(), tags: z.array(z.string()), topicIds: z.array(id).min(1), capMinutes: z.number().positive(), role: z.string(), }).passthrough();
const lesson = z.object({ title: z.string().min(1), topic: z.string(), topicIds: z.array(id).min(1), minutes: z.number().positive().max(120), why: z.string(), outcomes: z.array(z.string()), resources: z.array(z.object({ kind: z.enum(["book","video","article","docs"]), title: z.string(), url: z.string(), minutes: z.number().positive(), watchFor: z.string(), segment: z.string().optional() }).passthrough()), steps: z.array(z.object({ title:z.string(),body:z.string() }).passthrough()).min(1), drill:z.object({prompt:z.string()}).passthrough(), check:z.array(z.object({q:z.string(),a:z.string(),keywords:z.array(z.string().min(1)).optional()}).passthrough()).min(1) }).passthrough();
const programSchema = z.object({
  schemaVersion:z.literal(1),programId:id,planVersion:z.number().int().positive(),contentHash:z.string(),title:z.string(),startDate:z.string(),timezone:z.literal("Asia/Kolkata"),handle:z.string().min(1),leetcodeHandle:z.string().min(1),
  goals:z.array(z.object({day:z.number(),date:z.string(),rating:z.number()})),
  topics:z.array(z.object({id,name:z.string(),prerequisites:z.array(id),diagnosticEligible:z.boolean().optional()}).passthrough()),
  days:z.array(z.object({programDay:z.number().int().positive(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),focus:z.string(),contest:z.object({title:z.string(),minutes:z.number().int().positive().max(360),mirrors:z.string(),problems:z.array(cfProblem.extend({slot:z.string(),points:z.number().positive()})).min(2)}).passthrough(),review:z.object({minutes:z.number().int().positive().max(360),prompt:z.string()}),core:z.object({minutes:z.number().int().positive().max(360),lesson,practice:z.object({title:z.string(),blocks:z.array(z.object({id:z.string(),label:z.string(),minutes:z.number().positive(),problems:z.array(cfProblem)}).passthrough())})}),leetcode:z.object({title:z.string(),minutes:z.number().int().positive().max(360),problems:z.array(z.object({slug:z.string().regex(/^[a-z0-9-]+$/),title:z.string(),difficulty:z.enum(["Easy","Medium","Hard"]),url:z.string().url(),capMinutes:z.number().positive(),mirrors:z.string(),topicIds:z.array(id).min(1)}).passthrough()).length(2)})}).passthrough()),
}).passthrough();

export function parseProgram(value: unknown): Program {
  const p = programSchema.parse(value) as unknown as Program;
  const topics = new Map(p.topics.map(t => [t.id,t]));
  if (topics.size !== p.topics.length) throw new Error("Duplicate topic IDs");
  const visited = new Set<string>();
  function visit(key:string, path:Set<string>) {
    if (path.has(key)) throw new Error(`Topic prerequisite cycle: ${key}`);
    if (visited.has(key)) return;
    const t=topics.get(key); if(!t) throw new Error(`Unknown topic: ${key}`);
    for(const pre of t.prerequisites) visit(pre,new Set([...path,key]));
    visited.add(key);
  }
  for(const t of p.topics) visit(t.id,new Set());
  const days = new Set<number>();
  for(const d of p.days) {
    if(d.scheduleOverride){
      const o=d.scheduleOverride,at=Date.parse(o.authorizedAt);
      if(o.mode!=="from-start"||!o.reason?.trim()||!Number.isFinite(at)||localDate(at)!==d.date)
        throw new Error("A late-start exception needs same-day authorization and a reason");
    }
    const budget=d.scheduleOverride?.totalMinutes;
    if(budget!==undefined){
      if(!Number.isInteger(budget)||budget<=0||budget>360||dayMinutes(d)!==budget)
        throw new Error("The approved session budget must equal its block durations");
    }else if(BLOCKS.some(b=>d[b.id].minutes!==b.minutes)){
      throw new Error("Changed block durations require an approved session budget");
    }
    if(d.diagnosticBootstrap!==undefined&&typeof d.diagnosticBootstrap!=="boolean")throw new Error("Diagnostic bootstrap must be explicitly true or false");
    if(d.diagnosticBootstrap&&!d.diagnosticReason?.trim())throw new Error("Diagnostic bootstrap needs the coach's reason");
    if(days.has(d.programDay)) throw new Error("Duplicate program day"); days.add(d.programDay);
    const expected=new Date(`${p.startDate}T00:00:00Z`); expected.setUTCDate(expected.getUTCDate()+d.programDay-1);
    if(expected.toISOString().slice(0,10)!==d.date) throw new Error(`Day ${d.programDay} date does not match startDate`);
    for(const b of [d.contest.problems, d.core.practice.blocks.flatMap(b=>b.problems), d.leetcode.problems]) {
      const keys=b.map(x=>"key" in x?x.key:x.slug); if(new Set(keys).size!==keys.length)throw new Error("Duplicate problems in block");
      for(const x of b) for(const t of (x as ProgramProblem).topicIds) if(!topics.has(t))throw new Error(`Unknown problem prerequisite ${t}`);
    }
    const practiceMinutes=d.core.practice.blocks.reduce((sum,b)=>sum+b.minutes,0);
    if(d.core.lesson.minutes+practiceMinutes!==d.core.minutes)throw new Error("Lesson and practice must fill the core block");
    if(d.leetcode.problems.reduce((sum,x)=>sum+x.capMinutes,0)>d.leetcode.minutes)throw new Error("LeetCode caps exceed the block");
  }
  return p;
}

export function canonicalJson(value: unknown): string {
  if(Array.isArray(value))return `[${value.map(canonicalJson).join(",")}]`;
  if(value && typeof value==="object")return `{${Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function sessionId(programId:string,day:number) {return `${programId}:day-${day}`;}
export function localDate(now:number,timezone="Asia/Kolkata") {return new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(now);}
export function morningStart(date:string) {return Date.parse(`${date}T04:30:00+05:30`);}
export function startWindow(d:ProgramDay,now:number) {
  if(d.scheduleOverride?.mode==="from-start"){
    const startsAt=Math.max(morningStart(d.date),Date.parse(d.scheduleOverride.authorizedAt));
    const endsAt=Date.parse(`${d.date}T00:00:00+05:30`)+(1440-dayMinutes(d))*60000;
    return {startsAt,endsAt,fromStart:true,canStart:now>=startsAt&&now<endsAt,reason:now<startsAt?"Today's late-start exception is not open yet.":now>=endsAt?"Today's late-start window has passed. Ask Mentor to prepare the next day.":`Today's ${dayMinutes(d)}-minute session begins when you press Start. Start, pause and move between phases manually; breaks and guided study are tracked separately.`};
  }
  const startsAt=morningStart(d.date),endsAt=startsAt+120*60000;
  return {startsAt,endsAt,fromStart:false,canStart:now>=startsAt&&now<endsAt,reason:now<startsAt?`Prepared for ${d.date}, 04:30 IST. The contest opens then.`:now>=endsAt?"The morning contest window has passed. Ask Mentor for the next actual day; this session cannot be backdated.":"The planned morning is 04:30–10:30 IST. Each phase uses manual Start, Pause and Next controls; breaks and guided time are tracked separately."};
}
export type Attempt = { key:string;block:BlockId;startedAt:number;finishedAt?:number;technique:string;note?:string;reported?:"incomplete"|"solved"|"aided";hintsUsed:number;solutionSeen:boolean;helpStartedAt?:number;verification:"pending"|"verified";submissions?:{id:number;at:number;verdict:NonNullable<CfSubmission["verdict"]>|"PENDING";passedTestCount?:number}[];solvedAt?:number;wrongAttempts?:number;lastCheckedAt?:number };
export type LessonEvidence={submittedAt:number;eventId?:string;teachBack:string;answers:string[];primitiveCode:string;recallPassed?:boolean;assessment:"unreviewed"|"recall_checked"|"pending_coach";topicIds:string[]};
export type ProgramRun={
  sessionId:string;programId:string;programDay:number;date:string;actualDate:string;planVersion:number;contentHash:string;revision:number;startedAt:number;
  timing?:ProgramTiming;
  snapshot:ProgramDay;topics:Topic[];blocks:Record<BlockId,{startedAt:number;endsAt:number}>;attempts:Record<string,Attempt>;
  lessonEvidence?:LessonEvidence;lessonEvidenceHistory?:LessonEvidence[];review?:{rootCause:string;note:string;upsolveKey:string;submittedAt:number};
  contestCompletion?:{finishedAt:number;scheduledEndsAt:number};
  events:{id:string;type:string;at:number;block?:BlockId;key?:string}[];processed:string[];
  verification:{cfCheckedAt?:number;lcCheckedAt?:number;cfError?:string;lcError?:string};
};
export function createRun(p:Program,d:ProgramDay,now:number):ProgramRun {
  let offset=0;const blocks={} as ProgramRun["blocks"],anchor=d.scheduleOverride?.mode==="from-start"?now:morningStart(d.date);
  for(const b of dayBlocks(d)){blocks[b.id]={startedAt:anchor+offset*60000,endsAt:anchor+(offset+b.minutes)*60000};offset+=b.minutes;}
  const timing=timingForDay(d);startPhase(timing,"contest",now);
  const first=timing.phases.contest.problems[0];if(first)startProblem(timing,"contest",first.key,now);
  const attempts:ProgramRun["attempts"]={};if(first)attempts[`contest:${first.key}`]={key:first.key,block:"contest",startedAt:now,technique:"Not recorded",hintsUsed:0,solutionSeen:false,verification:"pending"};
  return {timing,sessionId:sessionId(p.programId,d.programDay),programId:p.programId,programDay:d.programDay,date:d.date,actualDate:localDate(now),planVersion:p.planVersion,contentHash:p.contentHash,revision:0,startedAt:now,snapshot:structuredClone(d),topics:structuredClone(p.topics),blocks,attempts,events:[],processed:[],verification:{}};
}
export function blockAt(run:ProgramRun,now:number):BlockId|null{return run.timing ? run.timing.currentBlock : BLOCKS.find(b=>now>=run.blocks[b.id].startedAt && now<run.blocks[b.id].endsAt)?.id??null;}
export function latestTopicEvidence(topic:Topic,at:number) {
  return topic.evidence?.filter(e=>!e.source?.includes("keyword recall check only")&&e.source?.trim()&&Number.isFinite(Date.parse(e.at))&&Date.parse(e.at)<=at).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0];
}
export function topicStatus(topic:Topic,at:number) {
  const evidence=latestTopicEvidence(topic,at);
  return evidence?.kind??"unknown";
}
export function topicEligible(topics:Topic[],key:string,kind:"contest"|"core",day:number,at:number,diagnosticBootstrap=false,seen=new Set<string>()):boolean {
  if(seen.has(key))return false;const t=topics.find(t=>t.id===key);if(!t)return false;
  const latest=latestTopicEvidence(t,at);
  const evidence=latest&&[...(kind==="contest"?["independent","retained"]:["taught","guided","independent","retained"])].includes(latest.kind);
  // A return diagnostic measures rusty basics without creating learning evidence.
  const diagnostic=kind==="contest"&&diagnosticBootstrap&&t.diagnosticEligible===true&&(!latest||!["unknown","reopened"].includes(latest.kind));
  return Boolean((evidence||diagnostic)&&t.prerequisites.every(k=>topicEligible(topics,k,kind,day,at,diagnosticBootstrap,new Set([...seen,key]))));
}
export function assertContestEligible(p:Program,d:ProgramDay,now:number) {
  for(const problem of d.contest.problems)for(const topic of problem.topicIds)if(!topicEligible(p.topics,topic,"contest",d.programDay,now,d.diagnosticBootstrap===true))throw new Error(`Contest prerequisite has no independent evidence: ${topic}`);
}
export function problemFor(d:ProgramDay,block:BlockId,key:string) {
  if(block==="leetcode")return d.leetcode.problems.find(p=>p.slug===key);
  const list=block==="contest"||block==="review"?d.contest.problems:d.core.practice.blocks.flatMap(b=>b.problems);
  return list.find(p=>p.key===key) as ProgramProblem|undefined;
}
const causes=["prerequisite","observation","proof","implementation","complexity","reading","time","clean"];
export const actionSchema=z.discriminatedUnion("type",[
  z.object({type:z.literal("start"),confirmedPrerequisites:z.literal(true)}),
  z.object({type:z.literal("finish-contest")}),
  z.object({type:z.literal("phase-start"),block:z.enum(["contest","review","core","leetcode"])}),
  z.object({type:z.literal("phase-pause"),block:z.enum(["contest","review","core","leetcode"])}),
  z.object({type:z.literal("phase-next"),block:z.enum(["contest","review","core","leetcode"])}),
  z.object({type:z.literal("problem-start"),block:z.enum(["contest","review","core","leetcode"]),key:z.string(),technique:z.string().max(1000).optional()}),
  z.object({type:z.literal("problem-skip"),block:z.enum(["contest","review","core","leetcode"]),key:z.string()}),
  z.object({type:z.literal("problem-help"),block:z.enum(["contest","review","core","leetcode"]),key:z.string()}),
  z.object({type:z.literal("problem-complete"),block:z.enum(["contest","review","core","leetcode"]),key:z.string(),reported:z.enum(["solved","aided"]),note:z.string().max(10000).optional()}),
  z.object({type:z.literal("attempt"),block:z.enum(["contest","review","core","leetcode"]),key:z.string(),technique:z.string().max(1000)}),
  z.object({type:z.literal("report"),block:z.enum(["contest","review","core","leetcode"]),key:z.string(),reported:z.enum(["incomplete","solved","aided"]),note:z.string().max(10000)}),
  z.object({type:z.literal("hint"),block:z.enum(["review","core","leetcode"]),key:z.string(),solution:z.boolean().optional()}),
  z.object({type:z.literal("lesson"),teachBack:z.string().max(10000).default(""),answers:z.array(z.string().max(10000)).max(100).default([]),primitiveCode:z.string().max(30000).default("")}),
  z.object({type:z.literal("review"),rootCause:z.enum(causes as [string,...string[]]),note:z.string().max(10000).default(""),upsolveKey:z.string().default("")}),
  z.object({type:z.literal("sync"),source:z.enum(["cf","lc"])}),
]);
export type ProgramAction=z.infer<typeof actionSchema>;
/** Notes are learner input, never an automatic assessment or practice gate. */
export function lessonNotesEvidence(run:ProgramRun) {
  const notes=[...(run.lessonEvidenceHistory??[]),...(run.lessonEvidence?[run.lessonEvidence]:[])];
  return notes.map(({recallPassed,assessment,...entry})=>{
    void recallPassed;void assessment;
    return {...entry,eventId:`${run.sessionId}:lesson-notes:${entry.eventId??entry.submittedAt}`,sessionId:run.sessionId,programId:run.programId,kind:"pending_assessment",assessment:"unreviewed",at:entry.submittedAt,source:"optional learner notes; awaiting agent review after the day or at the next check-in"};
  });
}
function recordAttempt(run:ProgramRun,block:BlockId,key:string,now:number,technique?:string) {
  const id=`${block}:${key}`,existing=run.attempts[id];
  if(existing){if(technique?.trim())existing.technique=technique.trim();return existing;}
  return run.attempts[id]={key,block,startedAt:now,technique:technique?.trim()||"Not recorded",hintsUsed:0,solutionSeen:false,verification:"pending"};
}
function assertAssignedProblem(run:ProgramRun,block:BlockId,key:string) {
  if(!problemFor(run.snapshot,block,key))throw new Error("Problem not in this block");
}
function syncLegacyBlock(run:ProgramRun,block:BlockId,now:number) {
  const phase=run.timing!.phases[block];
  if(phase.startedAt!==undefined)run.blocks[block].startedAt=phase.startedAt;
  run.blocks[block].endsAt=phase.finishedAt??now+Math.max(0,phase.budgetMs-phase.elapsedMs);
}
function advancePhase(run:ProgramRun,block:BlockId,now:number) {
  const phase=run.timing!.phases[block];
  if(block==="contest"&&!run.contestCompletion)run.contestCompletion={finishedAt:now,scheduledEndsAt:run.blocks.contest.startedAt+phase.budgetMs};
  for(const p of phase.problems){const a=run.attempts[`${block}:${p.key}`];if(a){a.finishedAt??=now;if(p.status!=="completed")a.reported=a.verification==="verified"?a.helpStartedAt!==undefined||a.hintsUsed||a.solutionSeen?"aided":"solved":"incomplete";}}
  finishPhase(run.timing!,block,now);
  if(block==="contest")for(const problem of run.timing!.phases.review.problems)if(run.attempts[`contest:${problem.key}`]?.verification==="verified")problem.optional=true;
  syncLegacyBlock(run,block,now);
}
function beginGuided(run:ProgramRun,block:BlockId,key:string,now:number) {
  if(run.timing!.currentBlock!==block)throw new Error("Open this problem's current phase before continuing with help.");
  const phase=run.timing!.phases[block],problem=phase.problems.find(p=>p.key===key);
  if(!problem)throw new Error("Problem not in this phase");
  const active=phase.problems.find(p=>p.key===phase.activeKey);
  if(active&&active.key!==key&&(active.status==="guided"||active.status==="expired"))throw new Error("Finish or skip the current problem before opening another guided problem.");
  if(problem.status==="completed")throw new Error("This problem is already complete.");
  pausePhase(run.timing!,block,now,"guided");
  phase.startedAt??=now;phase.activeKey=key;problem.status="guided";problem.guidedSince=now;delete problem.runningSince;
  const a=recordAttempt(run,block,key,now);a.reported="aided";a.helpStartedAt??=now;delete a.finishedAt;
}
export function closeProblem(run:ProgramRun,block:BlockId,key:string,now:number,reported:"incomplete"|"solved"|"aided",note?:string,automatic=false) {
  const phase=run.timing!.phases[block],problem=phase.problems.find(p=>p.key===key);if(!problem)throw new Error("Problem not in this phase");
  const wasActive=phase.activeKey===key,wasManuallyPaused=phase.pauseReason==="manual";
  const a=recordAttempt(run,block,key,now);
  a.reported=a.helpStartedAt!==undefined||problem.guidedElapsedMs>0||problem.status==="guided"||a.hintsUsed>0||a.solutionSeen?reported==="incomplete"?"incomplete":"aided":reported;
  a.finishedAt=now;if(note!==undefined)a.note=note;
  problem.status=reported==="incomplete"?"incomplete":"completed";problem.completedAt=now;delete problem.runningSince;delete problem.guidedSince;
  if(wasActive&&run.timing!.currentBlock===block){
    if(automatic&&wasManuallyPaused){delete phase.activeKey;return;}
    const next=nextQueuedProblem(run.timing!,block,now);
    if(next){
      try{assertAssignedProblem(run,block,next);recordAttempt(run,block,next,now);}
      catch(error){pausePhase(run.timing!,block,now);phase.blockedReason=(error as Error).message;const queued=phase.problems.find(p=>p.key===next)!;queued.status="queued";delete queued.runningSince;delete phase.activeKey;}
    }
  }
}
export function applyAction(original:ProgramRun,action:ProgramAction,eventId:string,now:number):ProgramRun {
  if(original.processed.includes(eventId))return original;
  if(now<original.startedAt)throw new Error("This session has not started yet.");
  const run=ensureTiming(original,now),timing=run.timing!,block=timing.currentBlock;
  if(action.type==="start")return original;
  if(action.type==="finish-contest"||action.type==="phase-next") {
    const id=action.type==="finish-contest"?"contest":action.block;
    if(action.type==="finish-contest"&&run.contestCompletion)return original;
    advancePhase(run,id,now);
  }else if(action.type==="phase-start"){
    startPhase(timing,action.block,now);
    const phase=timing.phases[action.block];
    if(!phase.activeKey&&action.block!=="core"){
      const next=phase.problems.find(p=>!p.optional&&(p.status==="queued"||p.status==="paused"));
      if(next){assertAssignedProblem(run,action.block,next.key);startProblem(timing,action.block,next.key,now);recordAttempt(run,action.block,next.key,now);}
    }
    syncLegacyBlock(run,action.block,now);
  }else if(action.type==="phase-pause"){
    if(block!==action.block)throw new Error("Only the current phase can be paused.");
    if(timing.phases[action.block].status==="ready")throw new Error("Start this phase first.");
    pausePhase(timing,action.block,now);
  }else if(action.type==="lesson") {
    if(timing.phases.review.status!=="completed")throw new Error("The core lesson opens after the contest and review phases");
    if(action.answers.length>run.snapshot.core.lesson.check.length)throw new Error("More answers were supplied than this lesson has prompts");
    if(run.lessonEvidence){run.lessonEvidenceHistory??=[];run.lessonEvidenceHistory.push(run.lessonEvidence);}
    run.lessonEvidence={submittedAt:now,eventId,teachBack:action.teachBack,answers:action.answers,primitiveCode:action.primitiveCode,assessment:"unreviewed",topicIds:run.snapshot.core.lesson.topicIds};
  }else if(action.type==="review") {
    if(timing.phases.contest.status!=="completed")throw new Error("Review is locked during the contest");
    if(action.upsolveKey&&!problemFor(run.snapshot,"review",action.upsolveKey))throw new Error("Choose a problem from this contest");
    run.review={rootCause:action.rootCause,note:action.note,upsolveKey:action.upsolveKey,submittedAt:now};
  }else if(action.type!=="sync") {
    const p=problemFor(run.snapshot,action.block,action.key);if(!p)throw new Error("Problem not in this block");
    const key=`${action.block}:${action.key}`;
    if(action.type==="attempt"||action.type==="problem-start") {
      assertAssignedProblem(run,action.block,action.key);
      startProblem(timing,action.block,action.key,now);recordAttempt(run,action.block,action.key,now,action.technique);
      syncLegacyBlock(run,action.block,now);
    }else if(action.type==="problem-help"){
      if(block!==action.block)throw new Error("This is not the current phase.");
      if(action.block==="contest"){
        advancePhase(run,"contest",now);
        beginGuided(run,"review",action.key,now);
      }else beginGuided(run,action.block,action.key,now);
    }else if(action.type==="problem-complete"||action.type==="problem-skip"){
      if(block!==action.block)throw new Error("Only a problem in the current phase can move the queue.");
      closeProblem(run,action.block,action.key,now,action.type==="problem-skip"?"incomplete":action.reported,action.type==="problem-complete"?action.note:undefined);
    }else if(action.type==="report"){
      const a=run.attempts[key];if(!a)throw new Error("Start an attempt before recording its outcome");
      if(block===action.block)closeProblem(run,action.block,action.key,now,action.reported,action.note);
      else {a.reported=a.helpStartedAt!==undefined||a.hintsUsed||a.solutionSeen?action.reported==="solved"?"aided":action.reported:action.reported;a.note=action.note;a.finishedAt??=now;}
    }else if(action.type==="hint") {
      if(timing.phases.contest.status!=="completed")throw new Error("Hints stay locked until the contest ends");
      if(block!==action.block)throw new Error("Open this problem's phase before requesting help");
      const a=run.attempts[key];if(!a)throw new Error("Record your attempt before opening a hint");
      if(timing.phases[action.block].problems.find(p=>p.key===action.key)?.status!=="guided")beginGuided(run,action.block,action.key,now);
      if(action.solution)a.solutionSeen=true;else a.hintsUsed=Math.min((p.hints?.ladder.length??0),a.hintsUsed+1);
    }
  }
  run.processed.push(eventId);run.events.push({id:eventId,type:action.type,at:now,...("block" in action?{block:action.block,...("key" in action?{key:action.key}:{})}:{})});run.revision++;
  return run;
}
export function reconcileCf(run:ProgramRun,submissions:CfSubmission[],now:number):ProgramRun {
  const out=ensureTiming(run,now);
  for(const b of ["contest","review","core"] as const) {
    const probs=b==="core"?out.snapshot.core.practice.blocks.flatMap(x=>x.problems):out.snapshot.contest.problems;
    for(const p of probs) {
      const k=`${b}:${p.key}`,a=out.attempts[k];
      // A real contest submission is itself an attempt even if Start was missed.
      const since=b==="contest"?out.startedAt:a?.startedAt;
      if(since===undefined)continue;
      const until=now;
      const subs=submissions.filter(s=>`${s.problem.contestId}-${s.problem.index}`===p.key&&s.creationTimeSeconds*1000>=since&&s.creationTimeSeconds*1000<until&&duringProblemWork(out,b,p.key,s.creationTimeSeconds*1000,now)).sort((x,y)=>x.creationTimeSeconds-y.creationTimeSeconds);
      if(!a&&!subs.length)continue;
      const entry=a??{key:p.key,block:b,startedAt:subs[0].creationTimeSeconds*1000,technique:"Not recorded",hintsUsed:0,solutionSeen:false,verification:"pending" as const};
      const saved=new Map((entry.submissions??[]).map(s=>[s.id,s]));
      for(const s of subs)saved.set(s.id,{id:s.id,at:s.creationTimeSeconds*1000,verdict:s.verdict??"PENDING",passedTestCount:s.passedTestCount});
      entry.submissions=[...saved.values()].sort((x,y)=>x.at-y.at);
      const ac=entry.submissions.find(s=>s.verdict==="OK");entry.verification=ac?"verified":"pending";entry.solvedAt=ac?.at;
      entry.wrongAttempts=entry.submissions.filter(s=>(!ac||s.at<=ac.at)&&countsAsWrongSubmission("cf",s.verdict==="PENDING"?undefined:s.verdict,s.passedTestCount)).length;entry.lastCheckedAt=now;out.attempts[k]=entry;
      if(ac){addTimingNotice(out.timing!,{kind:"accepted",block:b,key:p.key,at:ac.at});
        if(b==="contest")out.timing!.phases.review.problems.find(x=>x.key===p.key)!.optional=true;
        if(!["completed","guided"].includes(out.timing!.phases[b].problems.find(x=>x.key===p.key)!.status))closeProblem(out,b,p.key,now,"solved",undefined,true);}

    }
  }
  out.verification.cfCheckedAt=now;delete out.verification.cfError;return out;
}
export function contestScore(run:ProgramRun){return run.snapshot.contest.problems.reduce((sum,p)=>{const a=run.attempts[`contest:${p.key}`];return sum+(a?.verification==="verified"&&a.solvedAt!==undefined?codeforcesProblemPoints(p.points,(run.timing?activeElapsedAt(run.timing.phases.contest,a.solvedAt):a.solvedAt-run.blocks.contest.startedAt)/1000,run.snapshot.contest.minutes*60,a.wrongAttempts??0):0);},0);}

/** Explicit allowlists keep authored answers out of responses, including extra fields. */
export function publicProgram(p:Program,run:ProgramRun|null,selected:ProgramDay,now:number) {
  run=run?ensureTiming(run,now):null;
  const d=run?.snapshot??selected;
  const unlocked=(block:BlockId)=>Boolean(run&&(run.timing!.currentBlock===null||PHASE_ORDER.indexOf(block)<=PHASE_ORDER.indexOf(run.timing!.currentBlock)));
  const reveal=Boolean(run&&run.timing!.phases.contest.status==="completed");
  const started=Boolean(run);
  const safeProblem=(problem:ProgramProblem|ProgramDay["leetcode"]["problems"][number],block:BlockId)=>{
    const key="key" in problem?problem.key:problem.slug;
    const a=run?.attempts[`${block}:${key}`];
    const visible=block==="contest"?started:unlocked(block);
    if(!visible)return null;
    return {key,name:"name" in problem?problem.name:problem.title,url:"url" in problem?problem.url:`https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`,capMinutes:(run?.timing?.phases[block].problems.find(p=>p.key===key)?.capMs??problem.capMinutes*60000)/60000,...("slot" in problem?{slot:problem.slot}:{}),...(reveal?{rating:"rating" in problem?problem.rating:undefined,topicIds:problem.topicIds}:{}),hintCount:problem.hints?.ladder.length??0,hints:reveal&&a?problem.hints?.ladder.slice(0,a.hintsUsed).map(h=>({ask:h.ask,say:h.say,figure:h.figure})):[],solution:reveal&&a?.solutionSeen?{say:problem.hints?.solution?.say??problem.reveal,figure:problem.hints?.solution?.figure}:undefined};
  };
  const lessonOpen=unlocked("core");
  const publicTiming=run?structuredClone(run.timing!):undefined;
  if(publicTiming)for(const block of PHASE_ORDER)if(!unlocked(block))publicTiming.phases[block].problems=[];
  const l=d.core.lesson;
  return {
    program:{programId:p.programId,title:p.title,planVersion:run?.planVersion??p.planVersion,contentHash:run?.contentHash??p.contentHash,startDate:p.startDate,timezone:p.timezone,goals:p.goals,diagnosticBasics:p.topics.filter(t=>t.diagnosticEligible).map(t=>t.name),topics:p.topics.map(t=>({id:t.id,name:t.name,status:topicStatus(t,now),prerequisites:t.prerequisites})),curriculum:p.curriculum??[]},
    day:{programDay:d.programDay,label:d.label,date:d.date,focus:d.focus,contest:{title:d.contest.title,minutes:d.contest.minutes,count:d.contest.problems.length,problems:d.contest.problems.map(x=>safeProblem(x,"contest")).filter(Boolean)},review:{prompt:reveal?d.review.prompt:"Review unlocks after the contest",problems:reveal?d.contest.problems.map(x=>safeProblem(x,"review")).filter(Boolean):[]},core:{lesson:lessonOpen?{title:l.title,topic:l.topic,minutes:l.minutes,why:l.why,outcomes:l.outcomes,resources:l.resources,steps:l.steps,drill:l.drill,check:l.check.map(q=>({q:q.q}))}:null,problems:d.core.practice.blocks.flatMap(b=>b.problems).map(x=>safeProblem(x as ProgramProblem,"core")).filter(Boolean)},leetcode:{problems:d.leetcode.problems.map(x=>safeProblem(x,"leetcode")).filter(Boolean)}},
    run:run?{sessionId:run.sessionId,programDay:run.programDay,actualDate:run.actualDate,revision:run.revision,timing:publicTiming!,blocks:run.blocks,attempts:run.attempts,lessonEvidence:run.lessonEvidence,review:run.review,contestCompletion:run.contestCompletion,verification:run.verification,score:contestScore(run),currentBlock:blockAt(run,now)}:null,
    blocks:dayBlocks(d),totalMinutes:dayMinutes(d),serverNow:now,startWindow:startWindow(d,now),
  };
}
export type ProgramView=ReturnType<typeof publicProgram>;
