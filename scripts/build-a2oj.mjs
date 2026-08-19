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

/** Pulls contest id and index out of any Codeforces problem URL shape. */
function parseCfLink(link) {
  if (!link) return {};
  const m =
    link.match(/problemset\/problem\/(\d+)\/([A-Za-z]\d?)/i) ??
    link.match(/contest\/(\d+)\/problem\/([A-Za-z]\d?)/i) ??
    link.match(/gym\/(\d+)\/problem\/([A-Za-z]\d?)/i);
  return m ? { contestId: Number(m[1]), index: m[2].toUpperCase() } : {};
}

async function buildLadders() {
  const src = JSON.parse(
    await readFile(path.join(RAW, "ladders.raw.json"), "utf8"),
  );
  const dir = path.join(OUT, "ladders");
  await mkdir(dir, { recursive: true });

  const index = [];
  const keys = {};
  for (const ladder of src.ladders) {
    const problems = ladder.problems.map((p) => {
      const parsed = parseCfLink(p.link);
      return {
        n: p.name,
        u: p.link,
        r: p.rating || 0,
        c: p.cfContestId ?? parsed.contestId,
        i: p.cfIndex ?? parsed.index,
      };
    });

    // The overview page needs every problem's Codeforces key to show real
    // progress, but not the names or ratings. Kept out of index.json so the
    // list of ladders stays a 6 KB fetch for anyone without a handle.
    keys[ladder.slug] = problems
      .filter((p) => p.c && p.i)
      .map((p) => `${p.c}-${p.i}`);

    const rated = problems.filter((p) => p.r > 0).map((p) => p.r);
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

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const l = await buildLadders();
const c = await buildCategories();
console.log(
  `ladders    ${l.ladders} files, ${l.problems} problems, ${l.keyed} with CF keys\n` +
    `categories ${c.categories} files, ${c.problems} problems, ${c.keyed} with CF keys\n` +
    `written to public/data`,
);
