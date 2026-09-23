import { NextRequest } from "next/server";
import { errorResponse,json,sessionHandle } from "@/lib/auth";
import { assertProgramHandle,loadProgram,programExport } from "@/lib/program-server";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){try{const {auth,handle}=await sessionHandle(req);const p=await loadProgram();assertProgramHandle(p,handle);return json(await programExport(auth.userId,p.programId));}catch(e){return errorResponse(e,"Could not export program evidence");}}
