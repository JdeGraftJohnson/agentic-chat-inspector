import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { headers } from "next/headers";

export type ConnectedMCP = {
  client: MCPClient;
  tools: Awaited<ReturnType<MCPClient["tools"]>>;
  serverName: string;
  serverUrl: string;
};

async function resolveBaseUrl(): Promise<string> {
  const hdrs = await headers();
  const host = hdrs.get("host");
  if (!host) {
    return process.env.MCP_BASE_URL ?? "http://localhost:3000";
  }
  const proto =
    hdrs.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

export async function connectClinicalRagMCP(): Promise<ConnectedMCP> {
  const base = await resolveBaseUrl();
  const url = `${base}/api/mcp/clinical-rag`;

  const client = await createMCPClient({
    transport: { type: "http", url },
  });

  const tools = await client.tools();
  return {
    client,
    tools,
    serverName: "clinical-rag-mcp",
    serverUrl: url,
  };
}
