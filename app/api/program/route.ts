import { NextRequest } from "next/server";
import { errorResponse,json,sessionHandle } from "@/lib/auth";
import { getProgramView } from "@/lib/program-server";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){try{const {auth,handle}=await sessionHandle(req);const day=req.nextUrl.searchParams.get("day");return json(await getProgramView(auth.userId,handle,day?Number(day):undefined));}catch(e){return errorResponse(e,"Could not load the program");}}
