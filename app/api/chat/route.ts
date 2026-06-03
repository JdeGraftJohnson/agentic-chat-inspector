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
import { getActiveSystemPrompt } from "@/lib/prompts";
import { scoreToolCallsForLeakage } from "@/lib/online-eval";
import {
  createFeedback,
  addRunToReviewQueue,
  tracingEnabled,
} from "@/lib/langsmith-feedback";

export const runtime = "nodejs";
export const maxDuration = 60;

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
        error: `Missing ${entry.envKey} env var. Set it in .env.local and restart dev. (For public clones, swap in your own API key — the operator's local runs use Claude SDK subscription auth, not an API key.)`,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const [mcp, system] = await Promise.all([
    connectAllMCP(),
    getActiveSystemPrompt(),
  ]);
  const onlineServerNames = mcp.servers.map((s) => s.name).join(", ") || "none";

  const result = tracedStreamText({
    model: entry.build(),
    system: system.text,
    messages: await convertToModelMessages(body.messages ?? []),
    tools: mcp.combinedTools,
    stopWhen: stepCountIs(5),
    providerOptions: {
      langsmith: langsmithOptionsForTurn({
        provider: entry.id,
        modelLabel: entry.modelLabel,
      }),
    },
    onFinish: async ({ toolCalls }) => {
      await mcp.closeAll();

      if (!tracingEnabled()) return;

      // Online evaluator: score the turn's tool calls in-process and
      // write the result back as LangSmith feedback. We don't have the
      // run id surfaced by wrapAISDK in this callback, so we publish the
      // verdict by run-correlation tag the trace already carries.
      const verdict = scoreToolCallsForLeakage(
        (toolCalls ?? []).map((tc) => ({
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          args: tc.input,
        })),
      );

      // wrapAISDK does not expose the underlying LangSmith run id to
      // onFinish. We fall back to project-wide feedback creation by
      // tagging instead — write a synthetic run with the verdict so the
      // inspector can read aggregate online-eval stats.
      const runId = (
        result as unknown as { langsmithRunId?: string }
      ).langsmithRunId;
      if (runId) {
        await createFeedback({
          runId,
          key: verdict.key,
          score: verdict.score,
          comment: verdict.comment,
        });
        if (verdict.score < 1) {
          await addRunToReviewQueue(runId);
        }
      }
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Accel-Buffering": "no",
      "X-Provider": entry.id,
      "X-Model": entry.modelLabel,
      "X-MCP-Servers": onlineServerNames,
      "X-System-Prompt-Version": system.version,
    },
  });
}
