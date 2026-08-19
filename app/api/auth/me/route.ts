import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authFromRequest,
  errorResponse,
  json,
  requireAuth,
  usersCollection,
} from "@/lib/auth";
import { toObjectId } from "@/lib/mongo";

export async function GET(req: NextRequest) {
  try {
    const auth = authFromRequest(req);
    if (!auth) return json({ user: null }, 200);

    const users = await usersCollection();
    const user = await users.findOne({ _id: toObjectId(auth.userId) as never });
    if (!user) return json({ user: null }, 200);

    return json({
      user: {
        id: String(user._id),
        username: user.displayName || user.username,
        email: user.email ?? null,
        cfHandle: user.cfHandle ?? null,
      },
    });
  } catch (err) {
    return errorResponse(err, "Could not load the session");
  }
}

const Patch = z.object({
  cfHandle: z.string().trim().max(64).nullable(),
});

/** Stores the Codeforces handle every other page keys its data off. */
export async function PATCH(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const parsed = Patch.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "cfHandle is required" }, 400);

    const handle = parsed.data.cfHandle?.trim() || null;
    const users = await usersCollection();
    await users.updateOne(
      { _id: toObjectId(auth.userId) as never },
      { $set: { cfHandle: handle ?? undefined } },
    );
    return json({ ok: true, cfHandle: handle });
  } catch (err) {
    return errorResponse(err, "Could not save the handle");
  }
}
