import assert from "node:assert/strict";
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI || !process.env.USER_MONGODB_URI) {
  throw new Error("MONGODB_URI and USER_MONGODB_URI are required");
}
const appClient = await new MongoClient(process.env.MONGODB_URI).connect();
const userClient = await new MongoClient(process.env.USER_MONGODB_URI).connect();

try {
  const appDb = appClient.db(process.env.DB_NAME || "skilltree");
  const userDb = userClient.db(process.env.USER_DB_NAME || "user");
  const source = await appDb.collection("contest_data").findOne({
    $or: [{ history: { $size: 12 } }, { pastContests: { $size: 12 } }],
  });
  assert.ok(source, "Expected one 12-round legacy source");
  const handle = String(source._id);
  const user = await userDb.collection("users").findOne({
    cfHandle: { $regex: `^${handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });
  assert.ok(user, `No account owns ${handle}`);

  const trials = await appDb
    .collection("contest_rounds")
    .find({
      ownerId: user._id,
      section: "first-time-trials",
      source: "legacy",
    })
    .toArray();
  assert.equal(trials.length, 12, "Expected exactly 12 migrated trial rounds");
  assert.equal(new Set(trials.map((round) => round.roundId)).size, 12);
  for (const round of trials) {
    assert.equal(round.programSequence, null);
    assert.match(round.roundId, /^trial-/);
    assert.ok(round.id);
    assert.ok(Number.isFinite(round.finishedAt));
    assert.ok(Array.isArray(round.problems));
    for (const problem of round.problems) {
      assert.ok(Number.isFinite(problem.contestId));
      assert.ok(problem.index);
    }
  }

  const standardCount = await appDb.collection("contest_rounds").countDocuments({
    ownerId: user._id,
    section: "standard",
  });
  const program = await appDb
    .collection("contest_program")
    .findOne({ _id: user._id });
  assert.equal(
    program?.completedRounds ?? 0,
    standardCount,
    "Trial migration changed the 200-contest counter",
  );
  assert.equal(source.history?.length ?? 0, 12, "Legacy history was changed");
  assert.equal(
    source.pastContests?.length ?? 0,
    12,
    "Legacy pastContests was changed",
  );

  console.log(
    `contest migration verification: 12 trials, ${standardCount} counted rounds, legacy history intact`,
  );
} finally {
  await Promise.all([appClient.close(), userClient.close()]);
}
