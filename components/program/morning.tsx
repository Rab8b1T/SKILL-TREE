"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation,useQuery,useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight,BookOpen,Download,RefreshCw,ShieldCheck } from "lucide-react";
import { type BlockId,type ProgramAction,type ProgramView } from "@/lib/program";
import { useSession } from "@/lib/queries";
import { PageHeader,PageShell } from "@/components/layout/page";
import { Card,CardTitle,SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FigureView } from "@/components/coach/figure";
import { HandlePrompt } from "@/components/handle-prompt";
import { cn } from "@/lib/utils";

class ProgramRequestError extends Error {
  constructor(message:string,readonly status:number){super(message);}
}
async function request(url:string,body?:unknown):Promise<ProgramView>{
  const r=await fetch(url,{method:body?"POST":"GET",cache:"no-store",headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});
  const data=await r.json();if(!r.ok)throw new ProgramRequestError(data.error??"Could not reach the server",r.status);return data;
}
function clock(seconds:number){const s=Math.max(0,Math.floor(seconds));return `${Math.floor(s/3600).toString().padStart(2,"0")}:${Math.floor(s/60%60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;}
function stamp(ms:number){return new Date(ms).toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit"});}
type Save=(action:ProgramAction)=>Promise<void>;
type SafeProblem=NonNullable<ProgramView["day"]["contest"]["problems"][number]>;

/** Draft text is durable even before a network save succeeds. */
function useDraft(key:string,fallback=""){
  const [text,setText]=useState(fallback);
  useEffect(()=>{
    const stored=localStorage.getItem(key);
    // Hydrate browser-only drafts after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(stored??fallback);
  },[key,fallback]);
  return [text,(v:string)=>{setText(v);localStorage.setItem(key,v);}] as const;
}
const field="w-full rounded-xl border border-line bg-sunken p-3 text-sm text-ink outline-none focus:border-accent";
function TextField({label,value,onChange,code=false}:{label:string;value:string;onChange:(v:string)=>void;code?:boolean}){
  return <label className="block space-y-2"><span className="text-sm font-medium text-ink">{label}</span><textarea className={cn(field,code&&"font-mono text-xs")} rows={code?7:3} value={value} onChange={e=>onChange(e.target.value)}/></label>;
}

export function ProgramMorning({initialBlock,initialDay}:{initialBlock?:BlockId;initialDay?:number}){
  const session=useSession(),handle=session.data?.user?.cfHandle;
  const qc=useQueryClient();
  const queryKey=["program",handle,initialDay??null];
  const query=useQuery({queryKey,queryFn:()=>request(initialDay?`/api/program?day=${initialDay}`:"/api/program"),enabled:!!handle,refetchInterval:15000,refetchOnWindowFocus:true,retry:1});
  const [selected,setSelected]=useState<BlockId|undefined>(initialBlock);
  const [preflight,setPreflight]=useState(false);
  const [now,setNow]=useState(0),[pending,setPending]=useState(false);
  const [pendingMessage,setPendingMessage]=useState("");
  useEffect(()=>{const offset=(query.data?.serverNow??Date.now())-Date.now();const update=()=>setNow(Date.now()+offset);update();const id=setInterval(update,1000);return()=>clearInterval(id);},[query.data?.serverNow]);
  const data=query.data;
  const storageKey=`st.program.outbox.${handle??""}`;
  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(Boolean(localStorage.getItem(storageKey)));
  },[storageKey]);
  const mutation=useMutation({mutationFn:async(body:unknown)=>{
    localStorage.setItem(storageKey,JSON.stringify(body));setPending(true);
    const result=await request("/api/program/action",body);
    localStorage.removeItem(storageKey);setPending(false);setPendingMessage("");return result;
  },onSuccess:(value,body)=>{
    if((body as {action?:ProgramAction}).action?.type==="finish-contest")setSelected(value.run?.currentBlock??"review");
    qc.setQueryData(["program",handle,value.day.programDay],value);
    if(initialDay===value.day.programDay||(!initialDay&&query.data?.day.programDay===value.day.programDay))qc.setQueryData(queryKey,value);
    else void query.refetch();
  },onError:e=>{
    if(e instanceof ProgramRequestError&&[400,403,404,422].includes(e.status)){
      // These responses rejected the action before a write. Keep the text draft,
      // but let the learner repair a prerequisite or incomplete form immediately.
      localStorage.removeItem(storageKey);setPending(false);setPendingMessage("");
    }else{
      setPendingMessage(e instanceof ProgramRequestError&&e.status===409?"Another save or a program change caused a conflict. Review your draft, then retry against the latest saved session or discard this action.":"The server has not acknowledged this action. Retry safely with the same event ID after checking the saved session.");
    }
    toast.error(e.message);void query.refetch();
  }});
  async function retryPending(){
    const raw=localStorage.getItem(storageKey);if(!raw)return;
    try{
      const body=JSON.parse(raw);
      if(!Number.isInteger(body.programDay)||typeof body.eventId!=="string")throw new Error("The saved action is malformed. Discard it; your written drafts remain available.");
      const fresh=await request(`/api/program?day=${body.programDay}`);
      if(fresh.program.programId!==body.programId)throw new Error("This action belongs to a previous program. Discard it and review your draft before saving again.");
      body.revision=fresh.run?.revision??0;
      await mutation.mutateAsync(body);
    }catch(e){setPendingMessage((e as Error).message);}
  }
  async function save(action:ProgramAction){
    if(!data)return;
    if(pending){toast.error("Retry the saved action before sending another.");return;}
    await mutation.mutateAsync({eventId:crypto.randomUUID(),programId:data.program.programId,programDay:data.day.programDay,revision:data.run?.revision??0,action});
  }
  if(!handle)return <PageShell><PageHeader title="Your morning"/><HandlePrompt/></PageShell>;
  if(!data)return <PageShell><PageHeader title="Your morning"/><Card><p className="text-muted">{query.isError?(query.error as Error).message:"Loading the published program…"}</p><div className="mt-4 flex gap-3"><Button onClick={()=>void query.refetch()}>Retry</Button><Button asChild><Link href="/coach/legacy">Previous program history</Link></Button></div></Card></PageShell>;
  const current=data.run?data.blocks.find(b=>now>=data.run!.blocks[b.id].startedAt&&now<data.run!.blocks[b.id].endsAt)?.id:undefined;
  const active=selected??current??"contest";
  const end=data.run?.blocks[active].endsAt;
  const block=data.blocks.find(b=>b.id===active)!;
  return <PageShell>
    <PageHeader title={`Day ${data.day.programDay} · ${data.day.focus}`} description={`${data.day.date} · ${data.program.title}`} actions={<Button size="sm" onClick={()=>void query.refetch()}><RefreshCw/>Refresh</Button>}/>
    <div className="mb-4 flex flex-wrap items-center gap-2"><Badge variant="accent">Python / PyPy</Badge><Badge>{data.startWindow.fromStart?`Today: ${data.totalMinutes} minutes from Start`:"04:30–10:30 IST"}</Badge><Badge variant="outline">Plan v{data.program.planVersion}</Badge>{data.program.goals.map(g=><Badge key={g.day} variant="outline">{g.rating} by {g.date}</Badge>)}</div>
    <div className="mb-5 grid gap-2 sm:grid-cols-4">{data.blocks.map((b)=><button key={b.id} onClick={()=>setSelected(b.id)} className={cn("rounded-xl border p-4 text-left",b.id===active?"border-accent bg-accent-soft":"border-line bg-surface")}><SectionLabel>{data.run?`${stamp(data.run.blocks[b.id].startedAt)}–${stamp(data.run.blocks[b.id].endsAt)}`:data.startWindow.fromStart?`${b.offsetMinutes===0?"Start":`+${b.offsetMinutes}m`} → +${b.offsetMinutes+b.minutes}m`:`${b.starts}–${b.ends}`}</SectionLabel><p className="mt-2 font-semibold text-ink">{b.label}</p><p className="text-sm text-muted">{b.minutes} min{current===b.id?" · on the clock":""}</p></button>)}</div>
    {!data.run?<Card className="mb-5"><CardTitle>Your prepared {data.totalMinutes}-minute session</CardTitle><p className="mt-2 text-sm text-muted">{data.startWindow.fromStart?`Today’s ${data.totalMinutes}-minute session starts when you press Start. The ${data.day.contest.minutes}-minute contest is followed by review, core and LeetCode. The saved clock continues across reloads.`:"The contest runs for two hours without pauses. The next blocks follow automatically. The block times stay anchored to the morning. A late start uses the time remaining; it does not push learning into the afternoon."}</p><p className="mt-2 text-sm text-muted">{data.day.contest.count} coach-selected problems. Tags, hints and explanations stay on the server until the contest ends.</p><p className="mt-3 text-sm text-warning">{data.startWindow.reason}</p><label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={preflight} onChange={e=>setPreflight(e.target.checked)}/>I confirm these diagnostic basics are previously learned: {data.program.diagnosticBasics.join(", ")}. If any are unknown, I will ask Mentor to adjust the set before starting. This is eligibility for diagnosis, not a mastery claim.</label><Button className="mt-4" variant="accent" disabled={mutation.isPending||!preflight||!data.startWindow.canStart} onClick={()=>void save({type:"start",confirmedPrerequisites:true}).catch(()=>{})}>Start contest <ArrowRight/></Button></Card>:<Card className="mb-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><SectionLabel>{block.label}</SectionLabel><p className="mt-1 font-mono text-3xl text-ink">{end&&now<end?clock((end-now)/1000):"Block complete"}</p></div><p className="text-sm text-muted">Actual window: {stamp(data.run.blocks[active].startedAt)}–{stamp(data.run.blocks[active].endsAt)} IST<br/>Started {data.run.actualDate} · saved on server</p></div></Card>}
    {data.run&&active==="contest"&&<Card className="mb-5">
      <CardTitle>{current==="contest"?"Finished your contest?":"Contest complete"}</CardTitle>
      <p className="mt-2 text-sm text-muted">{data.day.contest.problems.filter(p=>p&&data.run?.attempts[`contest:${p.key}`]?.verification==="verified").length}/{data.day.contest.count} problems verified accepted. Completion records the end of your attempt; it does not mark unfinished problems solved.</p>
      {current==="contest"?<>
        <p className="mt-2 text-sm text-muted">End the contest now and begin review. The remaining blocks move earlier with their full time budgets. This ends the contest permanently; later submissions count as upsolves.</p>
        <Button className="mt-4" variant="accent" disabled={mutation.isPending||pending} onClick={()=>void save({type:"finish-contest"}).catch(()=>{})}>Finish contest &amp; start review <ArrowRight/></Button>
      </>:<Button className="mt-4" variant="accent" onClick={()=>setSelected(current??"review")}>Continue to {data.blocks.find(b=>b.id===(current??"review"))?.label.toLowerCase()} <ArrowRight/></Button>}
    </Card>}
    {pending&&<Card className="mb-4 border-warning/40"><p className="text-sm text-warning">An action is saved on this device but has not been acknowledged by the server.</p>{pendingMessage&&<p className="mt-2 text-sm text-warning">{pendingMessage}</p>}<Button className="mt-3" disabled={mutation.isPending} onClick={()=>void retryPending()}>Retry saved action</Button><Button className="ml-2 mt-3" disabled={mutation.isPending} onClick={()=>{localStorage.removeItem(storageKey);setPending(false);setPendingMessage("");}}>Discard unsaved action</Button><p className="mt-2 text-xs text-muted">Your written drafts remain on this device if you discard the action.</p></Card>}
    {query.isError&&<p className="mb-4 text-sm text-warning">Refresh failed. Showing the last saved snapshot; local drafts remain available.</p>}
    {data.run&&<div className="mb-5 flex flex-wrap gap-3"><Button disabled={mutation.isPending} onClick={()=>void save({type:"sync",source:"cf"}).catch(()=>{})}><ShieldCheck/>Check Codeforces verdicts</Button><Button disabled={mutation.isPending} onClick={()=>void save({type:"sync",source:"lc"}).catch(()=>{})}>Check LeetCode accepts</Button><span className="self-center text-xs text-muted">CF checked: {data.run.verification.cfCheckedAt?new Date(data.run.verification.cfCheckedAt).toLocaleString():"not yet"} · Contest score {data.run.score}</span></div>}
    {data.run?.verification.cfError&&<p className="mb-4 text-warning">{data.run.verification.cfError}</p>}{data.run?.verification.lcError&&<p className="mb-4 text-warning">{data.run.verification.lcError}</p>}
    {active==="contest"&&<ProblemList problems={data.day.contest.problems} block="contest" data={data} save={save} busy={mutation.isPending||pending} current={current}/>}
    {active==="review"&&<><Review data={data} save={save} busy={mutation.isPending||pending}/><ProblemList problems={data.day.review.problems} block="review" data={data} save={save} busy={mutation.isPending||pending} current={current}/></>}
    {active==="core"&&<><Lesson data={data} save={save} busy={mutation.isPending||pending}/><ProblemList problems={data.day.core.problems} block="core" data={data} save={save} busy={mutation.isPending||pending} current={current}/></>}
    {active==="leetcode"&&<ProblemList problems={data.day.leetcode.problems} block="leetcode" data={data} save={save} busy={mutation.isPending||pending} current={current}/>}
    <details className="mt-6 rounded-xl border border-line p-5"><summary className="cursor-pointer font-medium text-ink">Topic map and longer roadmap</summary><p className="mt-3 text-sm text-muted">Scheduled work does not imply mastery. Lesson checks record recall evidence; an API accept alone does not establish independence.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{data.program.topics.map(t=><div key={t.id} className="rounded-lg bg-sunken p-3 text-sm"><span>{t.name}</span><Badge className="ml-2" variant="outline">{t.status}</Badge></div>)}</div><ol className="mt-4 space-y-2 text-sm text-muted">{data.program.curriculum.map(c=><li key={c.programDay??c.day}>Day {c.programDay??c.day} · {c.date} · {c.focus}</li>)}</ol></details>
    <div className="mt-6 flex flex-wrap gap-4 text-sm"><Link className="text-accent" href="/coach/legacy">Previous program history</Link><a className="text-accent" href="/api/program/export" target="_blank" rel="noreferrer"><Download className="mr-1 inline size-4"/>Export saved evidence</a><a className="text-accent" href="http://127.0.0.1:8765/" target="_blank" rel="noreferrer">Open Mentor on this Mac</a></div>
    <p className="mt-3 text-xs text-faint">Program {data.program.programId} · plan v{data.program.planVersion}. Official rated rounds are separate from this morning.</p>
  </PageShell>;
}
function ProblemList({problems,block,data,save,busy,current}:{problems:(SafeProblem|null)[];block:BlockId;data:ProgramView;save:Save;busy:boolean;current?:BlockId}){
  if(!problems.length)return <Card><p className="text-sm text-muted">This block’s content unlocks when its time begins.</p></Card>;
  return <div className="space-y-4">{problems.filter((p):p is SafeProblem=>Boolean(p)).map(p=><Problem key={`${block}:${p.key}`} p={p} block={block} data={data} save={save} busy={busy} current={current}/>)}</div>;
}
function Problem({p,block,data,save,busy,current}:{p:SafeProblem;block:BlockId;data:ProgramView;save:Save;busy:boolean;current?:BlockId}){
  const a=data.run?.attempts[`${block}:${p.key}`],prefix=`st.program.${data.program.programId}.${data.day.programDay}.${block}.${p.key}`;
  const [technique,setTechnique]=useDraft(`${prefix}.technique`,a?.technique??""),[note,setNote]=useDraft(`${prefix}.note`,a?.note??"");
  return <Card><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{p.slot?`${p.slot}. `:""}{p.name}</CardTitle><p className="mt-1 text-sm text-muted">{p.capMinutes}m attempt cap{p.rating?` · ${p.rating}`:""}</p></div><Badge variant={a?.verification==="verified"?"positive":"neutral"}>{a?.verification==="verified"?"AC verified":a?.reported?`${a.reported} · self-reported`:a?"attempt started":"not started"}</Badge></div>
    {a?.solvedAt&&<p className="mt-2 text-sm text-positive">Accepted {stamp(a.solvedAt)} · {a.wrongAttempts??0} wrong verdicts{a.hintsUsed||a.solutionSeen?" · aided":" · assistance not recorded"}</p>}
    <a className="mt-4 inline-flex items-center gap-2 text-accent" href={p.url} target="_blank" rel="noreferrer">Read problem <ArrowRight className="size-4"/></a>
    {!a?<div className="mt-4 space-y-3"><TextField label="Intended technique and the condition that makes it work" value={technique} onChange={setTechnique}/><Button disabled={busy||current!==block||!technique.trim()} onClick={()=>void save({type:"attempt",block,key:p.key,technique}).catch(()=>{})}>Start attempt</Button></div>:<div className="mt-4 space-y-3"><p className="text-sm text-muted">You chose: {a.technique}</p><TextField label="What happened, assistance used, and what to retry" value={note} onChange={setNote}/><div className="flex flex-wrap gap-2">{(["incomplete","solved","aided"] as const).map(reported=><Button key={reported} size="sm" disabled={busy} onClick={()=>void save({type:"report",block,key:p.key,reported,note}).catch(()=>{})}>{reported==="solved"?"Report solved (awaits AC check)":`Record ${reported}`}</Button>)}</div></div>}
    {block!=="contest"&&a&&<div className="mt-4 space-y-3">{p.hints?.map((h,i)=><div className="rounded-xl border border-warning/30 p-3" key={i}><p className="font-medium">Hint {i+1}: {h.ask}</p>{h.say&&<p className="mt-2 text-sm text-muted">{h.say}</p>}{h.figure&&<FigureView spec={h.figure}/>}</div>)}<div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy||(a.hintsUsed>=p.hintCount)} onClick={()=>void save({type:"hint",block: block as "review"|"core"|"leetcode",key:p.key}).catch(()=>{})}>Open next hint ({a.hintsUsed}/{p.hintCount})</Button><Button size="sm" disabled={busy||a.solutionSeen} onClick={()=>void save({type:"hint",block:block as "review"|"core"|"leetcode",key:p.key,solution:true}).catch(()=>{})}>Open explanation · records assistance</Button></div>{p.solution&&<div className="rounded-xl bg-sunken p-4"><p className="whitespace-pre-wrap text-sm">{p.solution.say}</p>{p.solution.figure&&<FigureView spec={p.solution.figure}/>}</div>}</div>}
  </Card>;
}
function Review({data,save,busy}:{data:ProgramView;save:Save;busy:boolean}){
  const prefix=`st.program.${data.program.programId}.${data.day.programDay}.review`;
  const [cause,setCause]=useDraft(`${prefix}.cause`,data.run?.review?.rootCause??"observation"),[note,setNote]=useDraft(`${prefix}.note`,data.run?.review?.note??""),[upsolve,setUpsolve]=useDraft(`${prefix}.upsolve`,data.run?.review?.upsolveKey??"");
  if(!data.run||data.serverNow<data.run.blocks.review.startedAt)return <Card><p>Review unlocks when the contest ends.</p></Card>;
  return <Card className="mb-4"><CardTitle>Find the most useful lesson from the round</CardTitle><p className="mt-2 text-sm text-muted">{data.day.review.prompt}</p><div className="mt-4 space-y-4"><label className="block text-sm">Main cause<select className={field} value={cause} onChange={e=>setCause(e.target.value)}>{["prerequisite","observation","proof","implementation","complexity","reading","time","clean"].map(c=><option key={c}>{c}</option>)}</select></label><label className="block text-sm">Reachable upsolve<select className={field} value={upsolve} onChange={e=>setUpsolve(e.target.value)}><option value="">None — use recall or proof repair</option>{data.day.review.problems.map(p=>p&&<option key={p.key} value={p.key}>{p.name}</option>)}</select></label><TextField label="What failed, why, and the change for the next attempt" value={note} onChange={setNote}/><Button disabled={busy} onClick={()=>void save({type:"review",rootCause:cause,note,upsolveKey:upsolve}).catch(()=>{})}>Save review</Button>{data.run.review&&<p className="text-sm text-positive">Review saved to your program history.</p>}</div></Card>;
}
function Lesson({data,save,busy}:{data:ProgramView;save:Save;busy:boolean}){
  const lesson=data.day.core.lesson;
  if(!lesson)return <Card className="mb-4"><p className="text-sm text-muted">The lesson opens inside the two-hour core block.</p></Card>;
  return <LessonContent key={`${data.program.programId}:${data.day.programDay}`} lesson={lesson} data={data} save={save} busy={busy}/>;
}
function LessonContent({lesson,data,save,busy}:{lesson:NonNullable<ProgramView["day"]["core"]["lesson"]>;data:ProgramView;save:Save;busy:boolean}){
  const prefix=`st.program.${data.program.programId}.${data.day.programDay}.lesson`;
  const [teachBack,setTeachBack]=useDraft(`${prefix}.teach`,data.run?.lessonEvidence?.teachBack??""),[code,setCode]=useDraft(`${prefix}.code`,data.run?.lessonEvidence?.primitiveCode??"");
  const [answers,setAnswers]=useState<string[]>(data.run?.lessonEvidence?.answers??lesson.check.map(()=>""));
  useEffect(()=>{const saved=localStorage.getItem(`${prefix}.answers`);if(saved){
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { const parsed:unknown=JSON.parse(saved);if(Array.isArray(parsed)&&parsed.every(v=>typeof v==="string"))setAnswers(parsed); } catch { /* Keep the server copy when a local draft is malformed. */ }
  }},[prefix]);
  const updateAnswer=(i:number,v:string)=>{const next=[...answers];next[i]=v;setAnswers(next);localStorage.setItem(`${prefix}.answers`,JSON.stringify(next));};
  return <div className="mb-5 space-y-4"><Card><CardTitle><BookOpen className="mr-2 inline size-5"/>{lesson.title}</CardTitle><p className="mt-2 text-sm text-muted">{lesson.why}</p><p className="mt-2 text-xs text-faint">Teaching is part of the {data.blocks.find(b=>b.id==="core")?.minutes}-minute core block · planned {lesson.minutes}m</p><ul className="mt-3 list-inside list-disc text-sm">{lesson.outcomes.map(x=><li key={x}>{x}</li>)}</ul></Card>
    {lesson.steps.map((s,i)=><Card key={i}><CardTitle>{i+1}. {s.title}</CardTitle><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{s.body}</p>{s.figure&&<FigureView spec={s.figure}/>} {s.code&&<pre className="mt-3 overflow-auto rounded-lg bg-sunken p-4 text-xs">{s.code}</pre>}</Card>)}
    {lesson.resources.map(r=><Card key={r.url}><a className="font-medium text-accent" href={r.url} target="_blank" rel="noreferrer">{r.title} · {r.segment} · {r.minutes}m</a><p className="mt-2 text-sm">{r.watchFor}</p></Card>)}
    <Card><CardTitle>Close the lesson and recall</CardTitle><p className="mt-2 text-sm text-muted">{lesson.drill.prompt}</p><div className="mt-4 space-y-4"><TextField label="Teach it back in your own words" value={teachBack} onChange={setTeachBack}/>{lesson.check.map((q,i)=><div key={i}><TextField label={`${i+1}. ${q.q}`} value={answers[i]??""} onChange={v=>updateAnswer(i,v)}/>{q.a&&<details className="mt-2 text-sm"><summary>Compare with the answer after your saved attempt</summary><p className="mt-2 text-muted">{q.a}</p></details>}</div>)}<TextField label="From-memory Python primitive" value={code} onChange={setCode} code/><Button disabled={busy} onClick={()=>void save({type:"lesson",teachBack,answers,primitiveCode:code}).catch(()=>{})}>Save recall evidence</Button>{data.run?.lessonEvidence&&<p className="text-sm text-muted">{data.run.lessonEvidence.recallPassed?"Recall criteria met. Evidence saved; this is not an independent-solve or mastery claim.":"Evidence saved. Recall needs repair or a coach assessment before new-topic practice unlocks."}</p>}</div></Card>
  </div>;
}
