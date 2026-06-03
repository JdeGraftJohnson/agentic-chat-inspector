import { mkdir, writeFile } from "node:fs/promises";
import { resolve, normalize, sep } from "node:path";
import { randomUUID } from "node:crypto";

export const SANDBOX_ROOT =
  process.env.DRAFT_ACTIONS_SANDBOX ?? "/tmp/agentic-chat-inspector/sandbox";

let activeRunDir: string | null = null;

export async function getRunDir(): Promise<string> {
  if (activeRunDir) return activeRunDir;
  const dir = resolve(SANDBOX_ROOT, randomUUID());
  await mkdir(dir, { recursive: true });
  activeRunDir = dir;
  return dir;
}

export async function writeUnderSandbox(
  relPath: string,
  contents: string,
): Promise<{ path: string; bytes: number }> {
  const runDir = await getRunDir();
  const candidate = resolve(runDir, normalize(relPath));
  if (!candidate.startsWith(runDir + sep) && candidate !== runDir) {
    throw new Error(
      `Path traversal blocked. '${relPath}' would resolve outside ${runDir}.`,
    );
  }
  await mkdir(resolve(candidate, ".."), { recursive: true });
  const buf = Buffer.from(contents, "utf8");
  await writeFile(candidate, buf);
  return { path: candidate, bytes: buf.byteLength };
}
