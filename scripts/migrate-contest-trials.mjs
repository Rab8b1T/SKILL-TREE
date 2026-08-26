/**
 * Non-destructive migration of legacy CF Picker history into contest_rounds.
 *
 * Dry-run is the default:
 *   node --env-file=.env scripts/migrate-contest-trials.mjs
 * Apply only after inspecting that output:
 *   node --env-file=.env scripts/migrate-contest-trials.mjs --apply
 *
 * Source documents, stale active objects and unknown-owner ObjectId documents
 * are never modified. Re-running is safe because ownerId + roundId is unique
 * and every write uses $setOnInsert.
 */
import { MongoClient, ObjectId } from "mongodb";

const APPLY = process.argv.includes("--apply");
const APP_DB = process.env.DB_NAME || "skilltree";
const USER_DB = process.env.USER_DB_NAME || "user";
if (!process.env.MONGODB_URI || !process.env.USER_MONGODB_URI) {
  throw new Error("MONGODB_URI and USER_MONGODB_URI are required");
}

const appClient = await new MongoClient(process.env.MONGODB_URI).connect();
const userClient = await new MongoClient(process.env.USER_MONGODB_URI).connect();

function epochMs(value) {
  if (value == null) return null;
  if (typeof value === "number") {
    return value > 0 && value < 10_000_000_000 ? value * 1000 : value;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function divisionOf(value) {
  return ["div1", "div2", "div3", "div4"].includes(value)
    ? value
    : "custom";
}

function problemOf(problem) {
  const solved = Boolean(problem.solved ?? problem.status === "solved");
  const wrongAttempts = Math.max(
    0,
    Number(problem.wrongAttempts ?? problem.attempts ?? 0),
  );
  const solvedAtSeconds =
    problem.solvedAtSeconds != null
      ? Math.max(0, Number(problem.solvedAtSeconds))
      : undefined;
  return {
    contestId: Number(problem.contestId),
    index: String(problem.originalIndex ?? problem.index ?? ""),
    slot: String(problem.slot ?? problem.index ?? ""),
    name: String(problem.name ?? ""),
    rating: Number(problem.rating ?? 0),
    tags: Array.isArray(problem.tags) ? problem.tags.map(String) : [],
    solved,
    attempted: solved || wrongAttempts > 0 || problem.status === "attempted",
    state: solved ? "solved" : wrongAttempts > 0 ? "attempted" : "unsolved",
    wrongAttempts,
    ...(solvedAtSeconds !== undefined ? { solvedAtSeconds } : {}),
    verdictSource: "manual",
  };
}

function sourceProblems(history, legacy) {
  if (Array.isArray(history.problems) && history.problems.length) {
    return history.problems.map(problemOf);
  }
  const start = epochMs(legacy?.startTime);
  return (legacy?.problems ?? []).map((problem) => {
    const normalized = problemOf(problem);
    const solvedAt = epochMs(problem.solvedAt);
    if (
      normalized.solved &&
      normalized.solvedAtSeconds === undefined &&
      start != null &&
      solvedAt != null
    ) {
      normalized.solvedAtSeconds = Math.max(
        0,
        Math.round((solvedAt - start) / 1000),
      );
    }
    return normalized;
  });
}

function toRound(handle, history, legacy) {
  const sourceId = String(
    history.id ?? legacy?.contestId ?? legacy?.startTime ?? "",
  );
  if (!sourceId) throw new Error(`Legacy round for ${handle} has no stable id`);
  const durationSeconds = Math.max(
    0,
    Number(
      history.durationSeconds ??
        (legacy?.originalDuration ? legacy.originalDuration * 60 : 0),
    ),
  );
  const startedAt =
    epochMs(history.startedAt) ??
    epochMs(legacy?.startTime) ??
    epochMs(history.finishedAt) ??
    Date.now();
  const finishedAt =
    epochMs(history.finishedAt) ??
    epochMs(legacy?.date) ??
    startedAt + durationSeconds * 1000;
  const rawTimeTaken = Number(legacy?.timeTaken ?? 0);
  const effectiveElapsedSeconds =
    history.effectiveElapsedSeconds ??
    (rawTimeTaken > durationSeconds * 10
      ? Math.round(rawTimeTaken / 1000)
      : rawTimeTaken > 0
        ? Math.round(rawTimeTaken)
        : Math.max(0, Math.round((finishedAt - startedAt) / 1000)));
  const problems = sourceProblems(history, legacy);
  const solved =
    Number(history.solved) ||
    problems.filter((problem) => problem.solved).length;
  const total = Number(history.total) || problems.length;
  const wrongAttempts = problems.reduce(
    (sum, problem) => sum + problem.wrongAttempts,
    0,
  );
  const upsolveKeys = problems
    .filter((problem) => !problem.solved)
    .map((problem) => `${problem.contestId}-${problem.index}`);

  return {
    roundId: `trial-${sourceId}`,
    id: sourceId,
    legacySourceId: sourceId,
    name: String(history.name ?? legacy?.contestName ?? "Virtual contest"),
    division: divisionOf(history.division ?? legacy?.contestType),
    scoringMode: "cf",
    formatVariant: "legacy",
    source: "legacy",
    section: "first-time-trials",
    programSequence: null,
    cfHandleAtStart: handle,
    startedAt,
    finishedAt,
    archivedAt: finishedAt,
    durationSeconds,
    effectiveElapsedSeconds,
    pausedMsTotal: 0,
    finishReason: "manual",
    solved,
    total,
    points: Number(history.points ?? legacy?.totalScore ?? 0),
    maxPoints: undefined,
    penaltyMinutes: Number(
      history.penaltyMinutes ?? legacy?.totalPenalty ?? 0,
    ),
    wrongAttempts,
    upsolveKeys,
    schemaVersion: 2,
    problems,
  };
}

try {
  const appDb = appClient.db(APP_DB);
  const usersDb = userClient.db(USER_DB);
  const [legacyDocs, users] = await Promise.all([
    appDb.collection("contest_data").find({}).toArray(),
    usersDb
      .collection("users")
      .find(
        { cfHandle: { $type: "string" } },
        { projection: { cfHandle: 1 } },
      )
      .toArray(),
  ]);
  const usersByHandle = new Map();
  for (const user of users) {
    const key = user.cfHandle.trim().toLowerCase();
    const existing = usersByHandle.get(key) ?? [];
    existing.push(user);
    usersByHandle.set(key, existing);
  }

  const roundsCollection = appDb.collection("contest_rounds");
  let sourceCount = 0;
  let plannedCount = 0;
  let existingCount = 0;
  let quarantinedCount = 0;

  console.log(APPLY ? "APPLYING TRIAL MIGRATION\n" : "TRIAL MIGRATION DRY RUN\n");
  for (const doc of legacyDocs) {
    if (doc._id instanceof ObjectId) {
      quarantinedCount += 1;
      console.log(
        `contest_data/${doc._id.toHexString()} quarantined (unknown ObjectId owner)`,
      );
      continue;
    }
    const handle = String(doc._id).trim();
    const matchingUsers = usersByHandle.get(handle.toLowerCase()) ?? [];
    if (matchingUsers.length !== 1) {
      quarantinedCount += 1;
      console.log(
        `contest_data/${handle} quarantined (${matchingUsers.length ? "ambiguous" : "unknown"} account owner)`,
      );
      continue;
    }

    const history = Array.isArray(doc.history) ? doc.history : [];
    const past = Array.isArray(doc.pastContests) ? doc.pastContests : [];
    const byId = new Map(
      past.map((round) => [
        String(round.contestId ?? round.startTime ?? ""),
        round,
      ]),
    );
    const source = history.length
      ? history
      : past.map((round) => ({
          id: String(round.contestId ?? round.startTime ?? ""),
          name: round.contestName,
          division: round.contestType,
          finishedAt: epochMs(round.date),
          durationSeconds: Number(round.originalDuration ?? 0) * 60,
          solved: round.solvedCount,
          total: round.totalProblems,
          points: round.totalScore,
          penaltyMinutes: round.totalPenalty,
          problems: round.problems,
        }));
    const ownerId = matchingUsers[0]._id;
    const rounds = source.map((row) =>
      toRound(
        handle,
        row,
        byId.get(String(row.id)) ??
          past.find(
            (candidate) =>
              String(candidate.startTime ?? "") === String(row.id),
          ),
      ),
    );
    sourceCount += rounds.length;

    let insertedForHandle = 0;
    let existingForHandle = 0;
    for (const round of rounds) {
      const exists = await roundsCollection.findOne(
        { ownerId, roundId: round.roundId },
        { projection: { _id: 1 } },
      );
      if (exists) {
        existingForHandle += 1;
        existingCount += 1;
        continue;
      }
      insertedForHandle += 1;
      plannedCount += 1;
      if (APPLY) {
        await roundsCollection.updateOne(
          { ownerId, roundId: round.roundId },
          {
            $setOnInsert: {
              ...round,
              ownerId,
              migratedAt: new Date().toISOString(),
            },
          },
          { upsert: true },
        );
      }
    }
    console.log(
      `contest_data/${handle} source=${rounds.length} new=${insertedForHandle} existing=${existingForHandle} staleActive=${doc.activeContest || doc.active ? "left untouched" : "none"}`,
    );
  }

  if (APPLY) {
    await Promise.all([
      roundsCollection.createIndex(
        { ownerId: 1, roundId: 1 },
        { unique: true },
      ),
      roundsCollection.createIndex({
        ownerId: 1,
        section: 1,
        finishedAt: -1,
      }),
      roundsCollection.createIndex({ ownerId: 1, programSequence: -1 }),
    ]);
  }

  const migratedTotal = await roundsCollection.countDocuments({
    section: "first-time-trials",
    source: "legacy",
  });
  console.log(
    `\nsource=${sourceCount} planned=${plannedCount} alreadyPresent=${existingCount} quarantinedDocs=${quarantinedCount} databaseTrials=${migratedTotal}`,
  );
  console.log(
    APPLY
      ? "Migration complete. Legacy documents and stale active objects were not changed."
      : "Nothing written. Re-run with --apply after verifying the expected source count.",
  );
} finally {
  await Promise.all([appClient.close(), userClient.close()]);
}
