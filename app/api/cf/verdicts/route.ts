import { NextRequest } from "next/server";
import { errorResponse, json, requireAuth } from "@/lib/auth";
import { getUserStatus } from "@/lib/cf-server";
import { problemKey } from "@/lib/cf";
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
    requireAuth(req);
    const sp = req.nextUrl.searchParams;
    const handle = sp.get("handle")?.trim();
    const since = Number(sp.get("since") ?? 0);
    const keys = (sp.get("keys") ?? "").split(",").filter(Boolean);

    if (!handle) throw new HttpError(400, "handle is required");
    if (!keys.length) return json({ results: {} });

    const wanted = new Set(keys);
    // Recent submissions only; a running contest can't have thousands.
    const subs = await getUserStatus(handle, 200);

    const results: Record<
      string,
      { solved: boolean; wrongAttempts: number; solvedAtSeconds?: number }
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
      } else if (sub.verdict && sub.verdict !== "TESTING") {
        // Compile errors carry no penalty on Codeforces either.
        if (sub.verdict !== "COMPILATION_ERROR") entry.wrongAttempts += 1;
      }
    }

    return json({ results });
  } catch (err) {
    return errorResponse(err, "Could not read verdicts");
  }
}
