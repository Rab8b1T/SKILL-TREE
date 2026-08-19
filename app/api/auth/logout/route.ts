import { clearSessionCookie, json } from "@/lib/auth";

export async function POST() {
  return clearSessionCookie(json({ ok: true }));
}
