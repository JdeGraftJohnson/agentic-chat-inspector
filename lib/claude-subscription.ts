/**
 * Operator-only chat path that runs the Claude Agent SDK against the local
 * Claude Code subscription. No ANTHROPIC_API_KEY required.
 *
 * The SDK owns the agent loop. We pass our MCP servers (clinical-rag-mcp,
 * draft-actions-mcp) via HTTP transport so the SDK calls them natively,
 * then we bridge its SDKMessage event stream into the AI SDK's
 * UIMessageStream shape so the existing /chat UI keeps working unchanged.
 *
 * IMPORTANT: only runs in environments where the `claude` CLI is logged
 * in (i.e. the operator's machine). On Vercel serverless the CLI is not
 * present — the route guards against that.
 */
import { headers } from "next/headers";
import {
  query,
  type SDKMessage,
  type McpServerConfig,
} from "@anthropic-ai/claude-agent-sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { traceable } from "langsmith/traceable";
import { LANGSMITH_PROJECT } from "@/lib/langsmith";

export const CLAUDE_SUBSCRIPTION_MODEL = "claude-sonnet-4-6";

export type SubscriptionInput = {
  messages: UIMessage[];
  system: string;
  systemPromptVersion: string;
};

function extractLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    return m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");
  }
  return "";
}

async function buildMcpServers(): Promise<Record<string, McpServerConfig>> {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const base = `${proto}://${host}`;
  return {
    "clinical-rag-mcp": {
      type: "http",
      url: `${base}/api/mcp/clinical-rag`,
    },
    "draft-actions-mcp": {
      type: "http",
      url: `${base}/api/mcp/draft-actions`,
    },
  };
}

async function runQuery(input: SubscriptionInput) {
  const prompt = extractLastUserText(input.messages);
  if (!prompt) {
    throw new Error("No user text in conversation.");
  }
  const mcpServers = await buildMcpServers();

  // Lock the agent to MCP-only. Claude Code's built-in tools (Bash, Read,
  // Edit, ToolSearch, etc.) must not leak into a recruiter-facing demo.
  const mcpAllowedTools = Object.keys(mcpServers).flatMap((server) => [
    `mcp__${server}`,
  ]);

  return query({
    prompt,
    options: {
      systemPrompt: input.system,
      mcpServers,
      model: CLAUDE_SUBSCRIPTION_MODEL,
      maxTurns: 5,
      allowedTools: mcpAllowedTools,
      settingSources: [],
    },
  });
}

const tracedRunQuery = traceable(runQuery, {
  name: "claude-subscription.chat",
  run_type: "chain",
  project_name: LANGSMITH_PROJECT,
  tags: ["claude-subscription", "agentic-chat-inspector"],
});

export type SubscriptionResult = {
  text: string;
  toolCalls: { name: string; args: unknown; toolCallId: string }[];
};

export function runClaudeSubscriptionStream(
  input: SubscriptionInput,
): Response {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const messageId = crypto.randomUUID();
      writer.write({ type: "start", messageId });

      const textPartId = crypto.randomUUID();
      writer.write({ type: "text-start", id: textPartId });

      const iter = (await tracedRunQuery(input)) as AsyncIterable<SDKMessage>;

      let aggregatedText = "";
      const toolCalls: SubscriptionResult["toolCalls"] = [];

      const emittedToolCallIds = new Set<string>();

      for await (const msg of iter) {
        if (msg.type === "stream_event") {
          const event = msg.event;
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const delta = event.delta.text;
            aggregatedText += delta;
            writer.write({
              type: "text-delta",
              id: textPartId,
              delta,
            });
          }
        } else if (msg.type === "assistant") {
          // SDK consolidates a turn — extract text from any text blocks we
          // missed during stream_event (some events arrive only here when
          // partial streaming is disabled by Claude Code config), and
          // record tool_use blocks for the UI + later evaluator pass.
          const content = msg.message?.content ?? [];
          for (const block of content) {
            if (block.type === "text" && aggregatedText === "") {
              const text = block.text ?? "";
              if (text) {
                aggregatedText += text;
                writer.write({
                  type: "text-delta",
                  id: textPartId,
                  delta: text,
                });
              }
            } else if (block.type === "tool_use") {
              const toolCallId = block.id;
              if (emittedToolCallIds.has(toolCallId)) continue;
              emittedToolCallIds.add(toolCallId);
              const name = block.name;
              const args = block.input;
              toolCalls.push({ name, args, toolCallId });
              writer.write({
                type: "tool-input-available",
                toolCallId,
                toolName: name,
                input: args,
              });
            }
          }
        } else if (msg.type === "result") {
          break;
        }
      }

      writer.write({ type: "text-end", id: textPartId });
      writer.write({ type: "finish" });

      void aggregatedText;
      void toolCalls;
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      "X-Accel-Buffering": "no",
      "X-Provider": "claude-subscription",
      "X-Model": CLAUDE_SUBSCRIPTION_MODEL,
    },
  });
}

export function subscriptionAvailable(): {
  available: boolean;
  reason?: string;
} {
  if (process.env.VERCEL) {
    return {
      available: false,
      reason:
        "Claude Code subscription auth is unavailable on Vercel serverless — no claude CLI present. Use anthropic / openai / together with an API key, or run this provider against `npm run dev` locally where you are logged into Claude Code.",
    };
  }
  return { available: true };
}
