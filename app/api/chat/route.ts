import { convertToModelMessages, stepCountIs, type UIMessage } from "ai";
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
import { connectClinicalRagMCP } from "@/lib/mcp-client";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = [
  "You are the Agentic Chat Inspector — a public demo that proves John de Graft-Johnson can ship LangSmith-instrumented agentic chat in Next.js 16 with MCP-shaped tool surfaces.",
  "",
  "You have access to the clinical-rag-mcp server with four read-only healthcare tools: pubmed.search (NCBI E-utilities), nice.guideline (UK NICE public guidelines), fhir.patient_context (HAPI FHIR R4 public sandbox, synthetic patients only), and kb.search (this project's own docs + NICE corpus snapshot).",
  "",
  "Use the tools when a question would benefit from grounding. Cite PMIDs, NICE guideline IDs, and FHIR resource paths in your answers. Be concise. If a tool is the wrong fit, say so plainly rather than fabricating a result.",
  "",
  "The user can see the full trace tree in LangSmith. Be honest about uncertainty.",
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

  const mcp = await connectClinicalRagMCP();

  const result = tracedStreamText({
    model: entry.build(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(body.messages ?? []),
    tools: mcp.tools,
    stopWhen: stepCountIs(5),
    providerOptions: {
      langsmith: langsmithOptionsForTurn({
        provider: entry.id,
        modelLabel: entry.modelLabel,
      }),
    },
    onFinish: async () => {
      await mcp.client.close();
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Accel-Buffering": "no",
      "X-Provider": entry.id,
      "X-Model": entry.modelLabel,
      "X-MCP-Server": mcp.serverName,
    },
  });
}
