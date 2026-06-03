import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { emailDraft, emailDraftInputSchema } from "./tools/email";
import { fileWrite, fileWriteInputSchema } from "./tools/file";
import { calendarDraft, calendarDraftInputSchema } from "./tools/calendar";

export const SERVER_INFO = {
  name: "draft-actions-mcp",
  version: "0.1.0",
} as const;

export const TOOL_REGISTRY = [
  {
    name: "email.draft",
    title: "Draft an email",
    description:
      "Compose a draft email and persist it to a sandboxed /tmp directory. No SMTP, no send.",
  },
  {
    name: "file.write",
    title: "Write a file (sandboxed)",
    description:
      "Write a file under a per-run /tmp sandbox. Absolute paths and parent-traversal are blocked.",
  },
  {
    name: "calendar.draft",
    title: "Draft a calendar invite",
    description:
      "Build a minimal RFC 5545 ICS event. Saved to sandbox; nothing reaches Google / Outlook / Apple.",
  },
] as const;

export function buildServer(): McpServer {
  const server = new McpServer(SERVER_INFO, {
    capabilities: { tools: {} },
  });

  server.tool(
    "email.draft",
    "Draft an email and persist it to a sandboxed /tmp directory. No SMTP, no send.",
    emailDraftInputSchema.shape,
    async (args) => {
      const result = await emailDraft(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  server.tool(
    "file.write",
    "Write a file under a per-run /tmp sandbox. Absolute paths and parent-traversal are blocked.",
    fileWriteInputSchema.shape,
    async (args) => {
      const result = await fileWrite(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  server.tool(
    "calendar.draft",
    "Build a minimal RFC 5545 ICS event and persist to sandbox. Nothing reaches a real calendar.",
    calendarDraftInputSchema.shape,
    async (args) => {
      const result = await calendarDraft(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  return server;
}
