// Reproduce lib/program-server.ts loadProgram() offline, so an authored plan is
// checked against the app's own schema and digest before it is pushed.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { canonicalJson, parseProgram } from "../lib/program.ts";

const target = process.argv[2] ?? path.join(process.cwd(), "data/coach/program.json");
const raw = JSON.parse(await readFile(target, "utf8"));

let program;
try {
  program = parseProgram(raw);
} catch (err) {
  console.error(`FAIL parseProgram: ${target}`);
  console.error(JSON.stringify((err as { issues?: unknown }).issues ?? String(err), null, 2));
  process.exit(1);
}

const payload = { ...(raw as Record<string, unknown>) };
delete payload.contentHash;
const digest = createHash("sha256").update(canonicalJson(payload)).digest("hex");
if (program.contentHash !== digest) {
  console.error(`FAIL contentHash: authored ${program.contentHash} but canonical digest is ${digest}`);
  process.exit(1);
}

console.log(`OK ${target}`);
console.log(`   program ${program.programId} v${program.planVersion}, days ${program.days.map(d => d.programDay).join(", ")}`);
