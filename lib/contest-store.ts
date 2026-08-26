import "server-only";

import type { Document, ObjectId } from "mongodb";
import { getAppClient, getAppDb, HttpError, toObjectId } from "./mongo";
import type {
  ContestActiveDoc,
  ContestProgramDoc,
  ContestRoundDoc,
  ContestRoundsPage,
  UpsolveEntry,
  VirtualContest,
} from "./types";
import type { RunDoc } from "./coach";

interface StoredActive extends Document {
  _id: ObjectId;
  contest: VirtualContest;
  version: number;
  handleAtStart: string;
  savedAt: string;
}

interface StoredRound extends Document, Omit<ContestRoundDoc, "ownerId"> {
  ownerId: ObjectId;
}

interface StoredProgram extends Document {
  _id: ObjectId;
  targetRounds: number;
  completedRounds: number;
  createdAt: string;
  updatedAt: string;
}

declare global {
  var _stContestIndexes: Promise<void> | undefined;
}

export function ensureContestIndexes(): Promise<void> {
  if (!global._stContestIndexes) {
    global._stContestIndexes = (async () => {
      const db = await getAppDb();
      const rounds = db.collection<StoredRound>("contest_rounds");
      await Promise.all([
        rounds.createIndex({ ownerId: 1, roundId: 1 }, { unique: true }),
        rounds.createIndex({ ownerId: 1, section: 1, finishedAt: -1 }),
        rounds.createIndex({ ownerId: 1, programSequence: -1 }),
        rounds.createIndex({ ownerId: 1, source: 1, finishedAt: -1 }),
        rounds.createIndex({ ownerId: 1, "problems.contestId": 1, "problems.index": 1 }),
      ]);
    })().catch((error) => {
      global._stContestIndexes = undefined;
      throw error;
    });
  }
  return global._stContestIndexes;
}

function serializeRound(row: StoredRound): ContestRoundDoc {
  const { _id, ownerId, ...round } = row;
  void _id;
  return { ...round, ownerId: ownerId.toHexString() };
}

export async function readContestActive(userId: string): Promise<ContestActiveDoc> {
  const ownerId = toObjectId(userId);
  const db = await getAppDb();
  const row = await db.collection<StoredActive>("contest_active").findOne({ _id: ownerId });
  if (!row) return { contest: null, version: 0, savedAt: null };
  return { contest: row.contest, version: row.version, savedAt: row.savedAt };
}

export async function createContestActive(
  userId: string,
  handle: string,
  contest: VirtualContest,
): Promise<ContestActiveDoc> {
  await ensureContestIndexes();
  const ownerId = toObjectId(userId);
  const savedAt = new Date().toISOString();
  const row: StoredActive = {
    _id: ownerId,
    contest,
    version: 1,
    handleAtStart: handle,
    savedAt,
  };

  try {
    await (await getAppDb()).collection<StoredActive>("contest_active").insertOne(row);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new HttpError(409, "Finish or archive the active contest first");
    }
    throw error;
  }

  return { contest, version: 1, savedAt };
}

export async function replaceContestActive(
  userId: string,
  expectedVersion: number,
  contest: VirtualContest,
): Promise<ContestActiveDoc> {
  const ownerId = toObjectId(userId);
  const savedAt = new Date().toISOString();
  const col = (await getAppDb()).collection<StoredActive>("contest_active");
  const updated = await col.findOneAndUpdate(
    { _id: ownerId, version: expectedVersion },
    { $set: { contest, savedAt }, $inc: { version: 1 } },
    { returnDocument: "after" },
  );
  if (!updated) {
    const current = await col.findOne({ _id: ownerId });
    throw new HttpError(
      409,
      current
        ? "Contest changed in another tab; reload to continue safely"
        : "The active contest no longer exists",
    );
  }
  return {
    contest: updated.contest,
    version: updated.version,
    savedAt: updated.savedAt,
  };
}

function encodeCursor(finishedAt: number, roundId: string): string {
  return Buffer.from(JSON.stringify([finishedAt, roundId])).toString("base64url");
}

function decodeCursor(value: string | null): [number, string] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      Array.isArray(parsed) &&
      Number.isFinite(parsed[0]) &&
      typeof parsed[1] === "string"
    ) {
      return [parsed[0], parsed[1]];
    }
  } catch {
    // Invalid cursors are client errors, not empty pages.
  }
  throw new HttpError(400, "Invalid history cursor");
}

export async function listContestRounds(
  userId: string,
  options: {
    section?: "standard" | "first-time-trials";
    source?: "virtual" | "coach" | "legacy";
    cursor?: string | null;
    limit?: number;
  } = {},
): Promise<ContestRoundsPage> {
  await ensureContestIndexes();
  const ownerId = toObjectId(userId);
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  const cursor = decodeCursor(options.cursor ?? null);
  const baseFilter: Document = { ownerId };
  if (options.section) baseFilter.section = options.section;
  if (options.source) baseFilter.source = options.source;
  const filter: Document = { ...baseFilter };
  if (cursor) {
    filter.$or = [
      { finishedAt: { $lt: cursor[0] } },
      { finishedAt: cursor[0], roundId: { $lt: cursor[1] } },
    ];
  }

  const collection = (await getAppDb()).collection<StoredRound>("contest_rounds");
  const [rows, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ finishedAt: -1, roundId: -1 })
      .limit(limit + 1)
      .toArray(),
    collection.countDocuments(baseFilter),
  ]);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    rounds: page.map(serializeRound),
    nextCursor:
      hasMore && last ? encodeCursor(last.finishedAt, last.roundId) : null,
    total,
  };
}

export async function readContestRound(
  userId: string,
  roundId: string,
): Promise<ContestRoundDoc | null> {
  const ownerId = toObjectId(userId);
  const row = await (await getAppDb())
    .collection<StoredRound>("contest_rounds")
    .findOne({ ownerId, roundId });
  return row ? serializeRound(row) : null;
}

export async function readAllContestRounds(
  userId: string,
  section: "standard" | "first-time-trials" = "standard",
): Promise<ContestRoundDoc[]> {
  await ensureContestIndexes();
  const ownerId = toObjectId(userId);
  const rows = await (await getAppDb())
    .collection<StoredRound>("contest_rounds")
    .find({ ownerId, section })
    .sort({ programSequence: 1, finishedAt: 1 })
    .toArray();
  return rows.map(serializeRound);
}

export async function usedContestProblemKeys(userId: string): Promise<Set<string>> {
  const ownerId = toObjectId(userId);
  const rows = await (await getAppDb())
    .collection<StoredRound>("contest_rounds")
    .find(
      { ownerId, section: "standard" },
      { projection: { problems: 1 } },
    )
    .toArray();
  const keys = new Set<string>();
  for (const row of rows) {
    for (const problem of row.problems ?? []) {
      keys.add(`${problem.contestId}-${problem.index}`);
    }
  }
  return keys;
}

export async function readContestProgram(userId: string): Promise<ContestProgramDoc> {
  const ownerId = toObjectId(userId);
  const row = await (await getAppDb())
    .collection<StoredProgram>("contest_program")
    .findOne({ _id: ownerId });
  return {
    targetRounds: row?.targetRounds ?? 200,
    completedRounds: row?.completedRounds ?? 0,
    createdAt: row?.createdAt ?? null,
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function archiveContestRound(input: {
  userId: string;
  handle: string;
  round: ContestRoundDoc;
  upsolve: UpsolveEntry[];
  clearActiveRoundId?: string;
  clearActiveVersion?: number;
  arenaRun?: RunDoc;
}): Promise<{ round: ContestRoundDoc; program: ContestProgramDoc }> {
  await ensureContestIndexes();
  const ownerId = toObjectId(input.userId);
  const client = await getAppClient();
  const db = await getAppDb();
  const session = client.startSession();

  try {
    return await session.withTransaction(async () => {
      const rounds = db.collection<StoredRound>("contest_rounds");
      const now = new Date().toISOString();
      if (input.arenaRun) {
        await db.collection("arena_data").updateOne(
          { _id: input.handle as never },
          {
            $set: {
              [`runs.${input.arenaRun.id}`]: input.arenaRun,
              userId: input.userId,
              savedAt: now,
            },
          },
          { upsert: true, session },
        );
      }
      const existing = await rounds.findOne(
        { ownerId, roundId: input.round.roundId },
        { session },
      );
      if (existing) {
        const program = await db
          .collection<StoredProgram>("contest_program")
          .findOne({ _id: ownerId }, { session });
        return {
          round: serializeRound(existing),
          program: {
            targetRounds: program?.targetRounds ?? 200,
            completedRounds: program?.completedRounds ?? 0,
            createdAt: program?.createdAt ?? null,
            updatedAt: program?.updatedAt ?? null,
          },
        };
      }

      let programSequence: number | null = null;
      let program: StoredProgram | null = null;
      if (input.round.section === "standard") {
        program = await db.collection<StoredProgram>("contest_program").findOneAndUpdate(
          { _id: ownerId },
          {
            $setOnInsert: {
              targetRounds: 200,
              createdAt: now,
            },
            $set: { updatedAt: now },
            $inc: { completedRounds: 1 },
          },
          { upsert: true, returnDocument: "after", session },
        );
        programSequence = program?.completedRounds ?? 1;
      }

      const stored: StoredRound = {
        ...input.round,
        ownerId,
        programSequence,
      };
      await rounds.insertOne(stored, { session });

      if (input.clearActiveRoundId) {
        const removed = await db.collection<StoredActive>("contest_active").deleteOne(
          {
            _id: ownerId,
            "contest.id": input.clearActiveRoundId,
            ...(input.clearActiveVersion !== undefined
              ? { version: input.clearActiveVersion }
              : {}),
          },
          { session },
        );
        if (!removed.deletedCount) {
          throw new HttpError(
            409,
            "Contest changed in another tab; reload before archiving",
          );
        }
      }

      if (input.upsolve.length) {
        const upsolve = db.collection("upsolve_data");
        const current = await upsolve.findOne(
          { _id: input.handle as never },
          { projection: { entries: 1 }, session },
        );
        const known = new Set(
          ((current?.entries as UpsolveEntry[] | undefined) ?? []).map(
            (entry) => entry.key,
          ),
        );
        const additions = input.upsolve.filter((entry) => !known.has(entry.key));
        if (additions.length) {
          await upsolve.updateOne(
            { _id: input.handle as never },
            {
              $push: {
                entries: {
                  $each: additions,
                  $position: 0,
                } as never,
              },
              $set: {
                userId: input.userId,
                savedAt: now,
              },
            },
            { upsert: true, session },
          );
        }
      }

      return {
        round: { ...input.round, programSequence, ownerId: input.userId },
        program: {
          targetRounds: program?.targetRounds ?? 200,
          completedRounds: program?.completedRounds ?? 0,
          createdAt: program?.createdAt ?? null,
          updatedAt: program?.updatedAt ?? null,
        },
      };
    });
  } finally {
    await session.endSession();
  }
}
