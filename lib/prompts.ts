import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type PromptVersion = "v1" | "v2";

const PROMPT_FILE: Record<PromptVersion, string> = {
  v1: "prompts/system_v1.md",
  v2: "prompts/system_v2.md",
};

let cache: { version: PromptVersion; text: string; loadedAt: number } | null =
  null;

const TTL_MS = 5 * 60 * 1000;

export const ACTIVE_PROMPT_VERSION: PromptVersion =
  (process.env.SYSTEM_PROMPT_VERSION as PromptVersion | undefined) ?? "v2";

async function readLocal(version: PromptVersion): Promise<string> {
  const path = resolve(process.cwd(), PROMPT_FILE[version]);
  return (await readFile(path, "utf8")).trim();
}

export async function getActiveSystemPrompt(): Promise<{
  version: PromptVersion;
  text: string;
  source: "cache" | "file";
}> {
  const now = Date.now();
  if (cache && cache.version === ACTIVE_PROMPT_VERSION && now - cache.loadedAt < TTL_MS) {
    return { version: cache.version, text: cache.text, source: "cache" };
  }
  const text = await readLocal(ACTIVE_PROMPT_VERSION);
  cache = { version: ACTIVE_PROMPT_VERSION, text, loadedAt: now };
  return { version: ACTIVE_PROMPT_VERSION, text, source: "file" };
}
