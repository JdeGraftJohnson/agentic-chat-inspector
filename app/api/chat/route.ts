import { convertToModelMessages, type UIMessage } from "ai";
import {
  PROVIDERS,
  DEFAULT_PROVIDER,
  isProviderId,
  providerHasKey,
} from "@/lib/providers";
import {
  tracedStreamText,
  langsmithOptionsForTurn,
} from "@/lib/langsmith";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = [
  "You are the Agentic Chat Inspector — a public demo that proves John de Graft-Johnson can ship LangSmith-instrumented agentic chat in Next.js 16 with MCP-shaped tool surfaces.",
  "",
  "Be concise. Cite sources when you have them. If you would call a tool that is not yet wired in this milestone, say so plainly rather than fabricating a tool result.",
  "",
  "The user can see your trace in LangSmith. Be honest about uncertainty.",
].join("\n");

type ChatRequestBody = {
  messages: UIMessage[];
  provider?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequestBody;

  const requestedProvider = isProviderId(body.provider)
    ? body.provider
    : DEFAULT_PROVIDER;

  const entry = PROVIDERS[requestedProvider];
  if (!providerHasKey(requestedProvider)) {
    return new Response(
      JSON.stringify({
        error: `Missing ${entry.envKey} env var. Set it in .env.local and restart dev.`,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const result = tracedStreamText({
    model: entry.build(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(body.messages ?? []),
    providerOptions: {
      langsmith: langsmithOptionsForTurn({
        provider: entry.id,
        modelLabel: entry.modelLabel,
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Accel-Buffering": "no",
      "X-Provider": entry.id,
      "X-Model": entry.modelLabel,
    },
  });
}
