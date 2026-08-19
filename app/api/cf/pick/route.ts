import { NextRequest } from "next/server";
import { errorResponse, json } from "@/lib/auth";
import { getProblemset, getUserStatus } from "@/lib/cf-server";
import { problemKey } from "@/lib/cf";
import { HttpError } from "@/lib/mongo";

/**
 * Picks unsolved problems inside a rating band. Solved problems are excluded
 * from the user's own submission history rather than a stored list, so the
 * picker can never hand back something already accepted.
 *
 * `minSolvedCount` filters out broken or freshly-added outliers: a problem
 * nobody has solved is usually a statement bug, not a challenge.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const handle = sp.get("handle")?.trim();
    const min = Number(sp.get("min") ?? 800);
    const max = Number(sp.get("max") ?? 1200);
    const count = Math.min(50, Math.max(1, Number(sp.get("count") ?? 7)));
    const tags = (sp.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const minSolvedCount = Number(sp.get("minSolvedCount") ?? 200);
    const requireAllTags = sp.get("matchAll") === "1";

    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      throw new HttpError(400, "Invalid rating band");
    }

    const [{ problems, problemStatistics }, solvedKeys] = await Promise.all([
      getProblemset(requireAllTags ? tags : undefined),
      handle ? solvedSet(handle) : Promise.resolve(new Set<string>()),
    ]);

    const solvedCountBy = new Map<string, number>();
    for (const s of problemStatistics) {
      solvedCountBy.set(`${s.contestId}-${s.index}`, s.solvedCount);
    }

    const pool = problems.filter((p) => {
      if (!p.rating || p.rating < min || p.rating > max) return false;
      const key = problemKey(p);
      if (solvedKeys.has(key)) return false;
      if ((solvedCountBy.get(key) ?? 0) < minSolvedCount) return false;
      if (tags.length && !requireAllTags) {
        if (!p.tags.some((t) => tags.includes(t))) return false;
      }
      return true;
    });

    // Fisher-Yates on a copy; slicing a sort by Math.random is biased.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const picked = pool.slice(0, count).map((p) => ({
      contestId: p.contestId,
      index: p.index,
      name: p.name,
      rating: p.rating ?? 0,
      tags: p.tags,
      solvedCount: solvedCountBy.get(problemKey(p)) ?? 0,
    }));

    return json({ problems: picked, poolSize: pool.length });
  } catch (err) {
    return errorResponse(err, "Could not pick problems");
  }
}

async function solvedSet(handle: string): Promise<Set<string>> {
  try {
    const subs = await getUserStatus(handle);
    const set = new Set<string>();
    for (const s of subs) {
      if (s.verdict === "OK") set.add(problemKey(s.problem));
    }
    return set;
  } catch {
    // A picker that still works without the exclusion list beats a 502.
    return new Set();
  }
}
