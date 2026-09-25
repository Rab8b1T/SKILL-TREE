"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useMutation,useQuery,useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight,BookOpen,Download,RefreshCw,ShieldCheck,Play,Check,SkipForward } from "lucide-react";
import { type BlockId,type ProgramAction,type ProgramView } from "@/lib/program";
import { useSession } from "@/lib/queries";
import { PageHeader,PageShell } from "@/components/layout/page";
import { Card,CardTitle,SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FigureView } from "@/components/coach/figure";
import { HandlePrompt } from "@/components/handle-prompt";
import { cn } from "@/lib/utils";
import { projectTiming, type ProgramTiming } from "@/lib/program-timing";
import { useNow } from "@/lib/use-now";
import { ProgramAlerts, SessionControls, duration } from "./session-controls";

class ProgramRequestError extends Error {
  constructor(message:string,readonly status:number){super(message);}
}
async function request(url:string,body?:unknown):Promise<ProgramView>{
  const r=await fetch(url,{method:body?"POST":"GET",cache:"no-store",signal:AbortSignal.timeout(45000),headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});
  const data=await r.json();if(!r.ok)throw new ProgramRequestError(data.error??"Could not reach the server",r.status);return data;
}
function stamp(ms:number){return new Date(ms).toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit"});}
type Save=(action:ProgramAction)=>Promise<void>;
type SafeProblem=NonNullable<ProgramView["day"]["contest"]["problems"][number]>;

/** Draft text is durable even before a network save succeeds. */
function useDraft(key:string,fallback="",legacyKey?:string){
  const [text,setText]=useState(fallback);
  useEffect(()=>{
    const stored=readLocal(key)??(legacyKey?readLocal(legacyKey):null);
    // Hydrate browser-only drafts after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(stored??fallback);
  },[key,fallback,legacyKey]);
  return [text,(v:string)=>{setText(v);if(!writeLocal(key,v))toast.warning("This draft is only in memory because browser storage is unavailable. Keep this page open until you can save it.",{id:"program-draft-storage"});}] as const;
}
const field="w-full rounded-xl border border-line bg-sunken p-3 text-sm text-ink outline-none focus:border-accent";
function TextField({label,value,onChange,code=false}:{label:string;value:string;onChange:(v:string)=>void;code?:boolean}){
  return <label className="block space-y-2"><span className="text-sm font-medium text-ink">{label}</span><textarea className={cn(field,code&&"font-mono text-xs")} rows={code?7:3} value={value} onChange={e=>onChange(e.target.value)}/></label>;
}

function readLocal(key:string){try{return localStorage.getItem(key);}catch{return null;}}
function writeLocal(key:string,value:string){try{localStorage.setItem(key,value);return true;}catch{return false;}}
function removeLocal(key:string){try{localStorage.removeItem(key);}catch{/* The visible recovery controls remain available. */}}
function subscribeOnline(listener:()=>void){window.addEventListener("online",listener);window.addEventListener("offline",listener);return()=>{window.removeEventListener("online",listener);window.removeEventListener("offline",listener);};}
const onlineSnapshot=()=>navigator.onLine;
type SavedAction={eventId:string;programId:string;programDay:number;revision:number;action:ProgramAction;context?:{block:BlockId|null;key?:string;status?:string}};
function sameContext(body:SavedAction,fresh:ProgramView){
  if(body.programId!==fresh.program.programId||body.programDay!==fresh.day.programDay)return false;
  if(!/^(phase-|problem-|finish-contest)/.test(body.action.type))return true;
  const timing=fresh.run?.timing,current=timing?.currentBlock;
  if(!timing||!current||!body.context||current!==body.context.block)return false;
  const phase=timing.phases[current];
  return phase.activeKey===body.context.key&&phase.status===body.context.status;
}

export function ProgramMorning({initialBlock,initialDay}:{initialBlock?:BlockId;initialDay?:number}){
  const session=useSession(),handle=session.data?.user?.cfHandle;
  const qc=useQueryClient();
  const queryKey=useMemo(()=>["program",handle,initialDay??null],[handle,initialDay]);
  const query=useQuery({queryKey,queryFn:async()=>{
    const fetched=await request(initialDay?`/api/program?day=${initialDay}`:"/api/program");
    const previous=qc.getQueryData<ProgramView>(queryKey);
    if(previous?.run&&fetched.run&&previous.run.sessionId===fetched.run.sessionId&&(previous.run.revision>fetched.run.revision||(previous.run.revision===fetched.run.revision&&previous.serverNow>fetched.serverNow)))return previous;
    return fetched;
  },enabled:!!handle,refetchInterval:15000,refetchOnWindowFocus:true,retry:1});
  const online=useSyncExternalStore(subscribeOnline,onlineSnapshot,()=>true);
  const [selected,setSelected]=useState<BlockId|undefined>(initialBlock);
  const [preflight,setPreflight]=useState(false),[pending,setPending]=useState(false);
  const [pendingMessage,setPendingMessage]=useState("");
  const [cached,setCached]=useState<{view:ProgramView;offset:number}|null>(null);
  const [serverOffset,setServerOffset]=useState(0);
  const [wakeAt,setWakeAt]=useState(0);
  const [checking,setChecking]=useState(false);
  const [lastCheckAttempt,setLastCheckAttempt]=useState(0);
  const writing=useRef(false),syncing=useRef(false);
  const now=Math.max(useNow(1000)??0,wakeAt)+serverOffset;
  const storageKey=`st.program.outbox.${handle??""}`;
  const cacheKey=`st.program.view.${handle??""}.${initialDay??"today"}`;
  const data=query.data??cached?.view;
  const timing=data?.run?.timing?projectTiming(data.run.timing,now):null;
  const offline=!online||query.isError||!query.data;
  const draftScope=`st.program.${handle??""}.${data?.program.programId??""}.${data?.day.programDay??""}`;

  useEffect(()=>{
    const wake=()=>setWakeAt(Date.now());
    window.addEventListener("focus",wake);document.addEventListener("visibilitychange",wake);
    return()=>{window.removeEventListener("focus",wake);document.removeEventListener("visibilitychange",wake);};
  },[]);
  useEffect(()=>{
    const saved=data?.run?.timing,current=saved?.currentBlock;
    if(!saved||!current||typeof Worker==="undefined")return;
    const phase=saved.phases[current],problem=phase.problems.find(p=>p.key===phase.activeKey);
    if(phase.status!=="running"||phase.runningSince===undefined)return;
    const deadline=Math.min(phase.runningSince+phase.budgetMs-phase.elapsedMs,problem?.status==="running"&&problem.runningSince!==undefined?problem.runningSince+problem.capMs-problem.elapsedMs:Infinity);
    let worker:Worker;
    try{worker=new Worker("/phase-alarm-worker.js");}catch{return;}
    worker.onmessage=()=>setWakeAt(Date.now());
    worker.postMessage({type:"schedule",alarms:[{id:`program:${current}:${deadline}`,at:deadline-serverOffset}]});
    return()=>worker.terminate();
  },[data?.run?.timing,serverOffset]);

  useEffect(()=>{
    if(!handle)return;
    // Browser-only recovery state is hydrated after the first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(Boolean(readLocal(storageKey)));
    try{
      const value:unknown=JSON.parse(readLocal(cacheKey)??"null");
      if(value&&typeof value==="object"&&"view" in value&&"offset" in value){
        const saved=value as {view:ProgramView;offset:number};
        if(saved.view?.program?.programId&&typeof saved.offset==="number"){setCached(saved);if(!query.data)setServerOffset(saved.offset);}
      }
    }catch{/* A malformed cached view never replaces a server response. */}
    const onStorage=(event:StorageEvent)=>{if(event.key===storageKey)setPending(Boolean(readLocal(storageKey)));};
    window.addEventListener("storage",onStorage);return()=>window.removeEventListener("storage",onStorage);
  // The cache is loaded once per account/day; fresh responses have their own effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[handle,storageKey,cacheKey]);
  useEffect(()=>{
    if(!query.data)return;
    const offset=query.data.serverNow-Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServerOffset(offset);
    writeLocal(cacheKey,JSON.stringify({view:query.data,offset}));
  },[query.data,cacheKey]);

  function acceptView(value:ProgramView){
    const apply=(key:readonly unknown[])=>{
      const previous=qc.getQueryData<ProgramView>(key);
      if(previous?.run&&value.run&&previous.run.sessionId===value.run.sessionId&&previous.run.revision>value.run.revision)return;
      qc.setQueryData(key,value);
    };
    apply(["program",handle,value.day.programDay]);
    if(initialDay===value.day.programDay||(!initialDay&&data?.day.programDay===value.day.programDay))apply(queryKey);
  }
  const mutation=useMutation({mutationFn:async(body:SavedAction)=>{
    if(!writeLocal(storageKey,JSON.stringify(body)))throw new Error("Your browser could not save this action for recovery. Enable site storage before changing a timer.");
    setPending(true);writing.current=true;
    try{
      let result:ProgramView;
      try{result=await request("/api/program/action",body);}
      catch(error){
        if(!(error instanceof ProgramRequestError)||error.status!==409)throw error;
        const fresh=await request(`/api/program?day=${body.programDay}`);acceptView(fresh);
        if(!sameContext(body,fresh))throw error;
        // A verdict sync can advance the revision without changing the learner's
        // phase. Rebase only while the action still targets exactly that context.
        body={...body,revision:fresh.run?.revision??0};writeLocal(storageKey,JSON.stringify(body));
        result=await request("/api/program/action",body);
      }
      removeLocal(storageKey);setPending(false);setPendingMessage("");return result;
    }finally{writing.current=false;}
  },onSuccess:(value,body)=>{
    acceptView(value);
    if(["phase-next","finish-contest","problem-help","start"].includes(body.action.type))setSelected(value.run?.timing?.currentBlock??value.run?.currentBlock??"leetcode");
  },onError:error=>{
    if(error instanceof ProgramRequestError&&[400,403,404,422].includes(error.status)){
      removeLocal(storageKey);setPending(false);setPendingMessage("");
    }else setPendingMessage(error instanceof ProgramRequestError&&error.status===409?"The phase or active problem changed in another tab. Review the saved session before retrying or discarding this action.":"The server has not acknowledged this action. Retry with the same saved event after reconnecting; do not repeat it in another tab.");
    toast.error(error.message);void query.refetch();
  }});
  async function retryPending(){
    const raw=readLocal(storageKey);if(!raw||!online||writing.current)return;
    writing.current=true;
    try{
      const body=JSON.parse(raw) as SavedAction;
      if(!Number.isInteger(body.programDay)||typeof body.eventId!=="string")throw new Error("The saved action is malformed. Discard it; your written drafts remain available.");
      // First retry the original event unchanged. The server recognizes an action
      // that succeeded just before its response was lost.
      await mutation.mutateAsync(body);
    }catch(error){setPendingMessage((error as Error).message);}finally{writing.current=false;}
  }
  async function save(action:ProgramAction){
    if(!data)return;
    if(offline){toast.error("Reconnect and refresh the saved session before changing it. Your written drafts remain here.");return;}
    if(writing.current||pending||readLocal(storageKey)){toast.error("Resolve the saved action before sending another.");return;}
    const current=timing?.currentBlock,phase=current?timing?.phases[current]:undefined;
    writing.current=true;
    try{await mutation.mutateAsync({eventId:crypto.randomUUID(),programId:data.program.programId,programDay:data.day.programDay,revision:data.run?.revision??0,action,context:{block:current??null,key:phase?.activeKey,status:phase?.status}});}finally{writing.current=false;}
  }
  async function checkVerdicts(source:"cf"|"lc",manual=false){
    if(!data?.run||offline||writing.current||pending||readLocal(storageKey)||syncing.current)return;
    syncing.current=true;setChecking(true);setLastCheckAttempt(Date.now());
    try{
      const result=await request("/api/program/action",{eventId:crypto.randomUUID(),programId:data.program.programId,programDay:data.day.programDay,revision:data.run.revision,action:{type:"sync",source}});
      acceptView(result);
      if(manual)toast.success(source==="cf"?"Codeforces check finished":"LeetCode check finished");
    }catch(error){
      // Sync does not enter the learner's outbox. A slower verdict request must
      // never block Pause or Next, nor overwrite a newer manual transition.
      if(manual&&(!(error instanceof ProgramRequestError)||error.status!==409))toast.error((error as Error).message);
      void query.refetch();
    }finally{syncing.current=false;setChecking(false);}
  }
  useEffect(()=>{
    if(!data?.run||!timing?.currentBlock||offline||pending||checking)return;
    const source=timing.currentBlock==="leetcode"?"lc":"cf";
    const checked=source==="cf"?data.run.verification.cfCheckedAt:data.run.verification.lcCheckedAt;
    const sinceChecked=checked===undefined?Infinity:Date.now()+serverOffset-checked;
    const sinceAttempt=Date.now()-lastCheckAttempt;
    const timer=setTimeout(()=>void checkVerdicts(source),Math.max(1000,30000-Math.min(sinceChecked,sinceAttempt)));
    return()=>clearTimeout(timer);
  // The current revision anchors each background check; manual writes cancel it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[data?.run?.revision,data?.run?.verification.cfCheckedAt,data?.run?.verification.lcCheckedAt,timing?.currentBlock,offline,pending,checking,lastCheckAttempt,serverOffset]);

  if(!handle)return <PageShell><PageHeader title="Your training session"/><HandlePrompt/></PageShell>;
  if(!data)return <PageShell><PageHeader title="Your training session"/><Card><p className="text-muted">{query.isError?(query.error as Error).message:"Loading the published program…"}</p><div className="mt-4 flex gap-3"><Button onClick={()=>void query.refetch()}>Retry</Button><Button asChild><Link href="/coach/legacy">Previous program history</Link></Button></div></Card></PageShell>;
  const current=timing?.currentBlock??undefined;
  const active=selected??current??(data.run?"leetcode":"contest");
  const busy=mutation.isPending||pending||offline;
  return <PageShell>
    <PageHeader title={`${data.day.label??`Day ${data.day.programDay}`} · ${data.day.focus}`} description={`${data.day.date} · program day ${data.day.programDay} · ${data.program.title}`} actions={<Button size="sm" disabled={query.isFetching} onClick={()=>void query.refetch()}><RefreshCw/>Refresh</Button>}/>
    <div className="mb-4 flex flex-wrap items-center gap-2"><Badge variant="accent">Python / PyPy</Badge><Badge>{data.totalMinutes} minutes of planned work</Badge><Badge variant="outline">Plan v{data.program.planVersion}</Badge>{data.program.goals.map(g=><Badge key={g.day} variant="outline">{g.rating} by {g.date}</Badge>)}</div>
    <div className="mb-5 grid gap-2 sm:grid-cols-4">{data.blocks.map((b,i)=>{
      const phase=timing?.phases[b.id],unlocked=Boolean(phase&&(phase.startedAt!==undefined||phase.status!=="ready"||current===b.id));
      return <button key={b.id} onClick={()=>setSelected(b.id)} aria-pressed={b.id===active} className={cn("rounded-xl border p-4 text-left",b.id===active?"border-accent bg-accent-soft":"border-line bg-surface")}><SectionLabel>Stage {i+1} · {phase?.status==="completed"?"complete":current===b.id?"current":unlocked?"available":"up next"}</SectionLabel><p className="mt-2 font-semibold text-ink">{b.label}</p><p className="text-sm text-muted">{b.minutes} min{phase&&phase.status!=="ready"?` · ${duration(Math.max(0,phase.budgetMs-phase.elapsedMs))} left`:""}</p></button>;
    })}</div>
    {!data.run?<Card className="mb-5"><CardTitle>Your prepared {data.totalMinutes}-minute session</CardTitle><p className="mt-2 text-sm text-muted">Start the contest when you are ready. Every phase has Start, Pause and Next controls. Finishing a timer pauses the practice budget and waits for your choice; phases never advance without your click.</p><p className="mt-2 text-sm text-muted">{data.day.contest.count} coach-selected problems. Tags, hints and explanations stay hidden during the contest. Pauses and extra guided work can extend the finish time beyond your {data.totalMinutes} minutes of planned work.</p><p className="mt-3 text-sm text-warning">{data.startWindow.reason}</p><label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={preflight} onChange={e=>setPreflight(e.target.checked)}/>I confirm these diagnostic basics are previously learned: {data.program.diagnosticBasics.join(", ")}. If any are unknown, I will ask Mentor to adjust the set before starting. This is eligibility for diagnosis, not a mastery claim.</label><Button className="mt-4" variant="accent" disabled={busy||!preflight||!data.startWindow.canStart} onClick={()=>void save({type:"start",confirmedPrerequisites:true}).catch(()=>{})}><Play/>Start contest</Button></Card>:timing?<SessionControls data={data} timing={timing} save={save} busy={mutation.isPending||pending} offline={offline} draftScope={draftScope} onSelect={setSelected}/>:<Card className="mb-5"><p className="text-sm text-muted">Loading saved phase controls…</p></Card>}
    {pending&&<Card className="mb-4 border-warning/40"><p className="text-sm font-medium text-warning">An action on this device is waiting for server confirmation.</p>{pendingMessage&&<p className="mt-2 text-sm text-warning">{pendingMessage}</p>}<div className="mt-3 flex flex-wrap gap-2"><Button disabled={mutation.isPending||!online} onClick={()=>void retryPending()}>Retry saved action</Button><Button disabled={mutation.isPending} onClick={()=>{removeLocal(storageKey);setPending(false);setPendingMessage("");void query.refetch();}}>Discard pending action</Button></div><p className="mt-2 text-xs text-muted">Retry keeps the original event ID. Discard does not undo a server save, and your written drafts remain on this device. Refresh to see the last acknowledged state.</p></Card>}
    {offline&&<p className="mb-4 text-sm text-warning" role="status">{online?"The server is unavailable. Showing your last saved session.":"You are offline. Showing your last saved session."} Reconnect and refresh before changing a timer. Drafts remain editable.</p>}
    <ProgramAlerts data={data} timing={timing} account={handle} now={now}/>
    {data.run&&<div className="mb-5 flex flex-wrap gap-3"><Button disabled={busy||checking} onClick={()=>void checkVerdicts("cf",true)}><ShieldCheck/>{checking?"Checking verdicts…":"Check Codeforces verdicts"}</Button><Button disabled={busy||checking} onClick={()=>void checkVerdicts("lc",true)}>Check LeetCode accepts</Button><span className="self-center text-xs text-muted">Checks run every 30s while this session is open and connected. CF checked: {data.run.verification.cfCheckedAt?new Date(data.run.verification.cfCheckedAt).toLocaleTimeString():"not yet"} · Contest score {data.run.score}</span></div>}
    {data.run?.verification.cfError&&<p className="mb-4 text-warning">{data.run.verification.cfError}</p>}{data.run?.verification.lcError&&<p className="mb-4 text-warning">{data.run.verification.lcError}</p>}
    {active!==current&&current&&<p className="mb-4 text-sm text-muted">Viewing {data.blocks.find(b=>b.id===active)?.label.toLowerCase()}. The current phase is {data.blocks.find(b=>b.id===current)?.label.toLowerCase()}; selecting a tab does not move its timer.</p>}
    {active==="contest"&&<ProblemList problems={data.day.contest.problems} block="contest" data={data} timing={timing} save={save} busy={busy} current={current} draftScope={draftScope}/>}
    {active==="review"&&<><Review data={data} save={save} busy={busy} draftScope={draftScope}/><ProblemList problems={data.day.review.problems} block="review" data={data} timing={timing} save={save} busy={busy} current={current} draftScope={draftScope}/></>}
    {active==="core"&&<><Lesson data={data} save={save} busy={busy} draftScope={draftScope}/><ProblemList problems={data.day.core.problems} block="core" data={data} timing={timing} save={save} busy={busy} current={current} draftScope={draftScope}/></>}
    {active==="leetcode"&&<ProblemList problems={data.day.leetcode.problems} block="leetcode" data={data} timing={timing} save={save} busy={busy} current={current} draftScope={draftScope}/>}
    <details className="mt-6 rounded-xl border border-line p-5"><summary className="cursor-pointer font-medium text-ink">Topic map and longer roadmap</summary><p className="mt-3 text-sm text-muted">Scheduled work and saved notes do not imply mastery. The agent reviews learning evidence after the day; an API accept alone does not establish independence.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{data.program.topics.map(t=><div key={t.id} className="rounded-lg bg-sunken p-3 text-sm"><span>{t.name}</span><Badge className="ml-2" variant="outline">{t.status}</Badge></div>)}</div><ol className="mt-4 space-y-2 text-sm text-muted">{data.program.curriculum.map(c=><li key={c.programDay??c.day}>Day {c.programDay??c.day} · {c.date} · {c.focus}</li>)}</ol></details>
    <div className="mt-6 flex flex-wrap gap-4 text-sm"><Link className="text-accent" href="/coach/legacy">Previous program history</Link><a className="text-accent" href="/api/program/export" target="_blank" rel="noreferrer"><Download className="mr-1 inline size-4"/>Export saved evidence</a><a className="text-accent" href="http://127.0.0.1:8765/" target="_blank" rel="noreferrer">Open Mentor on this Mac</a></div>
    <p className="mt-3 text-xs text-faint">Program {data.program.programId} · plan v{data.program.planVersion}. Official rated rounds are separate from this session.</p>
  </PageShell>;
}
function ProblemList({problems,block,data,timing,save,busy,current,draftScope}:{problems:(SafeProblem|null)[];block:BlockId;data:ProgramView;timing:ProgramTiming|null;save:Save;busy:boolean;current?:BlockId;draftScope:string}){
  if(!problems.length)return <Card><p className="text-sm text-muted">{block==="core"&&data.day.core.lesson?"This core block is reserved for the lesson and optional notes above; there are no additional full problems.":"This phase’s content opens when you reach it with Next."}</p></Card>;
  return <div className="space-y-4">{problems.filter((p):p is SafeProblem=>Boolean(p)).map((p,i)=><Problem key={`${block}:${p.key}`} p={p} index={i} block={block} data={data} timing={timing} save={save} busy={busy} current={current} draftScope={draftScope}/>)}</div>;
}
function Problem({p,index,block,data,timing,save,busy,current,draftScope}:{p:SafeProblem;index:number;block:BlockId;data:ProgramView;timing:ProgramTiming|null;save:Save;busy:boolean;current?:BlockId;draftScope:string}){
  const a=data.run?.attempts[`${block}:${p.key}`],prefix=`${draftScope}.${block}.${p.key}`;
  const legacy=`st.program.${data.program.programId}.${data.day.programDay}.${block}.${p.key}`;
  const [technique,setTechnique]=useDraft(`${prefix}.technique`,a?.technique==="Not recorded"?"":a?.technique??"",`${legacy}.technique`),[note,setNote]=useDraft(`${prefix}.note`,a?.note??"",`${legacy}.note`);
  const phase=timing?.phases[block],timer=phase?.problems.find(x=>x.key===p.key),isCurrent=current===block,active=phase?.activeKey===p.key;
  const optional=block==="review"&&(timer?.optional||(!a&&data.run?.attempts[`contest:${p.key}`]?.verification==="verified"));
  const closed=timer?.status==="completed"||timer?.status==="incomplete";
  const guided=timer?.status==="guided";
  const canStart=isCurrent&&!closed&&timer?.status!=="expired"&&phase?.status!=="expired";
  const invoke=(action:ProgramAction)=>{void save(action).catch(()=>{});};
  const cap=timer?.capMs??p.capMinutes*60000;
  const label=a?.verification==="verified"?"AC verified":optional&&!a?"Accepted in contest":a?.reported?`${a.reported} · self-reported`:timer?.status==="running"?"On the clock":a?"Attempt saved":"Not started";
  return <Card className={cn(active&&isCurrent&&"border-accent/40")}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><SectionLabel>Problem {index+1}{optional?" · optional review":""}</SectionLabel><CardTitle className="mt-2">{p.slot?`${p.slot}. `:""}{p.name}</CardTitle><p className="mt-1 text-sm text-muted">{Math.round(cap/6000)/10}m allocated{p.rating?` · rating ${p.rating}`:""}{timer?` · ${duration(timer.elapsedMs)} used`:""}</p></div><div className="space-y-2 text-right"><Badge variant={a?.verification==="verified"||optional?"positive":"neutral"}>{label}</Badge>{timer&&<p className="font-mono text-sm tabular-nums text-muted">{guided?`${duration(timer.guidedElapsedMs)} guided`:closed?"Attempt closed":`${duration(cap-timer.elapsedMs)} left`}</p>}</div></div>
    {optional&&<p className="mt-3 text-sm text-positive">Already accepted in the contest. Use review for reflection or a deliberate re-solve; you can proceed to the next phase without solving this again.</p>}
    {a?.solvedAt&&<p className="mt-2 text-sm text-positive">Accepted {stamp(a.solvedAt)} · {a.wrongAttempts??0} wrong verdicts{a.hintsUsed||a.solutionSeen||a.helpStartedAt?" · aided":" · assistance not recorded"}</p>}
    <a className="mt-4 inline-flex items-center gap-2 text-accent" href={p.url} target="_blank" rel="noreferrer">Read problem <ArrowRight className="size-4"/></a>
    {canStart&&!(guided&&timer?.guidedSince!==undefined)&&<div className="mt-4 space-y-3"><TextField label="Intended technique and why it applies (optional before starting)" value={technique} onChange={setTechnique}/><Button disabled={busy} onClick={()=>invoke({type:"problem-start",block,key:p.key,technique})}><Play/>{active&&timer?.status==="running"?"Record technique":optional&&!a?"Start optional re-solve":timer?.status==="paused"?"Resume this problem":guided?"Resume guided timer":"Start this problem"}</Button></div>}
    {a&&<div className="mt-4 space-y-3"><TextField label="What happened, assistance used, and what to retry" value={note} onChange={setNote}/><p className="text-xs text-faint">Text is saved on this device as you type. Complete the attempt or save its outcome to add it to your history.</p>
      {isCurrent&&active&&!closed&&timer?.status!=="expired"&&phase?.status!=="expired"?<div className="flex flex-wrap gap-2"><Button variant="accent" disabled={busy} onClick={()=>invoke({type:"problem-complete",block,key:p.key,reported:guided?"aided":"solved",note})}><Check/>{guided?"Finish guided work & next problem":"Mark complete & next problem"}</Button><Button disabled={busy} onClick={()=>invoke({type:"report",block,key:p.key,reported:"incomplete",note})}><SkipForward/>Save incomplete &amp; move on</Button></div>:<div className="flex flex-wrap gap-2">{(["incomplete","solved","aided"] as const).map(reported=><Button key={reported} size="sm" disabled={busy||(isCurrent&&!closed)} onClick={()=>invoke({type:"report",block,key:p.key,reported,note})}>{reported==="solved"?"Save solved report":`Save ${reported} report`}</Button>)}</div>}
      <p className="text-xs text-muted">A completion report does not create a judge acceptance. The next queued problem starts only after this attempt is completed or skipped.</p>
    </div>}
    {isCurrent&&!closed&&<div className="mt-4 space-y-2">{!guided&&<><Button size="sm" disabled={busy} onClick={()=>invoke({type:"problem-help",block,key:p.key})}>{block==="contest"?"End contest & continue with help":"Continue with help · pauses practice"}</Button>{block==="contest"&&<p className="text-xs text-warning">This permanently ends the contest and opens guided review. It preserves your contest score and records later work as assisted review.</p>}</>}</div>}
    {block!=="contest"&&a&&<div className="mt-4 space-y-3">{p.hints?.map((h,i)=><div className="rounded-xl border border-warning/30 p-3" key={i}><p className="font-medium">Hint {i+1}: {h.ask}</p>{h.say&&<p className="mt-2 text-sm text-muted">{h.say}</p>}{h.figure&&<FigureView spec={h.figure}/>}</div>)}{isCurrent&&!closed&&<div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy||(a.hintsUsed>=p.hintCount)} onClick={()=>invoke({type:"hint",block:block as "review"|"core"|"leetcode",key:p.key})}>Open next hint ({a.hintsUsed}/{p.hintCount})</Button><Button size="sm" disabled={busy||a.solutionSeen} onClick={()=>invoke({type:"hint",block:block as "review"|"core"|"leetcode",key:p.key,solution:true})}>Open explanation · records assistance</Button></div>}{p.solution&&<div className="rounded-xl bg-sunken p-4"><p className="whitespace-pre-wrap text-sm">{p.solution.say}</p>{p.solution.figure&&<FigureView spec={p.solution.figure}/>}</div>}</div>}
  </Card>;
}
function Review({data,save,busy,draftScope}:{data:ProgramView;save:Save;busy:boolean;draftScope:string}){
  const prefix=`${draftScope}.review`,legacy=`st.program.${data.program.programId}.${data.day.programDay}.review`;
  const [cause,setCause]=useDraft(`${prefix}.cause`,data.run?.review?.rootCause??"observation",`${legacy}.cause`),[note,setNote]=useDraft(`${prefix}.note`,data.run?.review?.note??"",`${legacy}.note`),[upsolve,setUpsolve]=useDraft(`${prefix}.upsolve`,data.run?.review?.upsolveKey??"",`${legacy}.upsolve`);
  if(!data.run||data.run.timing?.phases.contest.status!=="completed")return <Card><p>Review unlocks when the contest ends.</p></Card>;
  return <Card className="mb-4"><CardTitle>Find the most useful lesson from the round</CardTitle><p className="mt-2 text-sm text-muted">{data.day.review.prompt}</p><div className="mt-4 space-y-4"><label className="block text-sm">Main cause<select className={field} value={cause} onChange={e=>setCause(e.target.value)}>{["prerequisite","observation","proof","implementation","complexity","reading","time","clean"].map(c=><option key={c}>{c}</option>)}</select></label><label className="block text-sm">Reachable upsolve<select className={field} value={upsolve} onChange={e=>setUpsolve(e.target.value)}><option value="">None — use recall or proof repair</option>{data.day.review.problems.map(p=>p&&<option key={p.key} value={p.key}>{p.name}</option>)}</select></label><TextField label="What failed, why, and the change for the next attempt" value={note} onChange={setNote}/><Button disabled={busy} onClick={()=>void save({type:"review",rootCause:cause,note,upsolveKey:upsolve}).catch(()=>{})}>Save review</Button>{data.run.review&&<p className="text-sm text-positive">{data.run.review.note===note&&data.run.review.rootCause===cause&&data.run.review.upsolveKey===upsolve?"Review saved to your program history. Use Next above when you are ready.":"Your changes are a local draft. Save review to update your program history."}</p>}</div></Card>;
}
function Lesson({data,save,busy,draftScope}:{data:ProgramView;save:Save;busy:boolean;draftScope:string}){
  const lesson=data.day.core.lesson;
  if(!lesson)return <Card className="mb-4"><p className="text-sm text-muted">The lesson opens when you reach the core phase with Next.</p></Card>;
  return <LessonContent key={`${data.program.programId}:${data.day.programDay}`} lesson={lesson} data={data} save={save} busy={busy} draftScope={draftScope}/>;
}
function LessonContent({lesson,data,save,busy,draftScope}:{lesson:NonNullable<ProgramView["day"]["core"]["lesson"]>;data:ProgramView;save:Save;busy:boolean;draftScope:string}){
  const prefix=`${draftScope}.lesson`,legacy=`st.program.${data.program.programId}.${data.day.programDay}.lesson`;
  const canSaveRecall=data.run?.timing?.phases.review.status==="completed";
  const [teachBack,setTeachBack]=useDraft(`${prefix}.teach`,data.run?.lessonEvidence?.teachBack??"",`${legacy}.teach`),[code,setCode]=useDraft(`${prefix}.code`,data.run?.lessonEvidence?.primitiveCode??"",`${legacy}.code`);
  const [answers,setAnswers]=useState<string[]>(data.run?.lessonEvidence?.answers??lesson.check.map(()=>""));
  useEffect(()=>{const saved=readLocal(`${prefix}.answers`)??readLocal(`${legacy}.answers`);if(saved){
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { const parsed:unknown=JSON.parse(saved);if(Array.isArray(parsed)&&parsed.every(v=>typeof v==="string"))setAnswers(parsed); } catch { /* Keep the server copy when a local draft is malformed. */ }
  }},[prefix,legacy]);
  const updateAnswer=(i:number,v:string)=>{const next=[...answers];next[i]=v;setAnswers(next);writeLocal(`${prefix}.answers`,JSON.stringify(next));};
  return <div className="mb-5 space-y-4"><Card><CardTitle><BookOpen className="mr-2 inline size-5"/>{lesson.title}</CardTitle><p className="mt-2 text-sm text-muted">{lesson.why}</p><p className="mt-2 text-xs text-faint">Teaching is part of the {data.blocks.find(b=>b.id==="core")?.minutes}-minute core block · planned {lesson.minutes}m</p><ul className="mt-3 list-inside list-disc text-sm">{lesson.outcomes.map(x=><li key={x}>{x}</li>)}</ul></Card>
    {lesson.steps.map((s,i)=><Card key={i}><CardTitle>{i+1}. {s.title}</CardTitle><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{s.body}</p>{s.figure&&<FigureView spec={s.figure}/>} {s.code&&<pre className="mt-3 overflow-auto rounded-lg bg-sunken p-4 text-xs">{s.code}</pre>}</Card>)}
    {lesson.resources.map(r=><Card key={r.url}><a className="font-medium text-accent" href={r.url} target="_blank" rel="noreferrer">{r.title} · {r.segment} · {r.minutes}m</a><p className="mt-2 text-sm">{r.watchFor}</p></Card>)}
    <Card>
      <CardTitle>Optional learning notes</CardTitle>
      <p className="mt-2 text-sm text-muted">Save any thoughts, answers or code you want the agent to review after you finish the day or at your next check-in. You can leave every field blank and start practice. Nothing here is automatically graded.</p>
      <p className="mt-3 text-sm text-muted">Optional prompt: {lesson.drill.prompt}</p>
      <div className="mt-4 space-y-4">
        <TextField label="Your explanation or thoughts (optional)" value={teachBack} onChange={setTeachBack}/>
        {lesson.check.map((q,i)=><TextField key={i} label={`${i+1}. ${q.q} (optional)`} value={answers[i]??""} onChange={v=>updateAnswer(i,v)}/>)}
        <TextField label="Python code or scratch work (optional)" value={code} onChange={setCode} code/>
        <Button disabled={busy||!canSaveRecall} onClick={()=>void save({type:"lesson",teachBack,answers,primitiveCode:code}).catch(()=>{})}>Save notes</Button>
        {data.run?.lessonEvidence&&<p className="text-sm text-muted">{teachBack===data.run.lessonEvidence.teachBack&&code===data.run.lessonEvidence.primitiveCode&&JSON.stringify(answers)===JSON.stringify(data.run.lessonEvidence.answers)?"Notes saved for later agent review. You can continue practicing.":"You have local changes. Save notes to include them in the agent’s later review."}</p>}
      </div>
    </Card>
  </div>;
}
