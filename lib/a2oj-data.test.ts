import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { LadderDetail, LadderIndex } from "./types";

const LADDER_DIR = path.join(process.cwd(), "public", "data", "ladders");
const index = JSON.parse(
  readFileSync(path.join(LADDER_DIR, "index.json"), "utf8"),
) as LadderIndex;

function detail(slug: string) {
  return JSON.parse(
    readFileSync(path.join(LADDER_DIR, `${slug}.json`), "utf8"),
  ) as LadderDetail;
}

describe("generated ladder data", () => {
  it("keeps ratings, A2OJ levels, and platforms distinct", () => {
    let total = 0;
    let rated = 0;
    let leveled = 0;

    for (const meta of index.ladders) {
      const ladder = detail(meta.slug);
      expect(ladder.problems).toHaveLength(meta.count);
      expect(meta.platforms.length).toBeGreaterThan(0);

      const ratings: number[] = [];
      const levels: number[] = [];
      for (const problem of ladder.problems) {
        total++;
        expect(problem.p).toBeTruthy();
        if (problem.r !== null) {
          rated++;
          ratings.push(problem.r);
          expect(problem.r).toBeGreaterThanOrEqual(100);
        }
        if (problem.d !== null) {
          leveled++;
          levels.push(problem.d);
          expect(problem.d).toBeGreaterThanOrEqual(1);
          expect(problem.d).toBeLessThanOrEqual(10);
        }
      }

      expect(meta.minRating).toBe(ratings.length ? Math.min(...ratings) : null);
      expect(meta.maxRating).toBe(ratings.length ? Math.max(...ratings) : null);
      expect(meta.minDifficulty).toBe(levels.length ? Math.min(...levels) : null);
      expect(meta.maxDifficulty).toBe(levels.length ? Math.max(...levels) : null);
    }

    expect(rated / total).toBeGreaterThan(0.99);
    expect(leveled).toBeGreaterThan(0);
  });
});
