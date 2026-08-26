import { NextRequest } from "next/server";
import { errorResponse, json, sessionHandle } from "@/lib/auth";
import { buildVirtualArchive } from "@/lib/contest-server";
import {
  archiveContestRound,
  readContestActive,
  readContestProgram,
  readContestRound,
} from "@/lib/contest-store";
import { HttpError } from "@/lib/mongo";

export async function POST(req: NextRequest) {
  try {
    const { auth, handle } = await sessionHandle(req);
    if (!handle) throw new HttpError(400, "Set a Codeforces handle first");
    const body = (await req.json().catch(() => null)) as {
      version?: number;
      roundId?: string;
    } | null;
    if (!body?.roundId || !Number.isInteger(body.version)) {
      throw new HttpError(400, "version and roundId are required");
    }

    const active = await readContestActive(auth.userId);
    if (!active.contest) {
      const existing = await readContestRound(auth.userId, body.roundId);
      if (existing) {
        return json({
          round: existing,
          program: await readContestProgram(auth.userId),
        });
      }
      throw new HttpError(404, "No active contest to archive");
    }
    if (active.version !== body.version || active.contest.id !== body.roundId) {
      throw new HttpError(409, "Contest changed in another tab; reload first");
    }

    const built = await buildVirtualArchive(active.contest, handle);
    const archived = await archiveContestRound({
      userId: auth.userId,
      handle,
      round: built.round,
      upsolve: built.upsolve,
      clearActiveRoundId: active.contest.id,
      clearActiveVersion: active.version,
    });
    return json(archived, 201);
  } catch (error) {
    return errorResponse(error, "Could not archive the contest");
  }
}
