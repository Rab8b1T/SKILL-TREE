import { NextRequest } from "next/server";
import { errorResponse, json, sessionHandle } from "@/lib/auth";
import { listContestRounds } from "@/lib/contest-store";
import { HttpError } from "@/lib/mongo";
import type { ContestSection, ContestSource } from "@/lib/types";

const SECTIONS = new Set<ContestSection>(["standard", "first-time-trials"]);
const SOURCES = new Set<ContestSource>(["virtual", "coach", "legacy"]);

export async function GET(req: NextRequest) {
  try {
    const { auth } = await sessionHandle(req);
    const sectionValue = req.nextUrl.searchParams.get("section");
    const sourceValue = req.nextUrl.searchParams.get("source");
    if (sectionValue && !SECTIONS.has(sectionValue as ContestSection)) {
      throw new HttpError(400, "Invalid contest section");
    }
    if (sourceValue && !SOURCES.has(sourceValue as ContestSource)) {
      throw new HttpError(400, "Invalid contest source");
    }
    return json(
      await listContestRounds(auth.userId, {
        section: (sectionValue as ContestSection | null) ?? undefined,
        source: (sourceValue as ContestSource | null) ?? undefined,
        cursor: req.nextUrl.searchParams.get("cursor"),
        limit: Number(req.nextUrl.searchParams.get("limit") ?? 20),
      }),
    );
  } catch (error) {
    return errorResponse(error, "Could not load contest history");
  }
}
