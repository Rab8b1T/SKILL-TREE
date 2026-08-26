import { describe, expect, it } from "vitest";
import planJson from "../public/data/coach/plan.json";
import { parseCoachPlan } from "./coach-plan";

describe("coach plan validation", () => {
  it("accepts the currently published plan", () => {
    const plan = parseCoachPlan(planJson);
    expect(plan.days.length).toBeGreaterThan(0);
    expect(plan.updatedAt).toBeTruthy();
  });

  it("reports the path of malformed plan content", () => {
    expect(() =>
      parseCoachPlan({
        ...planJson,
        days: [{ ...planJson.days[0], date: "not-a-date" }],
      }),
    ).toThrow(/days\.0\.date/);
  });
});
