import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient,QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ProgramMorning } from "../components/program/morning";
const qc=new QueryClient();
async function qa(action:string,body:unknown={}){
  await fetch(`/qa/${action}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  await qc.invalidateQueries({queryKey:["program"]});
}
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={qc}>
  <aside style={{padding:12,background:"#37260c",display:"flex",gap:16,flexWrap:"wrap"}}>
    <strong>QA ONLY · fictional records</strong>
    <button onClick={()=>void qa("advance",{seconds:31})}>QA: advance 31 seconds</button>
    <button onClick={()=>void qa("advance",{seconds:121})}>QA: advance 121 seconds</button>
    <button onClick={()=>void qa("accept")}>QA: accept active CF problem</button>
    <button onClick={()=>void qa("legacy-review")}>QA: load completed legacy review</button>
    <button onClick={()=>void qa("connection")}>QA: toggle connection outage</button>
    <button onClick={()=>void qa("drop-response")}>QA: lose next action response</button>
    <button onClick={()=>void qa("reset")}>QA: restart fixture</button>
  </aside>
  <ProgramMorning/><Toaster richColors/>
</QueryClientProvider>);
