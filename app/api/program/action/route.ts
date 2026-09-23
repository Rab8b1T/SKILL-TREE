import { NextRequest } from "next/server";
import { errorResponse,json,sessionHandle } from "@/lib/auth";
import { mutateProgram } from "@/lib/program-server";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){try{const {auth,handle}=await sessionHandle(req);return json(await mutateProgram(auth.userId,handle,await req.json()));}catch(e){return errorResponse(e,"Could not save this action");}}
