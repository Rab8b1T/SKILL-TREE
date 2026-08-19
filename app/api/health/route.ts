import { getAppDb, getUsersDb } from "@/lib/mongo";
import { json } from "@/lib/auth";

export async function GET() {
  const checks: Record<string, string> = {};

  for (const [name, fn] of [
    ["app", getAppDb],
    ["users", getUsersDb],
  ] as const) {
    try {
      const db = await fn();
      await db.command({ ping: 1 });
      checks[name] = "connected";
    } catch (err) {
      checks[name] = err instanceof Error ? `error: ${err.name}` : "error";
    }
  }

  const healthy = Object.values(checks).every((v) => v === "connected");
  return json(
    { status: healthy ? "healthy" : "degraded", databases: checks, version: "2.0.0" },
    healthy ? 200 : 503,
  );
}
