#!/usr/bin/env node
/**
 * Reads back what actually happened in the coach's published sessions.
 *
 * Run from the repo root:
 *   node scripts/coach-report.mjs              # every day with a recorded run
 *   node scripts/coach-report.mjs --day 23
 *   node scripts/coach-report.mjs --json       # machine-readable
 *
 * Goes straight to MongoDB rather than through the deployed API so the morning
 * analysis works offline and needs no token. The timing maths mirrors
 * lib/coach.ts; keep the two in step if either changes.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import dns from "node:dns";
import path from "node:path";
import { MongoClient } from "mongodb";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const dayArg = args.includes("--day")
  ? Number(args[args.indexOf("--day") + 1])
  : null;

async function env() {
  const raw = await readFile(path.join(ROOT, ".env.local"), "utf8");
  const read = (key) => {
    const m = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
  };
  const uri = read("MONGODB_URI");
  if (!uri) throw new Error("MONGODB_URI missing from .env.local");
  return { uri, dbName: read("DB_NAME") ?? "skilltree" };
}

const activeSeconds = (entry, now) =>
  !entry
    ? 0
    : Math.max(
        0,
        Math.floor(
          entry.segments.reduce((s, seg) => s + ((seg.to ?? now) - seg.from) / 1000, 0),
        ),
      );

const problemsOf = (day, kind) =>
  kind === "contest"
    ? (day.contest?.problems ?? [])
    : (day.practice?.blocks ?? []).flatMap((b) => b.problems);

function decayedPoints(max, elapsed, duration, wrong = 0) {
  const share = Math.min(1, Math.max(0, elapsed / duration));
  const floored = Math.max(max * 0.3, max - max * 0.7 * share);
  return Math.max(0, Math.round(floored - wrong * 50));
}

function analyse(day, kind, run) {
  const now = Date.now();
  const problems = problemsOf(day, kind);
  const lines = problems.map((problem) => {
    const entry = run?.entries?.[problem.key];
    const seconds = activeSeconds(entry, now);
    return {
      key: problem.key,
      name: problem.name,
      rating: problem.rating,
      slot: problem.slot ?? problem.role,
      capMinutes: problem.capMinutes,
      minutes: Math.round(seconds / 60),
      // Switching is explicit now, so more than one segment means you genuinely
      // left this problem and came back to it.
      resumed: Math.max(0, (entry?.segments?.length ?? 0) - 1),
      status: entry?.status ?? "todo",
      wrongAttempts: entry?.wrongAttempts ?? 0,
      overCap: seconds > problem.capMinutes * 60,
      solvedAtSeconds: entry?.solvedAtSeconds ?? null,
      technique: entry?.technique ?? null,
      techniqueRight: entry?.techniqueRight ?? null,
      tags: problem.tags,
    };
  });

  // The only time measured anywhere is time the user put on a problem by hand.
  // There is no session clock, so there is no wall-clock denominator and no
  // focus ratio to derive from one.
  const clocked = run
    ? Object.values(run.entries ?? {}).reduce((s, e) => s + activeSeconds(e, now), 0)
    : 0;
  const sealed = lines.filter((l) => l.technique);

  const summary = {
    day: day.day,
    date: day.date,
    kind,
    focus: day.focus,
    started: run ? new Date(run.startedAt).toISOString() : null,
    finished: run?.finishedAt ? new Date(run.finishedAt).toISOString() : null,
    solved: lines.filter((l) => l.status === "solved").length,
    total: lines.length,
    clockedMinutes: Math.round(clocked / 60),
    overCap: lines.filter((l) => l.overCap).length,
    wrongAttempts: lines.reduce((s, l) => s + l.wrongAttempts, 0),
    discriminationAttempts: sealed.length,
    discriminationErrors: sealed.filter((l) => l.techniqueRight === false).length,
    review: run?.review ?? null,
    lines,
  };

  if (kind === "contest" && day.contest) {
    const duration = day.contest.minutes * 60;
    let points = 0;
    let clean = 0;
    for (const p of day.contest.problems) {
      const line = lines.find((l) => l.key === p.key);
      if (line?.status !== "solved") continue;
      const at = line.solvedAtSeconds ?? duration;
      points += decayedPoints(p.points, at, duration, line.wrongAttempts);
      clean += decayedPoints(p.points, at, duration, 0);
    }
    summary.points = points;
    summary.lostToWrong = clean - points;
    summary.minutesToSolve = lines
      .filter((l) => l.status === "solved" && l.solvedAtSeconds != null)
      .map((l) => ({ slot: l.slot, minute: Math.round(l.solvedAtSeconds / 60) }));
  }

  return summary;
}

function print(reports) {
  for (const r of reports) {
    const head = `Day ${r.day} · ${r.kind} · ${r.date} · ${r.focus}`;
    console.log(`\n${head}\n${"─".repeat(head.length)}`);
    if (!r.started) {
      console.log("  NOT STARTED — no run recorded.");
      continue;
    }
    console.log(
      `  solved ${r.solved}/${r.total}` +
        `  clocked ${r.clockedMinutes}m` +
        `  past-cap ${r.overCap}  wrong ${r.wrongAttempts}` +
        (r.points !== undefined ? `  points ${r.points}` : "") +
        (r.finished ? "" : "  [UNFINISHED]"),
    );
    if (r.discriminationAttempts) {
      console.log(
        `  technique named: ${r.discriminationAttempts - r.discriminationErrors}/${r.discriminationAttempts} right`,
      );
    }
    for (const l of r.lines) {
      const flag =
        l.status === "solved" ? "AC " : l.status === "todo" ? "—  " : "xx ";
      console.log(
        `   ${flag}${String(l.slot).padEnd(9)} ${String(l.rating).padEnd(5)} ` +
          `${String(l.minutes + "m").padEnd(5)}/${String(l.capMinutes + "m").padEnd(5)}` +
          `${l.overCap ? " OVER" : "    "} ` +
          `${l.wrongAttempts ? `${l.wrongAttempts}w ` : "   "}` +
          `${l.name}` +
          (l.resumed ? `  (came back ${l.resumed}x)` : "") +
          (l.technique
            ? `\n        called: "${l.technique}"${l.techniqueRight === false ? "  << WRONG TECHNIQUE" : ""}`
            : ""),
      );
    }
    if (r.review) console.log(`  review: ${r.review}`);
  }
  console.log("");
}

const ago = (ms) => {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return "today";
  return `${days}d ago`;
};

const stamp = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * The app's own three stores, which the coach-planned arena runs know nothing
 * about. Work done in the Practice Hub, a virtual started from the Contest page
 * or an upsolve parked months ago is still work — leaving it out of the brief
 * would mean planning around half of what actually happened.
 */
function printStores({ practice, contest, upsolve }) {
  // An older save bug appended a fresh record every time a finished session was
  // re-saved: eight of the nine stored on 2026-03-29 share one `startedAt` and
  // one result set. Counting those as eight sessions would inflate the only
  // volume figure this section reports, so they collapse to the latest finish.
  const bySession = new Map();
  for (const s of practice?.sessionHistory ?? []) {
    const prev = bySession.get(s.startedAt);
    if (!prev || s.finishedAt > prev.finishedAt) bySession.set(s.startedAt, s);
  }
  const rapid = [...bySession.values()].sort((a, b) => b.finishedAt - a.finishedAt);
  const dupes = (practice?.sessionHistory ?? []).length - rapid.length;
  console.log(
    `  Rapid sessions (app timer, per-problem cap)` +
      (dupes ? `  — ${dupes} duplicate save(s) collapsed` : ""),
  );
  if (!rapid.length) console.log("    none recorded");
  for (const s of rapid.slice(0, 5)) {
    const secs = (s.results ?? []).reduce((t, r) => t + (r.seconds ?? 0), 0);
    const cap = Math.round((s.perProblemSeconds ?? 0) / 60);
    console.log(
      `    ${stamp(s.finishedAt)} (${ago(s.finishedAt)})  ${s.solved}/${s.total} solved  ` +
        `${Math.round(secs / 60)}m engaged  ${cap}m/problem cap`,
    );
    const bad = (s.results ?? []).filter((r) => r.outcome !== "solved");
    if (bad.length) {
      console.log(
        `        missed: ${bad.map((r) => `${r.key} (${r.outcome}, ${Math.round(r.seconds / 60)}m)`).join(", ")}`,
      );
    }
  }

  const picked = (practice?.entries ?? []).filter((e) => e.status === "todo");
  if (picked.length) {
    console.log(`\n  Practice Hub queue (${picked.length} still todo)`);
    for (const e of picked.slice(0, 8)) {
      console.log(
        `    ${e.index} ${e.name} ${e.rating}  added ${ago(e.addedAt)}`,
      );
    }
  }

  const virtuals = (contest?.history ?? [])
    .slice()
    .sort((a, b) => b.finishedAt - a.finishedAt);
  console.log("\n  Virtual contests run in the app");
  if (!virtuals.length) console.log("    none recorded");
  for (const v of virtuals.slice(0, 5)) {
    console.log(
      `    ${stamp(v.finishedAt)} (${ago(v.finishedAt)})  ${v.solved}/${v.total}  ` +
        `${v.points} pts  ${v.penaltyMinutes}m penalty  ${Math.round(v.durationSeconds / 60)}m  ${v.division}`,
    );
    // Which letter you stop at is the number that decides contest rating, so
    // the per-problem detail matters more than the aggregate.
    for (const p of v.problems ?? []) {
      if (p.solved) continue;
      console.log(
        `        unsolved ${p.slot ?? p.index} ${p.contestId}${p.index} ${p.rating}` +
          (p.wrongAttempts ? `  ${p.wrongAttempts} wrong` : ""),
      );
    }
  }
  if (contest?.active) {
    console.log(`    ! a virtual is still open: ${contest.active.name}`);
  }

  const open = (upsolve?.entries ?? []).filter((e) => e.status === "open");
  console.log(`\n  Upsolve queue (${open.length} open)`);
  for (const e of open) {
    const stale = Date.now() - e.addedAt > 14 * 86_400_000 ? "  << stale" : "";
    console.log(
      `    ${e.contestId}${e.index} ${e.name} ${e.rating}  from ${e.source}  ` +
        `${e.attempts} attempt(s)  added ${ago(e.addedAt)}${stale}`,
    );
  }
  console.log("");
}

/**
 * Connects, working around a flaky SRV lookup.
 *
 * `mongodb+srv://` makes the driver resolve a SRV record through Node's own
 * resolver, which on this network intermittently returns EBADRESP even while
 * the system resolver answers correctly. A failed client cannot be reconnected,
 * so each attempt needs a fresh one, and the retry falls back to a public
 * resolver rather than leaving the morning brief without its app data.
 */
async function connect(uri) {
  let last;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt === 1) dns.setServers(["1.1.1.1", "8.8.8.8"]);
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
    try {
      await client.connect();
      return client;
    } catch (err) {
      last = err;
      await client.close().catch(() => {});
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw last;
}

async function main() {
  const { uri, dbName } = await env();
  const plan = JSON.parse(
    await readFile(path.join(ROOT, "public/data/coach/plan.json"), "utf8"),
  );

  const client = await connect(uri);
  let doc;
  let stores = {};
  try {
    const db = client.db(dbName);
    const one = (name) => db.collection(name).findOne({ _id: plan.handle });
    const [arena, practice, contest, upsolve] = await Promise.all([
      one("arena_data"),
      one("practice_data"),
      one("contest_data"),
      one("upsolve_data"),
    ]);
    doc = arena;
    stores = { practice, contest, upsolve };
  } finally {
    await client.close().catch(() => {});
  }

  const runs = doc?.runs ?? {};
  const days = dayArg ? plan.days.filter((d) => d.day === dayArg) : plan.days;

  const reports = [];
  for (const day of days) {
    for (const kind of ["practice", "contest"]) {
      if (!day[kind]) continue;
      const run = runs[`${kind}-${day.day}`];
      if (!run && !dayArg) continue;
      reports.push(analyse(day, kind, run));
    }
  }

  if (asJson) {
    console.log(
      JSON.stringify({ handle: plan.handle, reports, stores }, null, 2),
    );
    return;
  }

  if (!reports.length) console.log("  No coach-planned runs recorded yet.\n");
  else print(reports);

  printStores(stores);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
