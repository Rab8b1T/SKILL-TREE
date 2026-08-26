import { NextRequest } from "next/server";
import { errorResponse, json, sessionHandle } from "@/lib/auth";
import { readContestRound } from "@/lib/contest-store";
import { HttpError } from "@/lib/mongo";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> },
) {
  try {
    const { auth } = await sessionHandle(req);
    const { roundId } = await params;
    const round = await readContestRound(auth.userId, decodeURIComponent(roundId));
    if (!round) throw new HttpError(404, "Contest round not found");
    return json(round);
  } catch (error) {
    return errorResponse(error, "Could not load the contest round");
  }
}
