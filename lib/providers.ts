import { anthropic } from "@ai-sdk/anthropic";
import { openai, createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type ProviderId =
  | "anthropic"
  | "openai"
  | "together"
  | "claude-subscription";

export type ProviderEntry = {
  id: ProviderId;
  label: string;
  modelLabel: string;
  envKey: string | null;
  build: (() => LanguageModel) | null;
  kind: "api-key" | "subscription";
  note?: string;
};

const together = createOpenAI({
  name: "together",
  apiKey: process.env.TOGETHER_API_KEY ?? "",
  baseURL: "https://api.together.xyz/v1",
});

export const PROVIDERS: Record<ProviderId, ProviderEntry> = {
  "claude-subscription": {
    id: "claude-subscription",
    label: "Claude (subscription)",
    modelLabel: "Claude Sonnet 4.6 · subscription auth",
    envKey: null,
    build: null,
    kind: "subscription",
    note: "Runs via @anthropic-ai/claude-agent-sdk using the local claude CLI subscription. No API key required. Local dev only — Vercel serverless does not have the CLI.",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    modelLabel: "Claude Sonnet 4.6",
    envKey: "ANTHROPIC_API_KEY",
    build: () => anthropic("claude-sonnet-4-6"),
    kind: "api-key",
    note: "Public-clone path. Drop your own ANTHROPIC_API_KEY in .env.local to use.",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    modelLabel: "GPT-4o",
    envKey: "OPENAI_API_KEY",
    build: () => openai("gpt-4o"),
    kind: "api-key",
  },
  together: {
    id: "together",
    label: "Together",
    modelLabel: "Llama 3.3 70B Instruct Turbo",
    envKey: "TOGETHER_API_KEY",
    build: () => together("meta-llama/Llama-3.3-70B-Instruct-Turbo"),
    kind: "api-key",
  },
};

export const DEFAULT_PROVIDER: ProviderId = "claude-subscription";

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value in PROVIDERS;
}

export function isSubscriptionProvider(id: ProviderId): boolean {
  return PROVIDERS[id].kind === "subscription";
}

export function providerHasKey(id: ProviderId): boolean {
  const entry = PROVIDERS[id];
  if (entry.kind === "subscription") return true;
  if (!entry.envKey) return false;
  return Boolean(process.env[entry.envKey]);
}
