import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, hashPassword, json, usersCollection } from "@/lib/auth";

const Body = z.object({
  token: z.string().trim().min(32),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
    }
    const { token, newPassword } = parsed.data;

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const users = await usersCollection();
    const user = await users.findOne({ resetTokenHash: tokenHash });

    if (!user || !user.resetExpiresAt || user.resetExpiresAt < Date.now()) {
      return json({ error: "That reset link is invalid or has expired" }, 400);
    }

    await users.updateOne(
      { _id: user._id as never },
      {
        $set: { passwordHash: hashPassword(newPassword) },
        // Single-use: the token dies with the reset it authorised.
        $unset: { resetTokenHash: "", resetExpiresAt: "" },
      },
    );

    return json({ ok: true });
  } catch (err) {
    return errorResponse(err, "Could not reset the password");
  }
}
