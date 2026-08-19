import { NextRequest } from "next/server";
import { z } from "zod";
import {
  errorResponse,
  hashPassword,
  json,
  requireAuth,
  usersCollection,
  verifyPassword,
} from "@/lib/auth";
import { toObjectId } from "@/lib/mongo";

const Body = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(200),
});

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
    }
    const { currentPassword, newPassword } = parsed.data;

    const users = await usersCollection();
    const id = toObjectId(auth.userId);
    const user = await users.findOne({ _id: id as never });
    if (!user) return json({ error: "Account not found" }, 404);

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return json({ error: "Current password is incorrect" }, 401);
    }
    if (verifyPassword(newPassword, user.passwordHash)) {
      return json({ error: "That is already your password" }, 400);
    }

    await users.updateOne(
      { _id: id as never },
      { $set: { passwordHash: hashPassword(newPassword) } },
    );
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err, "Could not change the password");
  }
}
