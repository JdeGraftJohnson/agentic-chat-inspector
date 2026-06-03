import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AuditRecord } from "@/lib/equity-types";

export const runtime = "nodejs";
export const dynamic = "force-static";

let cache: { record: AuditRecord; loadedAt: number } | null = null;
const TTL_MS = 60_000;

async function loadFixture(): Promise<AuditRecord> {
  const path = resolve(process.cwd(), "public/demo/equity-audit.json");
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as AuditRecord;
}

export async function GET() {
  if (!cache || Date.now() - cache.loadedAt > TTL_MS) {
    const record = await loadFixture();
    cache = { record, loadedAt: Date.now() };
  }
  return Response.json(cache.record);
}
