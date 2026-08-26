/**
 * One-time migration from the pre-rewrite document shapes to the current ones.
 *
 * The old app stored the same three per-user documents under different field
 * names, so a straight read after the rewrite shows empty lists even though the
 * history is there. This maps them across.
 *
 *   upsolve_data:  todo[]          -> entries[]        (UpsolveEntry)
 *   contest_data:  pastContests[]  -> history[]        (ContestResult)
 *   practice_data: pastSessions[]  -> sessionHistory[] (RapidSessionResult)
 *
 * Legacy fields are left in place, so this is additive and reversible: rolling
 * back means deleting the new fields, not restoring a backup.
 *
 * Two legacy values are deliberately NOT migrated, because both describe a
 * half-finished run whose timer state has no faithful equivalent in the new
 * schema, and both are months stale:
 *   contest_data.activeContest   -> active: null
 *   practice_data.activePractice -> session: null
 *
 * Usage:  node --env-file=.env.local scripts/migrate-legacy-docs.mjs [--apply]
 * Without --apply it prints the plan and writes nothing.
 */
import { MongoClient } from "mongodb";

const APPLY = process.argv.includes("--apply");

const ms = (v) => {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
};
const keyOf = (contestId, index) => `${contestId}-${index}`;

/** "https://codeforces.com/problemset/problem/1144/A" -> { contestId, index } */
function fromUrl(url) {
  const m = /\/(?:problemset\/problem|contest)\/(\d+)\/(?:problem\/)?([A-Za-z]\d*)/.exec(url ?? "");
  return m ? { contestId: Number(m[1]), index: m[2] } : null;
}

function migrateUpsolve(doc) {
  const legacy = Array.isArray(doc.todo) ? doc.todo : [];
  const existing = new Set((doc.entries ?? []).map((e) => e.key));
  const entries = [...(doc.entries ?? [])];

  for (const t of legacy) {
    const ref = { contestId: t.contestId, index: t.index };
    if (ref.contestId == null || !ref.index) Object.assign(ref, fromUrl(t.url) ?? {});
    if (ref.contestId == null || !ref.index) continue;

    const key = keyOf(ref.contestId, ref.index);
    if (existing.has(key)) continue;
    existing.add(key);

    entries.push({
      key,
      contestId: ref.contestId,
      index: ref.index,
      name: t.name ?? key,
      rating: t.rating ?? 0,
      tags: t.tags ?? [],
      // The old queue was fed by the practice timer running out.
      source: "practice",
      addedAt: ms(t.addedAt) ?? Date.now(),
      attempts: t.attempts ?? 0,
      status: t.done ? "done" : "open",
      ...(t.note ? { note: t.note } : {}),
    });
  }
  return { entries };
}

/**
 * Per-problem detail for an archived round. The legacy record kept the real
 * Codeforces index under `originalIndex` and the position in the set under
 * `index`; the new shape keeps that distinction, since collapsing the two makes
 * every problem link point somewhere else in the same contest.
 */
function contestProblems(c) {
  const rows = Array.isArray(c.problems) ? c.problems : [];
  const startTime = c.startTime ?? null;

  return rows.map((p) => {
    const solved = p.status === "solved";
    const relative =
      solved && p.solvedAt && startTime
        ? Math.max(0, Math.round((p.solvedAt - startTime) / 1000))
        : null;
    return {
      contestId: p.contestId,
      index: p.originalIndex ?? p.index,
      slot: p.index,
      name: p.name ?? "",
      rating: p.rating ?? 0,
      tags: p.tags ?? [],
      solved,
      wrongAttempts: p.attempts ?? 0,
      ...(relative != null ? { solvedAtSeconds: relative } : {}),
    };
  });
}

function migrateContest(doc) {
  const legacy = Array.isArray(doc.pastContests) ? doc.pastContests : [];
  const byId = new Map(
    legacy.map((c) => [String(c.contestId ?? c.startTime ?? ""), c]),
  );
  const existing = new Set((doc.history ?? []).map((h) => h.id));

  // Rows migrated before per-problem detail was recorded are enriched in place;
  // the aggregate columns they already carry are left untouched.
  const history = (doc.history ?? []).map((h) => {
    if (h.problems?.length) return h;
    const source = byId.get(String(h.id));
    if (!source) return h;
    const problems = contestProblems(source);
    return problems.length ? { ...h, problems } : h;
  });

  for (const c of legacy) {
    const id = String(c.contestId ?? c.startTime ?? "");
    if (!id || existing.has(id)) continue;
    existing.add(id);

    const problems = Array.isArray(c.problems) ? c.problems : [];
    const solved = c.solvedCount ?? problems.filter((p) => p.status === "solved").length;
    // The old scoreboard tracked a decaying currentScore per problem; the
    // contest's total is the sum over the ones that were actually solved.
    const points = Math.round(
      c.totalScore ??
        problems
          .filter((p) => p.status === "solved")
          .reduce((s, p) => s + (p.currentScore ?? 0), 0),
    );

    history.push({
      id,
      name: c.contestName ?? "Virtual contest",
      division: c.contestType === "custom" ? "custom" : (c.contestType ?? "custom"),
      finishedAt:
        ms(c.date) ??
        ((c.startTime ?? 0) + (c.timeTaken ?? 0) || Date.now()),
      durationSeconds: (c.originalDuration ?? 0) * 60,
      solved,
      total: c.totalProblems ?? problems.length,
      points,
      penaltyMinutes: c.totalPenalty ?? 0,
      problems: contestProblems(c),
    });
  }

  history.sort((a, b) => b.finishedAt - a.finishedAt);
  return { history, active: doc.active ?? null };
}

function migratePractice(doc) {
  const legacy = Array.isArray(doc.pastSessions) ? doc.pastSessions : [];
  const existing = new Set((doc.sessionHistory ?? []).map((s) => s.id));
  const sessionHistory = [...(doc.sessionHistory ?? [])];

  for (const s of legacy) {
    const id = String(s.sessionId ?? s.startedAt ?? "");
    if (!id || existing.has(id)) continue;
    existing.add(id);

    const rows = Array.isArray(s.problemResults) ? s.problemResults : [];
    const results = rows
      .map((r) => {
        const ref =
          r.contestId != null && r.index
            ? { contestId: r.contestId, index: r.index }
            : fromUrl(r.url);
        if (!ref) return null;
        return {
          key: keyOf(ref.contestId, ref.index),
          // "completed" meant accepted; anything sent to the upsolve queue was
          // not solved inside the timebox.
          outcome: r.result === "completed" ? "solved" : "failed",
          seconds: Math.round((r.timeTakenMs ?? 0) / 1000),
        };
      })
      .filter(Boolean);

    const startedAt = ms(s.startedAt) ?? 0;
    sessionHistory.push({
      id,
      startedAt,
      finishedAt: ms(s.completedAt) ?? startedAt,
      total: s.totalProblems ?? results.length,
      solved: s.completed ?? results.filter((r) => r.outcome === "solved").length,
      // The old timer ran three 5-minute phases per problem.
      perProblemSeconds: 900,
      results,
    });
  }

  sessionHistory.sort((a, b) => b.startedAt - a.startedAt);
  return { sessionHistory, session: doc.session ?? null };
}

const PLAN = [
  { collection: "upsolve_data", legacy: "todo", target: "entries", migrate: migrateUpsolve },
  { collection: "contest_data", legacy: "pastContests", target: "history", migrate: migrateContest },
  { collection: "practice_data", legacy: "pastSessions", target: "sessionHistory", migrate: migratePractice },
];

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db(process.env.DB_NAME || "skilltree");

console.log(APPLY ? "APPLYING\n" : "DRY RUN — pass --apply to write\n");

for (const { collection, legacy, target, migrate } of PLAN) {
  const docs = await db.collection(collection).find({}).toArray();
  for (const doc of docs) {
    const id = String(doc._id);
    // Documents keyed by ObjectId are from an even earlier layout that keyed on
    // the account id; the app reads by handle, so they are inert. Left alone.
    if (/^[0-9a-f]{24}$/i.test(id)) {
      console.log(`${collection}/${id}  skipped (legacy id-keyed document)`);
      continue;
    }
    if (!Array.isArray(doc[legacy]) || doc[legacy].length === 0) {
      console.log(`${collection}/${id}  nothing to migrate (no ${legacy})`);
      continue;
    }

    const patch = migrate(doc);
    const before = (doc[target] ?? []).length;
    const after = patch[target].length;

    // A row count alone hides enrichment of rows that already existed, which is
    // exactly what the per-problem backfill does.
    const detailBefore = (doc[target] ?? []).filter((r) => r.problems?.length).length;
    const detailAfter = patch[target].filter((r) => r.problems?.length).length;
    const detail =
      detailAfter !== detailBefore || detailAfter > 0
        ? `  detail[${detailBefore} -> ${detailAfter}]`
        : "";

    console.log(
      `${collection}/${id}  ${legacy}[${doc[legacy].length}] -> ${target}[${before} -> ${after}]${detail}`,
    );

    if (APPLY) {
      await db.collection(collection).updateOne(
        { _id: doc._id },
        { $set: { ...patch, migratedAt: new Date().toISOString() } },
      );
    }
  }
}

await client.close();
console.log(APPLY ? "\nDone." : "\nNothing written.");
