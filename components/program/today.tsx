"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/queries";
import type { ProgramView } from "@/lib/program";
import { Card,CardTitle,SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
export function TodayProgram(){
 const session=useSession();const handle=session.data?.user?.cfHandle;
 const query=useQuery({queryKey:["program",handle,null],queryFn:async()=>{const r=await fetch("/api/program",{cache:"no-store"});if(!r.ok)throw new Error("Program not available");return r.json() as Promise<ProgramView>;},enabled:!!handle,refetchOnWindowFocus:true});
 return <Card className="mb-4 border-accent/40 bg-accent-soft"><SectionLabel>Your program · {query.data?.day.contest.minutes??120}-minute custom contest</SectionLabel><CardTitle className="mt-2">{query.data?`Day ${query.data.day.programDay} · ${query.data.day.focus}`:"Open the coach-authored morning"}</CardTitle><p className="mt-2 text-sm text-muted">{query.data?`${query.data.totalMinutes} minutes total: contest, review, learning and two LeetCode questions.`:"Your protected plan and actual results live together in Coach."}</p><Button asChild className="mt-4" variant="accent"><Link href="/coach">Open today’s contest <ArrowRight/></Link></Button></Card>;
}
