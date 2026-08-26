import { NextRequest } from "next/server";
import { errorResponse, json, sessionHandle } from "@/lib/auth";
import {
  readContestActive,
  replaceContestActive,
} from "@/lib/contest-store";
import { HttpError } from "@/lib/mongo";
import type { VirtualContest } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { auth } = await sessionHandle(req);
    return json(await readContestActive(auth.userId));
  } catch (error) {
    return errorResponse(error, "Could not load the active contest");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { auth } = await sessionHandle(req);
    const body = (await req.json().catch(() => null)) as {
      version?: number;
      contest?: VirtualContest;
    } | null;
    if (!body?.contest || !Number.isInteger(body.version)) {
      throw new HttpError(400, "version and contest are required");
    }
    return json(
      await replaceContestActive(auth.userId, body.version!, body.contest),
    );
  } catch (error) {
    return errorResponse(error, "Could not save the active contest");
  }
}
