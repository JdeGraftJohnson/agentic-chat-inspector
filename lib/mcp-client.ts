import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";
import { headers } from "next/headers";

export type McpServerKey = "clinical-rag" | "draft-actions";

export const MCP_SERVER_CATALOG: Record<
  McpServerKey,
  { name: string; routePath: string }
> = {
  "clinical-rag": {
    name: "clinical-rag-mcp",
    routePath: "/api/mcp/clinical-rag",
  },
  "draft-actions": {
    name: "draft-actions-mcp",
    routePath: "/api/mcp/draft-actions",
  },
};

export type ConnectedServer = {
  key: McpServerKey;
  name: string;
  url: string;
  client: MCPClient;
  tools: Awaited<ReturnType<MCPClient["tools"]>>;
};

export type ServerStatus =
  | { key: McpServerKey; name: string; url: string; ok: true; toolNames: string[] }
  | { key: McpServerKey; name: string; url: string; ok: false; error: string };

export type ConnectAllResult = {
  servers: ConnectedServer[];
  failures: Extract<ServerStatus, { ok: false }>[];
  closeAll: () => Promise<void>;
  combinedTools: ToolSet;
};

async function resolveBaseUrl(): Promise<string> {
  const hdrs = await headers();
  const host = hdrs.get("host");
  if (!host) return process.env.MCP_BASE_URL ?? "http://localhost:3000";
  const proto =
    hdrs.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

async function connectOne(
  key: McpServerKey,
  base: string,
): Promise<ConnectedServer | Extract<ServerStatus, { ok: false }>> {
  const entry = MCP_SERVER_CATALOG[key];
  const url = `${base}${entry.routePath}`;
  try {
    const client = await createMCPClient({ transport: { type: "http", url } });
    const tools = await client.tools();
    return { key, name: entry.name, url, client, tools };
  } catch (err) {
    return {
      key,
      name: entry.name,
      url,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function connectAllMCP(): Promise<ConnectAllResult> {
  const base = await resolveBaseUrl();
  const results = await Promise.all(
    (Object.keys(MCP_SERVER_CATALOG) as McpServerKey[]).map((k) =>
      connectOne(k, base),
    ),
  );

  const servers = results.filter(
    (r): r is ConnectedServer => "client" in r,
  );
  const failures = results.filter(
    (r): r is Extract<ServerStatus, { ok: false }> => "ok" in r && r.ok === false,
  );

  const combinedTools: ToolSet = {};
  for (const s of servers) {
    Object.assign(combinedTools, s.tools);
  }

  const closeAll = async () => {
    await Promise.all(
      servers.map(async (s) => {
        try {
          await s.client.close();
        } catch {
          /* ignore */
        }
      }),
    );
  };

  return { servers, failures, closeAll, combinedTools };
}

export async function probeAllMCP(): Promise<ServerStatus[]> {
  const { servers, failures, closeAll } = await connectAllMCP();
  const online: ServerStatus[] = servers.map((s) => ({
    key: s.key,
    name: s.name,
    url: s.url,
    ok: true,
    toolNames: Object.keys(s.tools),
  }));
  await closeAll();
  return [...online, ...failures];
}
