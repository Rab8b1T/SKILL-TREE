import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createToken,
  errorResponse,
  hashPassword,
  json,
  setSessionCookie,
  usersCollection,
} from "@/lib/auth";

const Body = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Letters, numbers, dot, dash and underscore only"),
  email: z.string().trim().email().optional().or(z.literal("")),
  // Raised from the old 4-character floor, which was trivially brute-forceable.
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  cfHandle: z.string().trim().max(64).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
    }
    const { username, email, password, cfHandle } = parsed.data;

    const users = await usersCollection();
    await users.createIndex({ username: 1 }, { unique: true });

    const doc = {
      username: username.toLowerCase(),
      displayName: username,
      passwordHash: hashPassword(password),
      email: email ? email.toLowerCase() : null,
      cfHandle: cfHandle || undefined,
      createdAt: new Date().toISOString(),
    };

    let insertedId: unknown;
    try {
      const result = await users.insertOne(doc as never);
      insertedId = result.insertedId;
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        return json({ error: "That username is taken" }, 409);
      }
      throw err;
    }

    const userId = String(insertedId);
    const token = createToken({ userId, username: doc.username });
    const res = json(
      {
        user: {
          id: userId,
          username: doc.displayName,
          email: doc.email,
          cfHandle: doc.cfHandle ?? null,
        },
        token,
      },
      201,
    );
    return setSessionCookie(res, token);
  } catch (err) {
    return errorResponse(err, "Could not create the account");
  }
}
