import "server-only";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUsersDb, HttpError, toObjectId } from "./mongo";

/*
 * Password hashes and tokens are byte-for-byte compatible with the previous
 * Python implementation, so accounts created before this rewrite still log in:
 *   hash  = base64(salt) ":" base64(scrypt(pw, salt, N=16384, r=8, p=1, 64))
 *   token = base64url(header) "." base64url(body) "." base64url(HMAC-SHA256)
 * Do not "modernise" either format without a migration.
 */
const SALT_LEN = 16;
const KEY_LEN = 64;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Read at call time, not module load, so a missing secret surfaces as a 503 on
 * the request instead of silently accepting forgeable tokens. The old code
 * defaulted to "change-me-in-production", which meant a dropped env var turned
 * into an authentication bypass rather than an error.
 */
function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new HttpError(503, "JWT_SECRET is not configured");
  }
  return s;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LEN);
  const dk = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT);
  return `${salt.toString("base64")}:${dk.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [saltB64, hashB64] = stored.split(":", 2);
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, "base64");
    expected = Buffer.from(hashB64, "base64");
  } catch {
    return false;
  }
  if (expected.length !== KEY_LEN) return false;
  const dk = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT);
  return crypto.timingSafeEqual(dk, expected);
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf as never).toString("base64url");
}

export interface TokenPayload {
  userId: string;
  username: string;
  exp?: number;
}

export function createToken(payload: {
  userId: string;
  username: string;
}): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(
    JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS }),
  );
  const sig = crypto
    .createHmac("sha256", secret())
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string | undefined): TokenPayload | null {
  if (!token) return null;
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;

  const expected = crypto
    .createHmac("sha256", secret())
    .update(`${header}.${body}`)
    .digest("base64url");

  // Constant-time; the old Python compared with != and leaked timing.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as TokenPayload;
    if (parsed.exp && parsed.exp < Date.now()) return null;
    if (!parsed.userId || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "st_session";

export function tokenFromRequest(req: NextRequest): string | undefined {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies.get(SESSION_COOKIE)?.value;
}

export function authFromRequest(req: NextRequest): TokenPayload | null {
  return verifyToken(tokenFromRequest(req));
}

/** Throws 401 rather than returning null, for routes that require a session. */
export function requireAuth(req: NextRequest): TokenPayload {
  const auth = authFromRequest(req);
  if (!auth) throw new HttpError(401, "Authentication required");
  return auth;
}

export interface UserDoc {
  _id: unknown;
  username: string;
  displayName?: string;
  passwordHash: string;
  email?: string | null;
  createdAt?: string;
  cfHandle?: string;
  resetTokenHash?: string;
  resetExpiresAt?: number;
}

export async function usersCollection() {
  return (await getUsersDb()).collection<UserDoc>("users");
}

/**
 * The Codeforces handle for a session, read from the account record rather than
 * taken from the request. Per-user documents are keyed by handle, so trusting a
 * client-supplied one would let any signed-in account read or overwrite
 * another's data by simply naming their handle.
 */
export async function sessionHandle(
  req: NextRequest,
): Promise<{ auth: TokenPayload; handle: string | null }> {
  const auth = requireAuth(req);
  const users = await usersCollection();
  const user = await users.findOne(
    { _id: toObjectId(auth.userId) as never },
    { projection: { cfHandle: 1 } },
  );
  if (!user) throw new HttpError(401, "Authentication required");
  return { auth, handle: user.cfHandle?.trim() || null };
}

/* ------------------------------------------------------------------------- *
 * Route helpers
 * ------------------------------------------------------------------------- */

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Turns a thrown error into a response without leaking internals. The old
 * signup handler returned str(e) straight to the client, which could echo the
 * Mongo connection string into an HTTP body.
 */
export function errorResponse(err: unknown, fallback: string): NextResponse {
  if (err instanceof HttpError) return json({ error: err.message }, err.status);
  console.error(fallback, err);
  return json({ error: fallback }, 500);
}

export function setSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_MS / 1000,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
