import * as ai from "ai";
import {
  wrapAISDK,
  createLangSmithProviderOptions,
} from "langsmith/experimental/vercel";

export const LANGSMITH_PROJECT =
  process.env.LANGSMITH_PROJECT ?? "agentic-chat-inspector";

export const LANGSMITH_TRACING_ENABLED =
  process.env.LANGSMITH_TRACING === "true" &&
  Boolean(process.env.LANGSMITH_API_KEY);

const wrapped = wrapAISDK(ai, {
  project_name: LANGSMITH_PROJECT,
  tags: ["agentic-chat-inspector", "m1-streaming-chat"],
});

export const tracedStreamText = wrapped.streamText;
export const tracedGenerateText = wrapped.generateText;

export function langsmithOptionsForTurn(meta: {
  provider: string;
  modelLabel: string;
}) {
  return createLangSmithProviderOptions<typeof ai.streamText>({
    metadata: {
      provider: meta.provider,
      model_label: meta.modelLabel,
      surface: "chat",
    },
    tags: [`provider:${meta.provider}`],
  });
}
