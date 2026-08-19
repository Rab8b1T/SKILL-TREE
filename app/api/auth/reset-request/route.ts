import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, json, usersCollection } from "@/lib/auth";
import { resetEmailHtml, sendEmail } from "@/lib/email";

const Body = z.object({ username: z.string().trim().min(1) });

const TTL_MS = 60 * 60 * 1000;

/** Same reply whether or not the account exists, so this can't enumerate users. */
const NEUTRAL = {
  ok: true,
  message: "If that account has an email on file, a reset link is on its way.",
};

export async function POST(req: NextRequest) {
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Username is required" }, 400);

    const username = parsed.data.username.toLowerCase();
    const users = await usersCollection();
    const user = await users.findOne({ username });

    if (!user?.email) return json(NEUTRAL);

    // The database stores only a hash. The old implementation saved the raw
    // token, which meant a database leak handed over live reset links.
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await users.updateOne(
      { username },
      { $set: { resetTokenHash: tokenHash, resetExpiresAt: Date.now() + TTL_MS } },
    );

    const origin =
      process.env.APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
    const link = `${origin}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "Skill Tree — reset your password",
      html: resetEmailHtml(user.displayName || user.username, link),
    });

    return json(NEUTRAL);
  } catch (err) {
    return errorResponse(err, "Could not start the reset");
  }
}
