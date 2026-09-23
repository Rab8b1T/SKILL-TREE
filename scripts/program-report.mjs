#!/usr/bin/env node
// Read-only export for Mentor. Never prints credentials or modifies collections.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { MongoClient } from "mongodb";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const args=process.argv.slice(2);
const value=(name,fallback)=>{const i=args.indexOf(name);return i>=0?args[i+1]:fallback;};
const programId=value("--program","expert-2026-09-23");
let text="";
for(const file of [".env.local",".env"]){try{text=await readFile(path.join(root,file),"utf8");break;}catch(e){if(e.code!=="ENOENT")throw e;}}
const env=(key)=>process.env[key]??text.match(new RegExp(`^${key}=(.*)$`,"m"))?.[1]?.trim().replace(/^["']|["']$/g,"");
const uri=env("MONGODB_URI");
if(!uri){console.error("MONGODB_URI is not configured; no export was produced.");process.exit(1);}
const client=new MongoClient(uri,{serverSelectionTimeoutMS:10000});
try{
 await client.connect();const db=client.db(env("DB_NAME")??"skilltree");
 const query={programId};const owner=value("--owner",null);if(owner)query.ownerId=owner;
 const rows=await db.collection("program_sessions").find(query).sort({"run.programDay":1}).toArray();
 if(new Set(rows.map(x=>x.ownerId)).size>1)throw new Error("More than one owner found; pass --owner to select one account.");
 const sessions=rows.map(({run})=>{const {snapshot,topics,processed,...evidence}=run;void topics;void processed;const safe=p=>{const{hints,reveal,...rest}=p;void hints;void reveal;return rest;};return{...evidence,problemMetadata:{contest:snapshot.contest.problems.map(safe),core:snapshot.core.practice.blocks.flatMap(x=>x.problems).map(safe),leetcode:snapshot.leetcode.problems.map(safe)}};});
 const topicEvidence=rows.flatMap(({run})=>run.lessonEvidence?[{eventId:`${run.sessionId}:lesson:${run.lessonEvidence.submittedAt}`,sessionId:run.sessionId,programId,topicIds:run.lessonEvidence.topicIds,kind:run.lessonEvidence.recallPassed?"taught":"pending_assessment",at:run.lessonEvidence.submittedAt,source:"saved teach-back, recall answers and primitive; keyword recall check only",...run.lessonEvidence}]:[]);
 console.log(JSON.stringify({schemaVersion:1,programId,exportedAt:new Date().toISOString(),sessions,topicEvidence},null,2));
}catch{console.error("Program evidence export failed. Check MongoDB connectivity and the selected owner; no records were changed.");process.exitCode=1;}finally{await client.close();}
