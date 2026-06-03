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
import { connectAllMCP } from "@/lib/mcp-client";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = [
  "You are the Agentic Chat Inspector — a public demo that proves John de Graft-Johnson can ship LangSmith-instrumented agentic chat in Next.js 16 with MCP-shaped tool surfaces.",
  "",
  "Two MCP servers are connected:",
  "- clinical-rag-mcp (read): pubmed.search, nice.guideline, fhir.patient_context (HAPI FHIR R4 sandbox, synthetic patients only), kb.search (this project's docs).",
  "- draft-actions-mcp (simulated write): email.draft, file.write (sandboxed to /tmp), calendar.draft (returns ICS).",
  "",
  "Use read tools to ground your answers with PMIDs, NICE IDs, FHIR resource paths. Use write tools when the user explicitly asks to draft / write / save / schedule something — and always state plainly that writes are simulated and stay in a sandbox.",
  "",
  "Be concise. If a tool is the wrong fit, say so rather than fabricating a result. The user can see the full trace tree in LangSmith.",
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

  const mcp = await connectAllMCP();
  const onlineServerNames = mcp.servers.map((s) => s.name).join(", ") || "none";

  const result = tracedStreamText({
    model: entry.build(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(body.messages ?? []),
    tools: mcp.combinedTools,
    stopWhen: stepCountIs(5),
    providerOptions: {
      langsmith: langsmithOptionsForTurn({
        provider: entry.id,
        modelLabel: entry.modelLabel,
      }),
    },
    onFinish: async () => {
      await mcp.closeAll();
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Accel-Buffering": "no",
      "X-Provider": entry.id,
      "X-Model": entry.modelLabel,
      "X-MCP-Servers": onlineServerNames,
    },
  });
}
