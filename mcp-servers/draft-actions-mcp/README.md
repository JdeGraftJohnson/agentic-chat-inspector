# draft-actions-mcp

Simulated write-action MCP server. Pairs with `clinical-rag-mcp` to prove the
agent can route between read tools (RAG) and write tools (draft/produce
artifacts) — the standard agentic pattern.

**Nothing leaves the box.** All "writes" land in `/tmp/sandbox/<run-id>/`
on the server filesystem. No SMTP, no SES, no Google Calendar, no real
filesystem access outside the sandbox.

## Tools

| Tool | What it does | Output |
|---|---|---|
| `email.draft` | Writes a Markdown email draft | Path under `/tmp/sandbox/.../emails/` + the rendered text |
| `file.write` | Writes a file under a sandbox prefix; path-traversal blocked | Final resolved path + bytes written |
| `calendar.draft` | Builds a minimal RFC 5545 ICS event string | The ICS body (also saved to sandbox) |

## Why these three

- `email.draft` mimics the most common agentic write surface (compose a
  message, do not send) — recruiter sees the human-in-the-loop pattern.
- `file.write` proves we know how to sandbox a write tool — the
  agent-asks-for-side-effects threat model in miniature.
- `calendar.draft` returns structured RFC 5545 content the agent can hand
  back to the user, demonstrating structured output.

## Transports

| Transport | Use case | Entry |
|---|---|---|
| Streamable HTTP (Web Standards) | Production — mounted at `/api/mcp/draft-actions` | `app/api/mcp/draft-actions/route.ts` |
| stdio | Local dev / agent attach | `bin/stdio.ts` |
