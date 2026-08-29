/**
 * Turns the scraped A2OJ dumps into the split, trimmed JSON the app fetches.
 *
 * The scrapers write two monolithic files (1.9 MB of ladders, 5.5 MB of
 * categories). Loading either to render a list of 32 names is wasteful, so this
 * emits a small index plus one file per ladder/category, and drops the fields
 * the UI never reads.
 *
 *   node scripts/build-a2oj.mjs
 */
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW = path.join(ROOT, "scripts", "a2oj");
const OUT = path.join(ROOT, "public", "data");
const CF_PROBLEMSET = "https://codeforces.com/api/problemset.problems";

/** Pulls contest id and index out of any Codeforces problem URL shape. */
function parseCfLink(link) {
  if (!link) return {};
  const m =
    link.match(/problemset\/problem\/(\d+)\/([A-Za-z]\d?)/i) ??
    link.match(/contest\/(\d+)\/problem\/([A-Za-z]\d?)/i) ??
    link.match(/gym\/(\d+)\/problem\/([A-Za-z]\d?)/i);
  return m ? { contestId: Number(m[1]), index: m[2].toUpperCase() } : {};
}

function cfKey(contestId, index) {
  return contestId && index ? `${contestId}-${index.toUpperCase()}` : null;
}

function platformOf(platform, link) {
  if (platform?.trim()) return platform.trim();
  try {
    const host = new URL(link).hostname.toLowerCase();
    if (host.includes("codeforces")) return "Codeforces";
    if (host.includes("codechef")) return "CodeChef";
    if (host.includes("spoj")) return "SPOJ";
    if (host.includes("uva")) return "UVa";
    if (host.includes("atcoder")) return "AtCoder";
  } catch {
    // The source link remains usable even if its judge cannot be inferred.
  }
  return "Other";
}

/**
 * Keep generated ladder ratings useful when Codeforces changes or removes a
 * rating. Existing generated data is the offline fallback; the live problemset
 * refreshes it when the API is available.
 */
async function existingCfRatings(src) {
  const ratings = new Map();
  for (const ladder of src.ladders) {
    const file = path.join(OUT, "ladders", `${ladder.slug}.json`);
    if (!existsSync(file)) continue;
    try {
      const current = JSON.parse(await readFile(file, "utf8"));
      for (const p of current.problems ?? []) {
        const key = cfKey(p.c, p.i);
        if (key && p.r >= 100) ratings.set(key, p.r);
      }
    } catch {
      // A stale/corrupt generated file should not prevent a clean rebuild.
    }
  }
  return ratings;
}

async function codeforcesRatings(fallback) {
  try {
    const response = await fetch(CF_PROBLEMSET, {
      headers: { "User-Agent": "skill-tree-a2oj-builder/2.0" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (body.status !== "OK" || !Array.isArray(body.result?.problems)) {
      throw new Error(body.comment || "unexpected response");
    }

    const ratings = new Map(fallback);
    for (const p of body.result.problems) {
      const key = cfKey(p.contestId, p.index);
      if (key && p.rating) ratings.set(key, p.rating);
    }
    console.log(`Codeforces ratings refreshed (${ratings.size} keyed problems)`);
    return ratings;
  } catch (error) {
    console.warn(
      `Codeforces ratings unavailable; using source/cache (${error.message})`,
    );
    return fallback;
  }
}

async function buildLadders(src, cfRatings) {
  const dir = path.join(OUT, "ladders");
  await mkdir(dir, { recursive: true });

  const index = [];
  const keys = {};
  for (const ladder of src.ladders) {
    const problems = ladder.problems.map((p) => {
      const parsed = parseCfLink(p.link);
      const contestId = p.cfContestId ?? parsed.contestId;
      const index = p.cfIndex ?? parsed.index;
      const sourceRating = Number(p.rating) || 0;
      const sourceDifficulty = Number(p.difficulty) || 0;
      const rating =
        cfRatings.get(cfKey(contestId, index)) ??
        (sourceRating >= 100 ? sourceRating : null);
      const difficulty =
        sourceDifficulty > 0
          ? sourceDifficulty
          : sourceRating > 0 && sourceRating <= 10
            ? sourceRating
            : null;
      return {
        n: p.name,
        u: p.link.replace(/^http:/, "https:"),
        r: rating,
        d: difficulty,
        p: platformOf(p.platform, p.link),
        c: contestId,
        i: index,
      };
    });

    // The overview page needs every problem's Codeforces key to show real
    // progress, but not the names or ratings. Kept out of index.json so the
    // list of ladders stays a 6 KB fetch for anyone without a handle.
    keys[ladder.slug] = problems
      .filter((p) => p.c && p.i)
      .map((p) => `${p.c}-${p.i}`);

    const rated = problems.filter((p) => p.r).map((p) => p.r);
    const difficulties = problems.filter((p) => p.d).map((p) => p.d);
    const platforms = [...new Set(problems.map((p) => p.p))].sort();
    index.push({
      slug: ladder.slug,
      name: ladder.name,
      group: ladder.group,
      count: problems.length,
      minRating: rated.length ? Math.min(...rated) : null,
      maxRating: rated.length ? Math.max(...rated) : null,
      avgRating: rated.length
        ? Math.round(rated.reduce((a, b) => a + b, 0) / rated.length)
        : null,
      minDifficulty: difficulties.length ? Math.min(...difficulties) : null,
      maxDifficulty: difficulties.length ? Math.max(...difficulties) : null,
      platforms,
    });

    await writeFile(
      path.join(dir, `${ladder.slug}.json`),
      JSON.stringify({ slug: ladder.slug, name: ladder.name, problems }),
    );
  }

  await writeFile(
    path.join(dir, "index.json"),
    JSON.stringify({ lastUpdated: src.lastUpdated, ladders: index }, null, 2),
  );
  await writeFile(path.join(dir, "keys.json"), JSON.stringify(keys));
  return {
    ladders: index.length,
    problems: src.totalProblems,
    keyed: Object.values(keys).reduce((s, k) => s + k.length, 0),
  };
}

async function buildCategories() {
  const src = JSON.parse(
    await readFile(path.join(RAW, "categories.raw.json"), "utf8"),
  );
  const dir = path.join(OUT, "categories");
  await mkdir(dir, { recursive: true });

  const index = [];
  const keys = {};
  let total = 0;
  for (const cat of src.categories) {
    const problems = cat.problems.map((p) => {
      const parsed = parseCfLink(p.link);
      return {
        n: p.name,
        u: p.link,
        p: p.platform || null,
        d: p.difficulty ?? null,
        y: p.year || null,
        c: parsed.contestId,
        i: parsed.index,
      };
    });
    total += problems.length;

    keys[cat.slug] = problems
      .filter((p) => p.c && p.i)
      .map((p) => `${p.c}-${p.i}`);

    const platforms = {};
    for (const p of problems) {
      const key = p.p ?? "Unknown";
      platforms[key] = (platforms[key] ?? 0) + 1;
    }

    index.push({
      slug: cat.slug,
      name: cat.name,
      count: problems.length,
      platforms: Object.entries(platforms)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, n]) => ({ name, n })),
    });

    await writeFile(
      path.join(dir, `${cat.slug}.json`),
      JSON.stringify({ slug: cat.slug, name: cat.name, problems }),
    );
  }

  await writeFile(
    path.join(dir, "index.json"),
    JSON.stringify({ lastUpdated: src.lastUpdated, categories: index }, null, 2),
  );
  await writeFile(path.join(dir, "keys.json"), JSON.stringify(keys));
  return {
    categories: index.length,
    problems: total,
    keyed: Object.values(keys).reduce((s, k) => s + k.length, 0),
  };
}

const missing = ["ladders.raw.json", "categories.raw.json"].filter(
  (p) => !existsSync(path.join(RAW, p)),
);
if (missing.length) {
  console.error(`Missing source data: ${missing.join(", ")}`);
  process.exit(1);
}

const ladderSource = JSON.parse(
  await readFile(path.join(RAW, "ladders.raw.json"), "utf8"),
);
const cachedRatings = await existingCfRatings(ladderSource);
const ratings = await codeforcesRatings(cachedRatings);

await mkdir(OUT, { recursive: true });
await Promise.all(
  ["ladders", "categories"].map((name) =>
    rm(path.join(OUT, name), { recursive: true, force: true }),
  ),
);

const l = await buildLadders(ladderSource, ratings);
const c = await buildCategories();
console.log(
  `ladders    ${l.ladders} files, ${l.problems} problems, ${l.keyed} with CF keys\n` +
    `categories ${c.categories} files, ${c.problems} problems, ${c.keyed} with CF keys\n` +
    `written to public/data`,
);
