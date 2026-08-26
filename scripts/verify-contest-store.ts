import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import type {
  ContestRoundDoc,
  UpsolveEntry,
  VirtualContest,
} from "../lib/types";

const baseDb = process.env.DB_NAME || "skilltree";
const testDb = `${baseDb}_contest_verify_${Date.now()}`;
process.env.DB_NAME = testDb;

const userId = new ObjectId().toHexString();
const handle = `contest_verify_${Date.now()}`;

function active(id: string): VirtualContest {
  return {
    id,
    name: id,
    division: "div3",
    scoringMode: "icpc",
    formatVariant: "standard",
    cfHandleAtStart: handle,
    durationSeconds: 9_000,
    problems: [
      {
        contestId: 100,
        index: "A",
        slot: "A",
        name: "A",
        rating: 900,
        tags: [],
        points: 0,
      },
    ],
    createdAt: 1_000,
    startedAt: 1_000,
    pausedMs: 0,
    pausedAt: null,
    pauseSegments: [],
    finishedAt: 2_000,
    finishReason: "manual",
    states: {
      "100-A": {
        key: "100-A",
        state: "unsolved",
        wrongAttempts: 0,
      },
    },
  };
}

function round(id: string, finishedAt: number): ContestRoundDoc {
  return {
    roundId: id,
    id,
    name: id,
    division: "div3",
    scoringMode: "icpc",
    formatVariant: "standard",
    source: "virtual",
    section: "standard",
    programSequence: null,
    cfHandleAtStart: handle,
    startedAt: finishedAt - 1_000,
    finishedAt,
    archivedAt: finishedAt,
    durationSeconds: 9_000,
    effectiveElapsedSeconds: 1,
    pausedMsTotal: 0,
    finishReason: "manual",
    solved: 0,
    total: 1,
    points: 0,
    maxPoints: 0,
    penaltyMinutes: 0,
    wrongAttempts: 0,
    upsolveKeys: ["100-A"],
    schemaVersion: 2,
    problems: [
      {
        contestId: 100,
        index: "A",
        slot: "A",
        name: "A",
        rating: 900,
        tags: [],
        solved: false,
        attempted: false,
        state: "unsolved",
        wrongAttempts: 0,
      },
    ],
  };
}

const upsolve: UpsolveEntry[] = [
  {
    key: "100-A",
    contestId: 100,
    index: "A",
    name: "A",
    rating: 900,
    tags: [],
    source: "virtual",
    originRoundId: "round-1",
    addedAt: 2_000,
    attempts: 0,
    status: "open",
  },
];

async function main() {
  const {
    archiveContestRound,
    createContestActive,
    listContestRounds,
    readContestActive,
    readContestProgram,
    replaceContestActive,
  } = await import("../lib/contest-store");
  const { getAppClient, getAppDb } = await import("../lib/mongo");

  try {
  const created = await createContestActive(userId, handle, active("round-1"));
  assert.equal(created.version, 1);
  const updatedContest = {
    ...created.contest!,
    pausedAt: 1_500,
    pauseSegments: [{ from: 1_500, to: null }],
  };
  const updated = await replaceContestActive(userId, 1, updatedContest);
  assert.equal(updated.version, 2);
  await assert.rejects(
    () => replaceContestActive(userId, 1, updatedContest),
    /another tab/,
  );

  const first = await archiveContestRound({
    userId,
    handle,
    round: round("round-1", 2_000),
    upsolve,
    clearActiveRoundId: "round-1",
    clearActiveVersion: 2,
  });
  assert.equal(first.round.programSequence, 1);
  assert.equal(first.program.completedRounds, 1);
  assert.equal((await readContestActive(userId)).contest, null);

  const repeated = await archiveContestRound({
    userId,
    handle,
    round: round("round-1", 2_000),
    upsolve,
    clearActiveRoundId: "round-1",
    clearActiveVersion: 2,
  });
  assert.equal(repeated.program.completedRounds, 1);

  await createContestActive(userId, handle, active("round-2"));
  const second = await archiveContestRound({
    userId,
    handle,
    round: round("round-2", 3_000),
    upsolve,
    clearActiveRoundId: "round-2",
    clearActiveVersion: 1,
  });
  assert.equal(second.round.programSequence, 2);
  assert.equal((await readContestProgram(userId)).completedRounds, 2);

  const firstPage = await listContestRounds(userId, {
    section: "standard",
    limit: 1,
  });
  assert.equal(firstPage.total, 2);
  assert.equal(firstPage.rounds[0].roundId, "round-2");
  assert.ok(firstPage.nextCursor);
  const secondPage = await listContestRounds(userId, {
    section: "standard",
    limit: 1,
    cursor: firstPage.nextCursor,
  });
  assert.equal(secondPage.rounds[0].roundId, "round-1");
  assert.equal(secondPage.nextCursor, null);

  const db = await getAppDb();
  const upsolveDoc = await db.collection("upsolve_data").findOne({ _id: handle });
  assert.equal(upsolveDoc?.entries?.length, 1);
  console.log(
    "contest-store integration: version conflict, transaction, idempotency, sequencing, pagination and upsolve dedupe passed",
  );
  } finally {
    const client = await getAppClient();
    await client.db(testDb).dropDatabase();
    await client.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
