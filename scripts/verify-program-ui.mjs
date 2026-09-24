/** Isolated browser rehearsal. No credentials, MongoDB or judge APIs are used.
 * Run: node --import tsx scripts/verify-program-ui.mjs
 * The real coaching UI talks to a fictional in-memory program on 127.0.0.1:8877.
 */
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { fixture } from "../lib/testing/program-fixture.ts";
import { actionSchema, applyAction, createRun, publicProgram, reconcileCf } from "../lib/program.ts";

const root=resolve(import.meta.dirname,"..");
const NOW=Date.now();
let offset=NOW-Date.now(),run=null,submissions=[],unavailable=false,dropNextResponse=false;
const plan=fixture(),day=plan.days[0];
plan.title="Isolated QA — fictional training session";
plan.startDate=day.date=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(NOW);
day.focus="Manual timers, pause and recovery rehearsal";
day.scheduleOverride={mode:"from-start",authorizedAt:new Date(NOW).toISOString(),reason:"Isolated UI test",totalMinutes:8};
day.contest.minutes=2;day.review.minutes=2;day.core.minutes=2;day.leetcode.minutes=2;
day.core.lesson.minutes=1;day.core.practice.blocks[0].minutes=1;
for(const p of day.contest.problems)p.capMinutes=1;
for(const p of day.core.practice.blocks[0].problems)p.capMinutes=1;
for(const p of day.leetcode.problems)p.capMinutes=1;
const now=()=>Date.now()+offset;
const view=()=>publicProgram(plan,run,day,now());
const compiled=await build({
  entryPoints:[resolve(root,"scripts/verify-program-ui.tsx")],bundle:true,write:false,
  platform:"browser",format:"iife",jsx:"automatic",tsconfig:resolve(root,"tsconfig.json"),
  define:{"process.env.NODE_ENV":'"development"'},
  plugins:[{name:"qa-link",setup(b){
    b.onResolve({filter:/^next\/link$/},()=>({path:"link",namespace:"qa"}));
    b.onLoad({filter:/.*/,namespace:"qa"},()=>({contents:'import React from "react"; export default function Link({children,...props}){return React.createElement("a",props,children)}',loader:"jsx",resolveDir:root}));
  }}],
});
const bundle=compiled.outputFiles[0].text;
const cssFiles=(await readdir(resolve(root,".next/static/chunks")).catch(()=>[])).filter(n=>n.endsWith(".css"));
const css=(await Promise.all(cssFiles.map(n=>readFile(resolve(root,".next/static/chunks",n),"utf8")))).join("\n");
createServer(async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  try{
    const url=new URL(req.url,"http://127.0.0.1:8877");
    const raw=[];for await(const chunk of req)raw.push(chunk);
    const body=raw.length?JSON.parse(Buffer.concat(raw).toString()):{};
    let result;
    if(unavailable&&url.pathname.startsWith("/api/")){res.statusCode=503;throw new Error("QA simulated connection outage");}
    if(url.pathname==="/bundle.js"){res.setHeader("Content-Type","text/javascript");res.end(bundle);return;}
    if(url.pathname==="/style.css"){res.setHeader("Content-Type","text/css");res.end(css);return;}
    if(url.pathname==="/api/auth/me")result={user:{id:"qa-fictional",username:"qa-fictional",cfHandle:"tester"}};
    else if(url.pathname==="/api/program")result=view();
    else if(url.pathname==="/api/program/action"){
      const action=actionSchema.parse(body.action);
      if(action.type==="start"){if(!run)run=createRun(plan,day,now());}
      else{
        if(!run)throw new Error("Start the QA session first");
        if(!run.processed.includes(body.eventId)&&body.revision!==run.revision){res.statusCode=409;throw new Error("The QA session changed in another tab. Refresh and retry.");}
        run=applyAction(run,action,body.eventId,now());
        if(action.type==="sync")run=reconcileCf(run,submissions,now());
      }
      if(dropNextResponse){dropNextResponse=false;res.statusCode=503;throw new Error("QA: response lost after the action was saved");}
      result=view();
    }else if(url.pathname==="/qa/advance"){offset+=Number(body.seconds)*1000;result=view();}
    else if(url.pathname==="/qa/connection"){unavailable=!unavailable;result={unavailable};}
    else if(url.pathname==="/qa/drop-response"){dropNextResponse=true;result={dropNextResponse};}
    else if(url.pathname==="/qa/accept"){
      if(!run)throw new Error("Start a problem first");
      const block=run.timing?.currentBlock??"contest";
      const key=run.timing?.phases[block]?.activeKey??"1-A";
      const [contestId,index]=key.split("-");
      submissions.push({id:100+submissions.length,creationTimeSeconds:Math.floor(now()/1000),verdict:"OK",problem:{contestId:Number(contestId),index,name:"QA",tags:[]},author:{},passedTestCount:2});
      offset+=1000;run=reconcileCf(run,submissions,now());result=view();
    }else if(url.pathname==="/qa/legacy-review"){
      offset=NOW+8*60000-Date.now();submissions=[];
      run=createRun(plan,day,NOW);delete run.timing;
      run.blocks={contest:{startedAt:NOW,endsAt:NOW+60000},review:{startedAt:NOW+60000,endsAt:NOW+180000},core:{startedAt:NOW+180000,endsAt:NOW+300000},leetcode:{startedAt:NOW+300000,endsAt:NOW+420000}};
      run.contestCompletion={finishedAt:NOW+60000,scheduledEndsAt:NOW+120000};
      run.review={rootCause:"clean",note:"Both problems accepted without assistance.",upsolveKey:"",submittedAt:NOW+70000};
      for(const p of day.contest.problems)run.attempts[`contest:${p.key}`]={key:p.key,block:"contest",startedAt:NOW,technique:"QA retained approach",hintsUsed:0,solutionSeen:false,verification:"verified",solvedAt:NOW+30000,submissions:[{id:p.contestId,at:NOW+30000,verdict:"OK"}]};
      run.events=[{id:"qa-legacy-review",type:"review",at:NOW+70000}];result=view();
    }else if(url.pathname==="/qa/reset"){offset=NOW-Date.now();run=null;submissions=[];result=view();}
    else{res.setHeader("Content-Type","text/html");res.end('<!doctype html><html class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Session QA — fictional data</title><link rel="stylesheet" href="/style.css"></head><body style="background:#101010;color:#eee;font-family:system-ui"><div id="root"></div><script src="/bundle.js"></script></body></html>');return;}
    res.setHeader("Content-Type","application/json");res.end(JSON.stringify(result));
  }catch(e){if(res.statusCode===200)res.statusCode=400;res.setHeader("Content-Type","application/json");res.end(JSON.stringify({error:e.message}));}
}).listen(8877,"127.0.0.1",()=>process.stdout.write("Isolated UI rehearsal: http://127.0.0.1:8877 — fictional records only\n"));
