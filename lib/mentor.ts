import { rankFor, type SolvedProblem } from "./cf";

/**
 * The rule-based recommendation engine, carried over from the previous
 * implementation. It is plain heuristics over the user's own solve counts —
 * no model, no inference — which is exactly why its output is explainable.
 */

/** Solves in a tag before it stops being a priority. */
export const TOPIC_MASTERY_THRESHOLD = 100;
/** Solves in a 100-point bucket before that bucket is considered covered. */
export const RATING_MASTERY_THRESHOLD = 200;

type Band =
  | "newbie"
  | "pupil"
  | "specialist"
  | "expert"
  | "candidateMaster"
  | "master";

/** Topics that actually decide rounds at each band, in priority order. */
const TOPIC_PRIORITY: Record<Band, string[]> = {
  newbie: [
    "implementation",
    "brute force",
    "math",
    "greedy",
    "strings",
    "sortings",
    "constructive algorithms",
  ],
  pupil: [
    "implementation",
    "math",
    "greedy",
    "dp",
    "binary search",
    "two pointers",
    "strings",
    "sortings",
  ],
  specialist: [
    "dp",
    "greedy",
    "binary search",
    "two pointers",
    "dfs and similar",
    "graphs",
    "math",
    "number theory",
  ],
  expert: [
    "dp",
    "graphs",
    "dfs and similar",
    "trees",
    "binary search",
    "data structures",
    "number theory",
    "combinatorics",
  ],
  candidateMaster: [
    "dp",
    "graphs",
    "trees",
    "data structures",
    "combinatorics",
    "number theory",
    "bitmasks",
    "divide and conquer",
  ],
  master: [
    "dp",
    "graphs",
    "trees",
    "data structures",
    "flows",
    "combinatorics",
    "fft",
    "geometry",
    "games",
  ],
};

const RATING_FOCUS: Record<Band, number[]> = {
  newbie: [800, 900, 1000, 1100],
  pupil: [1000, 1100, 1200, 1300],
  specialist: [1200, 1300, 1400, 1500],
  expert: [1400, 1500, 1600, 1700, 1800],
  candidateMaster: [1600, 1700, 1800, 1900, 2000],
  master: [1800, 1900, 2000, 2100, 2200, 2300, 2400],
};

export function bandFor(rating: number): Band {
  if (rating >= 2100) return "master";
  if (rating >= 1900) return "candidateMaster";
  if (rating >= 1600) return "expert";
  if (rating >= 1400) return "specialist";
  if (rating >= 1200) return "pupil";
  return "newbie";
}

export type Urgency = "critical" | "developing" | "solid";

export interface TopicPriority {
  topic: string;
  count: number;
  priority: number;
  urgency: Urgency;
  advice: string;
}

export function topicPriorities(
  byTag: Record<string, number>,
  rating: number,
): TopicPriority[] {
  return TOPIC_PRIORITY[bandFor(rating)].map((topic, i) => {
    const count = byTag[topic] ?? 0;
    const urgency: Urgency =
      count >= TOPIC_MASTERY_THRESHOLD
        ? "solid"
        : count < 30
          ? "critical"
          : "developing";
    return {
      topic,
      count,
      priority: i + 1,
      urgency,
      advice:
        urgency === "solid"
          ? "Well covered — maintain with occasional reps."
          : urgency === "critical"
            ? "Critical gap. Make this the daily focus."
            : "Keep practising; not yet automatic.",
    };
  });
}

export interface RatingTarget {
  rating: number;
  count: number;
  target: number;
  pct: number;
  covered: boolean;
}

export function ratingTargets(
  byRating: Record<number, number>,
  rating: number,
): RatingTarget[] {
  return RATING_FOCUS[bandFor(rating)].map((r) => {
    const count = byRating[r] ?? 0;
    return {
      rating: r,
      count,
      target: RATING_MASTERY_THRESHOLD,
      pct: Math.min(100, (count / RATING_MASTERY_THRESHOLD) * 100),
      covered: count >= RATING_MASTERY_THRESHOLD,
    };
  });
}

export interface Verdict {
  headline: string;
  detail: string;
  tone: "positive" | "warning" | "negative";
  actions: string[];
}

/**
 * The overall read. Deliberately blunt: the failure mode of a dashboard is
 * telling someone they're doing fine while their rating sits still.
 */
export function mentorVerdict(input: {
  rating: number;
  solved: SolvedProblem[];
  byTag: Record<string, number>;
  byRating: Record<number, number>;
  ratedRounds: number;
  streak: number;
  firstTryRate: number;
}): Verdict {
  const { rating, solved, byTag, ratedRounds, streak, firstTryRate } = input;
  const rank = rankFor(rating);
  const band = bandFor(rating);
  const floor = Math.round((rating + 100) / 100) * 100;

  const inBand = solved.filter((p) => p.rating >= floor).length;
  const share = solved.length ? inBand / solved.length : 0;
  const criticalTags = TOPIC_PRIORITY[band].filter(
    (t) => (byTag[t] ?? 0) < 30,
  );

  const actions: string[] = [];

  // Contest count dominates everything else: rating only moves in rounds.
  if (ratedRounds < 5) {
    actions.push(
      `Only ${ratedRounds} rated ${ratedRounds === 1 ? "round" : "rounds"} so far — enter every one you can. Practice never moves the number.`,
    );
  }
  if (share < 0.15 && solved.length > 40) {
    actions.push(
      `Just ${Math.round(share * 100)}% of your solves are at ${floor}+. Volume below the band is comfort, not growth.`,
    );
  }
  if (criticalTags.length) {
    actions.push(
      `Under 30 solves in ${criticalTags.slice(0, 3).join(", ")} — these decide ${rank.name} rounds.`,
    );
  }
  if (firstTryRate < 60 && solved.length > 30) {
    actions.push(
      `${firstTryRate}% first-try rate. Verify against the samples before submitting; wrong submissions cost penalty time in every round.`,
    );
  }
  if (streak === 0) {
    actions.push("No solve today. Consistency beats intensity at every band.");
  }

  if (!actions.length) {
    return {
      headline: "On track",
      detail: `Band coverage, tag spread and submission accuracy all look healthy for ${rank.name}. Keep entering rounds and nudge the band up when a session feels easy.`,
      tone: "positive",
      actions: [
        `Push the practice floor towards ${floor + 100} for the next few sessions.`,
      ],
    };
  }

  const severe = ratedRounds < 5 || (share < 0.15 && solved.length > 40);
  return {
    headline: severe ? "The binding constraint" : "Worth fixing",
    detail: `You are ${rank.name} at ${rating}. ${
      severe
        ? "The items below are what is actually holding the rating back — they outrank learning new topics."
        : "Nothing structural is wrong; these are the cheapest wins available."
    }`,
    tone: severe ? "negative" : "warning",
    actions,
  };
}
