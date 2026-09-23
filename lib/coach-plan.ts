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

const hint = z
  .object({
    ask: z.string().min(1),
    say: z.string().optional(),
  })
  .passthrough();

const problemHints = z
  .object({
    ladder: z.array(hint).min(1),
    solution: z
      .object({
        say: z.string().min(1),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const lessonResource = z
  .object({
    kind: z.enum(["video", "article", "docs", "book"]),
    title: z.string().min(1),
    url: z.string().min(1),
    minutes: z.number().positive(),
    watchFor: z.string().min(1),
    segment: z.string().optional(),
  })
  .passthrough();

const lessonStep = z
  .object({
    title: z.string().min(1),
    body: z.string().min(1),
    code: z.string().optional(),
  })
  .passthrough();

const lesson = z
  .object({
    title: z.string().min(1),
    topic: z.string().min(1),
    minutes: z.number().positive(),
    why: z.string().min(1),
    outcomes: z.array(z.string().min(1)),
    resources: z.array(lessonResource),
    steps: z.array(lessonStep).min(1),
    drill: z
      .object({
        prompt: z.string().min(1),
        starter: z.string().optional(),
      })
      .passthrough(),
    check: z
      .array(
        z
          .object({
            q: z.string().min(1),
            a: z.string().min(1),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

const leetcodeProblem = z
  .object({
    slug: z.string().min(1),
    title: z.string().min(1),
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    url: z.string().min(1),
    capMinutes: z.number().positive(),
    mirrors: z.string().min(1),
    sealed: z.boolean().optional(),
    reveal: z.string().optional(),
    hints: problemHints.optional(),
  })
  .passthrough();

const leetcode = z
  .object({
    title: z.string().min(1),
    minutes: z.number().positive(),
    problems: z.array(leetcodeProblem).min(1),
  })
  .passthrough();

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
        lesson: lesson.optional(),
        leetcode: leetcode.optional(),
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
