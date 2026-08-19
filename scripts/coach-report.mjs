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

  const engaged = run
    ? Object.values(run.entries ?? {}).reduce((s, e) => s + activeSeconds(e, now), 0)
    : 0;
  const wall = run ? ((run.finishedAt ?? now) - run.startedAt) / 1000 : 0;
  // Declared breaks leave the denominator, so focus is work against desk time.
  const end = run?.finishedAt ?? now;
  const rested = run
    ? (run.breaks ?? []).reduce(
        (s, b) => s + (Math.min(b.to ?? end, end) - b.from) / 1000,
        0,
      )
    : 0;
  const atDesk = Math.max(1, wall - rested);
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
    engagedMinutes: Math.round(engaged / 60),
    wallMinutes: Math.round(wall / 60),
    deskMinutes: Math.round(atDesk / 60),
    breakMinutes: Math.round(rested / 60),
    breakCount: (run?.breaks ?? []).length,
    autoBreaks: (run?.breaks ?? []).filter((b) => b.auto).length,
    focusPct: wall > 0 ? Math.round((engaged / atDesk) * 100) : 0,
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
        `  engaged ${r.engagedMinutes}m of ${r.deskMinutes}m at desk (${r.focusPct}% focus)` +
        (r.breakCount
          ? `  breaks ${r.breakCount}/${r.breakMinutes}m` +
            (r.autoBreaks ? ` (${r.autoBreaks} detected)` : "")
          : "") +
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

async function main() {
  const { uri, dbName } = await env();
  const plan = JSON.parse(
    await readFile(path.join(ROOT, "public/data/coach/plan.json"), "utf8"),
  );

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  let doc;
  try {
    await client.connect();
    doc = await client.db(dbName).collection("arena_data").findOne({ _id: plan.handle });
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
    console.log(JSON.stringify({ handle: plan.handle, reports }, null, 2));
  } else if (!reports.length) {
    console.log("No recorded runs yet.");
  } else {
    print(reports);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
