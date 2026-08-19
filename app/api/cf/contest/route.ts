import { NextRequest } from "next/server";
import { errorResponse, json, requireAuth } from "@/lib/auth";
import { getProblemset, getUserStatus } from "@/lib/cf-server";
import { problemKey } from "@/lib/cf";
import { DIVISIONS, pointsForIndex } from "@/lib/contest";
import { HttpError } from "@/lib/mongo";
import type { ContestDivision, ContestProblemRef } from "@/lib/types";

/**
 * Builds a virtual round: one unsolved problem per index slot, inside that
 * slot's rating window, drawn from different contests so the set doesn't turn
 * into one real round in disguise.
 */
export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const body = (await req.json().catch(() => null)) as {
      division?: ContestDivision;
      handle?: string;
      slots?: number;
      tags?: string[];
    } | null;

    const division = body?.division ?? "div3";
    if (division === "custom") {
      throw new HttpError(400, "Custom rounds are assembled from the picker");
    }
    const config = DIVISIONS[division];
    if (!config) throw new HttpError(400, `Unknown division: ${division}`);

    const slotCount = Math.min(
      config.slots.length,
      Math.max(1, body?.slots ?? config.slots.length),
    );
    const slots = config.slots.slice(0, slotCount);

    const { problems, problemStatistics } = await getProblemset();
    const solved = body?.handle ? await solvedSet(body.handle) : new Set<string>();

    const solvedCountBy = new Map<string, number>();
    for (const s of problemStatistics) {
      solvedCountBy.set(`${s.contestId}-${s.index}`, s.solvedCount);
    }

    const usedContests = new Set<number>();
    const picked: ContestProblemRef[] = [];
    const wanted = body?.tags?.length ? body.tags : config.tags;

    for (const slot of slots) {
      const candidates = problems.filter((p) => {
        if (!p.contestId || !p.rating) return false;
        if (p.rating < slot.rating[0] || p.rating > slot.rating[1]) return false;
        const key = problemKey(p);
        if (solved.has(key)) return false;
        if ((solvedCountBy.get(key) ?? 0) < 100) return false;
        if (usedContests.has(p.contestId)) return false;
        return true;
      });

      // Prefer problems carrying a tag the division actually tests, but fall
      // back rather than leaving a slot empty.
      const onTopic = candidates.filter((p) =>
        p.tags.some((t) => wanted.includes(t)),
      );
      const pool = onTopic.length >= 3 ? onTopic : candidates;
      if (!pool.length) continue;

      const chosen = pool[Math.floor(Math.random() * pool.length)];
      usedContests.add(chosen.contestId!);
      picked.push({
        contestId: chosen.contestId!,
        // The problem keeps its own index; the slot is recorded separately.
        // Substituting the slot letter here points every link and every verdict
        // lookup at a different problem in the same contest.
        index: chosen.index,
        slot: slot.index,
        name: chosen.name,
        rating: chosen.rating,
        tags: chosen.tags,
        points: pointsForIndex(slot.index),
      });
    }

    if (picked.length < 2) {
      throw new HttpError(
        409,
        "Not enough unsolved problems in these bands — try a different division",
      );
    }

    return json({
      division,
      name: `${config.name} virtual`,
      durationSeconds: config.minutes * 60,
      problems: picked,
    });
  } catch (err) {
    return errorResponse(err, "Could not assemble a contest");
  }
}

async function solvedSet(handle: string): Promise<Set<string>> {
  try {
    const subs = await getUserStatus(handle);
    const set = new Set<string>();
    for (const s of subs) if (s.verdict === "OK") set.add(problemKey(s.problem));
    return set;
  } catch {
    return new Set();
  }
}
