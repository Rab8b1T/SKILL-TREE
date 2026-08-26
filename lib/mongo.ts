import { MongoClient, Db, Collection, Document, ObjectId } from "mongodb";

/**
 * Two separate clusters, inherited from the previous deployment and kept as-is
 * so existing data stays reachable:
 *   MONGODB_URI      -> app data (contests, practice, upsolve)
 *   USER_MONGODB_URI -> accounts only
 */
const APP_DB = process.env.DB_NAME || "skilltree";
const USER_DB = process.env.USER_DB_NAME || "user";

declare global {
  var _stAppClient: Promise<MongoClient> | undefined;
  var _stUserClient: Promise<MongoClient> | undefined;
}

function connect(uri: string): Promise<MongoClient> {
  return new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
  }).connect();
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new HttpError(503, `${name} is not configured`);
  return value;
}

// Reused across hot reloads in dev and warm invocations on Vercel, so we don't
// open a new pool per request.
export function getAppClient(): Promise<MongoClient> {
  if (!global._stAppClient) {
    global._stAppClient = connect(requireEnv("MONGODB_URI"));
  }
  return global._stAppClient;
}

function userClient(): Promise<MongoClient> {
  if (!global._stUserClient) {
    global._stUserClient = connect(requireEnv("USER_MONGODB_URI"));
  }
  return global._stUserClient;
}

/**
 * Per-user documents are keyed by `_id = <codeforces handle>`, inherited from
 * the previous deployment so existing rows stay readable. `_id` is indexed by
 * Mongo already, so these collections need no extra indexes.
 */
export async function getAppDb(): Promise<Db> {
  return (await getAppClient()).db(APP_DB);
}

export async function getUsersDb(): Promise<Db> {
  return (await userClient()).db(USER_DB);
}

export async function appCollection<T extends Document = Document>(
  name: string,
): Promise<Collection<T>> {
  return (await getAppDb()).collection<T>(name);
}

export function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new HttpError(400, `Invalid id: ${id}`);
  return new ObjectId(id);
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
