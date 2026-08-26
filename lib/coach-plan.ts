import { z } from "zod";
import type { CoachPlan } from "./coach";

const problem = z
  .object({
    key: z.string().min(1),
    contestId: z.number().int().positive(),
    index: z.string().min(1),
    name: z.string().min(1),
    rating: z.number().int().nonnegative(),
    tags: z.array(z.string()),
    capMinutes: z.number().positive(),
    role: z.string().min(1),
  })
  .passthrough();

const contestProblem = problem.extend({
  slot: z.string().min(1),
  points: z.number().int().nonnegative(),
});

const planSchema = z.object({
  updatedAt: z.string().min(1),
  handle: z.string().min(1),
  mentor: z
    .object({
      rating: z.number(),
      rank: z.string(),
      goalRating: z.number(),
      goalDate: z.string(),
      headline: z.string(),
      detail: z.string(),
      weaknesses: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          severity: z.number(),
        }),
      ),
      pace: z.array(
        z.object({
          slot: z.string(),
          targetMinutes: z.number(),
          yourMinutes: z.number().nullable(),
        }),
      ),
      checkpoints: z.array(
        z.object({
          date: z.string(),
          rounds: z.number(),
          rating: z.number(),
        }),
      ),
    })
    .passthrough(),
  days: z.array(
    z
      .object({
        day: z.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        focus: z.string(),
        concept: z.string().optional(),
        watchFor: z.string().optional(),
        practice: z
          .object({
            title: z.string(),
            blocks: z.array(
              z
                .object({
                  id: z.string(),
                  label: z.string(),
                  minutes: z.number().positive(),
                  note: z.string().optional(),
                  problems: z.array(problem),
                })
                .passthrough(),
            ),
          })
          .optional(),
        contest: z
          .object({
            title: z.string(),
            minutes: z.number().positive(),
            mirrors: z.string(),
            target: z.string().optional(),
            problems: z.array(contestProblem).min(2),
          })
          .optional(),
      })
      .passthrough(),
  ),
});

export function parseCoachPlan(value: unknown): CoachPlan {
  const result = planSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") || "plan";
    throw new Error(`Coach plan is invalid at ${path}: ${issue?.message ?? "invalid value"}`);
  }
  return result.data as CoachPlan;
}
