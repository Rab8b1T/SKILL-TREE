import { NextRequest } from "next/server";
import { errorResponse, json, sessionHandle } from "@/lib/auth";
import { getUserStatusSince } from "@/lib/cf-server";
import { problemKey } from "@/lib/cf";
import { countsAsWrongSubmission } from "@/lib/contest";
import { HttpError } from "@/lib/mongo";

/**
 * Reads real Codeforces verdicts for the problems in a running virtual, so the
 * scoreboard reflects actual submissions instead of self-reported clicks.
 *
 * Only submissions made after `since` count — otherwise an accept from months
 * ago would mark the problem solved the instant the contest started.
 */
export async function GET(req: NextRequest) {
  try {
    const { handle } = await sessionHandle(req);
    if (!handle) throw new HttpError(400, "Set a Codeforces handle first");
    const sp = req.nextUrl.searchParams;
    const since = Number(sp.get("since") ?? 0);
    const keys = (sp.get("keys") ?? "").split(",").filter(Boolean);
    const mode = sp.get("mode") === "icpc" ? "icpc" : "cf";

    if (!Number.isFinite(since) || since <= 0) {
      throw new HttpError(400, "A valid contest start time is required");
    }
    if (keys.length > 20 || keys.some((key) => !/^\d+-[A-Za-z]\d*$/.test(key))) {
      throw new HttpError(400, "Invalid problem keys");
    }
    if (!keys.length) return json({ results: {} });

    const wanted = new Set(keys);
    // Recent submissions only; a running contest can't have thousands.
    const subs = await getUserStatusSince(handle, since);

    const results: Record<
      string,
      {
        solved: boolean;
        wrongAttempts: number;
        solvedAtSeconds?: number;
        solvedAtTimeSeconds?: number;
      }
    > = {};
    for (const key of keys) results[key] = { solved: false, wrongAttempts: 0 };

    const ordered = subs
      .filter((s) => s.creationTimeSeconds >= since)
      .sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds);

    for (const sub of ordered) {
      const key = problemKey(sub.problem);
      if (!wanted.has(key)) continue;
      const entry = results[key];
      if (entry.solved) continue;

      if (sub.verdict === "OK") {
        entry.solved = true;
        entry.solvedAtSeconds = sub.creationTimeSeconds - since;
        entry.solvedAtTimeSeconds = sub.creationTimeSeconds;
      } else if (
        countsAsWrongSubmission(mode, sub.verdict, sub.passedTestCount)
      ) {
        entry.wrongAttempts += 1;
      }
    }

    return json({ results });
  } catch (err) {
    return errorResponse(err, "Could not read verdicts");
  }
}
