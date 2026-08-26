import { NextRequest } from "next/server";
import { errorResponse, json, sessionHandle } from "@/lib/auth";
import { DIVISIONS } from "@/lib/contest";
import { assembleVirtualContest } from "@/lib/contest-server";
import { createContestActive } from "@/lib/contest-store";
import { HttpError } from "@/lib/mongo";
import type { ContestDivision } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { auth, handle } = await sessionHandle(req);
    if (!handle) throw new HttpError(400, "Set a Codeforces handle first");
    const body = (await req.json().catch(() => null)) as {
      division?: ContestDivision;
      slots?: number;
      minutes?: number;
    } | null;
    const division = body?.division ?? "div3";
    if (division === "custom" || !(division in DIVISIONS)) {
      throw new HttpError(400, "Choose Div. 4, Div. 3, Div. 2 or Div. 1");
    }
    const contest = await assembleVirtualContest({
      userId: auth.userId,
      handle,
      division,
      slots: body?.slots,
      minutes: body?.minutes,
    });
    return json(await createContestActive(auth.userId, handle, contest), 201);
  } catch (error) {
    return errorResponse(error, "Could not start the contest");
  }
}
