import { convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import {
  PROVIDERS,
  DEFAULT_PROVIDER,
  isProviderId,
  isSubscriptionProvider,
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
import {
  runClaudeSubscriptionStream,
  subscriptionAvailable,
} from "@/lib/claude-subscription";

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
  const system = await getActiveSystemPrompt();

  if (isSubscriptionProvider(requestedProvider)) {
    const avail = subscriptionAvailable();
    if (!avail.available) {
      return new Response(
        JSON.stringify({ error: avail.reason }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }
    return runClaudeSubscriptionStream({
      messages: body.messages ?? [],
      system: system.text,
      systemPromptVersion: system.version,
    });
  }

  if (!providerHasKey(requestedProvider)) {
    return new Response(
      JSON.stringify({
        error: `Missing ${entry.envKey} env var. Set it in .env.local and restart dev. (Operator path: switch to provider 'claude-subscription' to use Claude Code subscription auth — no API key required.)`,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const mcp = await connectAllMCP();
  const onlineServerNames = mcp.servers.map((s) => s.name).join(", ") || "none";
  const buildModel = entry.build;
  if (!buildModel) {
    throw new Error(`Provider ${entry.id} has no build() function.`);
  }

  const result = tracedStreamText({
    model: buildModel(),
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

      const verdict = scoreToolCallsForLeakage(
        (toolCalls ?? []).map((tc) => ({
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          args: tc.input,
        })),
      );

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
