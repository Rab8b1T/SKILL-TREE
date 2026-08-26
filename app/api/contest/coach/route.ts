import { NextRequest } from "next/server";
import planJson from "@/public/data/coach/plan.json";
import { errorResponse, json, sessionHandle } from "@/lib/auth";
import { buildCoachArchive } from "@/lib/coach-archive";
import { archiveContestRound } from "@/lib/contest-store";
import { runId, type CoachPlan, type RunDoc } from "@/lib/coach";
import { parseCoachPlan } from "@/lib/coach-plan";
import { HttpError } from "@/lib/mongo";

const plan: CoachPlan = parseCoachPlan(planJson);

export async function POST(req: NextRequest) {
  try {
    const { auth, handle } = await sessionHandle(req);
    if (!handle) throw new HttpError(400, "Set a Codeforces handle first");
    const body = (await req.json().catch(() => null)) as {
      day?: number;
      run?: RunDoc;
    } | null;
    if (!Number.isInteger(body?.day) || !body?.run) {
      throw new HttpError(400, "day and finished run are required");
    }
    const day = plan.days.find((item) => item.day === body.day);
    if (!day?.contest) throw new HttpError(404, "Coach contest not found");
    if (
      body.run.id !== runId("contest", day.day) ||
      body.run.kind !== "contest" ||
      body.run.day !== day.day ||
      !body.run.finishedAt ||
      body.run.startedAt > body.run.finishedAt
    ) {
      throw new HttpError(400, "Invalid coach contest run");
    }
    const built = buildCoachArchive(day, body.run, handle);
    return json(
      await archiveContestRound({
        userId: auth.userId,
        handle,
        round: built.round,
        upsolve: built.upsolve,
        arenaRun: body.run,
      }),
      201,
    );
  } catch (error) {
    return errorResponse(error, "Could not archive the coach contest");
  }
}
