import { NextRequest } from "next/server";
import { errorResponse, json, sessionHandle } from "@/lib/auth";
import { getAppDb, HttpError } from "@/lib/mongo";

/**
 * One handler for the three per-user documents. Each is a single document keyed
 * by `_id = <codeforces handle>`, which is the layout the previous deployment
 * used and the reason existing rows are still readable.
 *
 * Writes are whole-document replacements guarded by `lastKnownSavedAt`: if the
 * stored copy is newer than what the client started from, the server refuses
 * and hands back the newer document instead of silently overwriting it. That is
 * what stops two open tabs from clobbering each other.
 */
const COLLECTIONS: Record<string, { name: string; empty: Record<string, unknown> }> = {
  contest: { name: "contest_data", empty: { active: null, history: [] } },
  practice: { name: "practice_data", empty: { entries: [], prefs: {} } },
  upsolve: { name: "upsolve_data", empty: { entries: [] } },
  // Coach-planned session runs, keyed by `<kind>-<day>`. Read back out of band
  // by scripts/coach-report.mjs, which is why it is a plain document rather
  // than something derived from the practice store.
  arena: { name: "arena_data", empty: { runs: {} } },
};

function resolve(kind: string) {
  const entry = COLLECTIONS[kind];
  if (!entry) throw new HttpError(404, `Unknown store: ${kind}`);
  return entry;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  try {
    const { handle } = await sessionHandle(req);
    const { kind } = await params;
    const { name, empty } = resolve(kind);

    if (!handle) return json({ ...empty, savedAt: null });

    const db = await getAppDb();
    const doc = await db.collection(name).findOne({ _id: handle as never });
    if (!doc) return json({ ...empty, savedAt: null });

    const { _id, ...rest } = doc;
    void _id;
    return json({ ...empty, ...rest });
  } catch (err) {
    return errorResponse(err, "Could not load saved data");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  try {
    const { auth, handle } = await sessionHandle(req);
    const { kind } = await params;
    const { name } = resolve(kind);

    const body = (await req.json().catch(() => null)) as
      | (Record<string, unknown> & { handle?: string; lastKnownSavedAt?: string | null })
      | null;
    if (!body || typeof body !== "object") throw new HttpError(400, "Invalid JSON");

    if (!handle) {
      throw new HttpError(400, "Set a Codeforces handle before saving");
    }

    const db = await getAppDb();
    const col = db.collection(name);

    const existing = await col.findOne({ _id: handle as never });
    const storedAt = (existing?.savedAt as string | undefined) ?? null;
    if (storedAt && body.lastKnownSavedAt && storedAt > body.lastKnownSavedAt) {
      const { _id, ...rest } = existing!;
      void _id;
      return json({ conflict: true, ...rest }, 409);
    }

    const savedAt = new Date().toISOString();
    const { handle: _h, lastKnownSavedAt: _l, ...data } = body;
    void _h;
    void _l;

    await col.updateOne(
      { _id: handle as never },
      { $set: { ...data, userId: auth.userId, savedAt } },
      { upsert: true },
    );
    return json({ ok: true, savedAt });
  } catch (err) {
    return errorResponse(err, "Could not save data");
  }
}
