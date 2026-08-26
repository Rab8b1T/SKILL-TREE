import { NextRequest } from "next/server";
import { errorResponse, json, sessionHandle } from "@/lib/auth";
import { buildContestEvaluation } from "@/lib/contest-eval";
import {
  readAllContestRounds,
  readContestProgram,
} from "@/lib/contest-store";
import { getAppDb, HttpError } from "@/lib/mongo";
import type { UpsolveEntry } from "@/lib/types";

function validateTimezone(value: string | null): string {
  if (!value) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return value;
  } catch {
    throw new HttpError(400, "Invalid timezone");
  }
}

export async function GET(req: NextRequest) {
  try {
    const { auth, handle } = await sessionHandle(req);
    if (!handle) throw new HttpError(400, "Set a Codeforces handle first");
    const timezone = validateTimezone(req.nextUrl.searchParams.get("timezone"));
    const [rounds, program, upsolveDoc] = await Promise.all([
      readAllContestRounds(auth.userId),
      readContestProgram(auth.userId),
      (await getAppDb())
        .collection("upsolve_data")
        .findOne(
          { _id: handle as never },
          { projection: { entries: 1 } },
        ),
    ]);
    return json(
      buildContestEvaluation({
        rounds,
        program,
        upsolve:
          (upsolveDoc?.entries as UpsolveEntry[] | undefined) ?? [],
        timezone,
      }),
    );
  } catch (error) {
    return errorResponse(error, "Could not evaluate contest progress");
  }
}
