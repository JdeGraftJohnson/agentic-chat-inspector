import { anthropic } from "@ai-sdk/anthropic";
import { openai, createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type ProviderId = "anthropic" | "openai" | "together";

export type ProviderEntry = {
  id: ProviderId;
  label: string;
  modelLabel: string;
  envKey: string;
  build: () => LanguageModel;
};

const together = createOpenAI({
  name: "together",
  apiKey: process.env.TOGETHER_API_KEY ?? "",
  baseURL: "https://api.together.xyz/v1",
});

export const PROVIDERS: Record<ProviderId, ProviderEntry> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    modelLabel: "Claude Sonnet 4.6",
    envKey: "ANTHROPIC_API_KEY",
    build: () => anthropic("claude-sonnet-4-6"),
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    modelLabel: "GPT-4o",
    envKey: "OPENAI_API_KEY",
    build: () => openai("gpt-4o"),
  },
  together: {
    id: "together",
    label: "Together",
    modelLabel: "Llama 3.3 70B Instruct Turbo",
    envKey: "TOGETHER_API_KEY",
    build: () => together("meta-llama/Llama-3.3-70B-Instruct-Turbo"),
  },
};

export const DEFAULT_PROVIDER: ProviderId = "anthropic";

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value in PROVIDERS;
}

export function providerHasKey(id: ProviderId): boolean {
  return Boolean(process.env[PROVIDERS[id].envKey]);
}
