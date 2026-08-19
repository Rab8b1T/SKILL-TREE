import { NextRequest } from "next/server";
import { errorResponse, json } from "@/lib/auth";
import { getUserInfo, getUserRating, getUserStatus } from "@/lib/cf-server";
import { analyseSubmissions } from "@/lib/cf";
import { HttpError } from "@/lib/mongo";
import type { CfProfile } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const handle = req.nextUrl.searchParams.get("handle")?.trim();
    if (!handle) throw new HttpError(400, "handle is required");

    // Sequential rather than parallel: three simultaneous calls reliably trip
    // the Codeforces rate limiter and come back as 403 HTML.
    const user = await getUserInfo(handle);
    const ratingHistory = await getUserRating(handle);
    const submissions = await getUserStatus(handle);

    const stats = analyseSubmissions(submissions);

    const payload: CfProfile = {
      handle: user.handle,
      user,
      ratingHistory,
      // The raw list is only needed for recent-verdict panels; trim the tail
      // so a 5,000-submission account doesn't ship megabytes to the browser.
      submissions: submissions
        .slice()
        .sort((a, b) => b.creationTimeSeconds - a.creationTimeSeconds)
        .slice(0, 200),
      stats,
      fetchedAt: Date.now(),
    };
    return json(payload);
  } catch (err) {
    return errorResponse(err, "Could not load the Codeforces profile");
  }
}
