import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createToken,
  errorResponse,
  json,
  setSessionCookie,
  usersCollection,
  verifyPassword,
} from "@/lib/auth";

const Body = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: "Username and password are required" }, 400);
    }
    const { username, password } = parsed.data;

    const users = await usersCollection();
    const user = await users.findOne({ username: username.toLowerCase() });

    // One message for both branches so the response can't be used to test
    // whether a username exists.
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return json({ error: "Incorrect username or password" }, 401);
    }

    const userId = String(user._id);
    const token = createToken({ userId, username: user.username });
    const res = json({
      user: {
        id: userId,
        username: user.displayName || user.username,
        email: user.email ?? null,
        cfHandle: user.cfHandle ?? null,
      },
      token,
    });
    return setSessionCookie(res, token);
  } catch (err) {
    return errorResponse(err, "Login failed");
  }
}
