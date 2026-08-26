import { NextRequest } from "next/server";
import { errorResponse, json, sessionHandle } from "@/lib/auth";
import { readContestProgram } from "@/lib/contest-store";

export async function GET(req: NextRequest) {
  try {
    const { auth } = await sessionHandle(req);
    return json(await readContestProgram(auth.userId));
  } catch (error) {
    return errorResponse(error, "Could not load contest progress");
  }
}
