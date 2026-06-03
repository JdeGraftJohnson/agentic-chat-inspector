# Agentic Chat & LangSmith Inspector

Portfolio project — a LangSmith-instrumented agentic platform that ships
**datasets, experiments, custom evaluators, annotation queues, prompt hub,
and an online evaluator** on production traces, running against a live
multi-provider MCP chat in Next.js 16.

**Plan:** `~/.claude/plans/roll-into-project-3-gentle-giraffe.md`

**Deploy target:** `johndegraft.app/projects/agentic-inspector` (Vercel,
path-mounted under the apex — no edits to the live `johndegraft-app` repo).

---

## Modules

| Status | Module | Surface |
|---|---|---|
| **M1 (in progress)** | Streaming chat + provider toggle | `/chat` |
| M2a | `clinical-rag-mcp` server (PubMed · NICE · FHIR R4 · kb.search) | `/inspector` |
| M2b | `draft-actions-mcp` server + handshake panel | `/inspector` |
| **M3a — live** | LangSmith dataset `agentic-chat-inspector-golden-set-v1` (10 prompts) + 5 custom evaluators (4 wrap clinical-rag-eval judges, 1 native tool-use) + experiment runner | `/inspector` |
| **M3b — live** | Prompt Hub commits (`v1`, `v2`) + annotation queue `agentic-chat-inspector-tool-use-review` + online evaluator `online.phi_secret_leakage` | `/inspector` |
| M4a | `equity-audit` package + interactive fairness dashboard | `/equity` |
| M4b | Recruiter polish + Vercel apex path deploy | — |

---

## Module 1 — what shipped

- Next.js 16 App Router + React 19 + Tailwind v4.
- `streamText` from Vercel AI SDK v6, wrapped via `langsmith/experimental/vercel`
  so every turn lands as a LangSmith run with `provider`, `model_label`, and
  `surface` metadata.
- Multi-provider toggle: **Claude Sonnet 4.6 / GPT-4o / Llama 3.3 70B
  (via Together AI)**. Provider entries are environment-gated — only providers
  with an API key in `.env.local` show as enabled.
- Built-in `next-devtools-mcp` registered in `.mcp.json` so a coding agent
  cloning the repo discovers the running Next.js dev server's MCP endpoint
  automatically.

---

## Quickstart (local)

```bash
git clone https://github.com/JdeGraftJohnson/agentic-chat-inspector
cd agentic-chat-inspector
npm install
cp .env.example .env.local   # set at least one provider key
npm run dev
# open http://localhost:3000/chat
```

Set `LANGSMITH_TRACING=true` and `LANGSMITH_API_KEY=…` to publish traces.
Without those, the app runs fine and the LangSmith client no-ops silently.

### Provider keys — note for public clones

`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `TOGETHER_API_KEY` in `.env.example`
are **placeholders for public users**. Drop in your own keys to run `/chat`
against the corresponding provider. The operator's local runs use the
Claude Agent SDK with subscription auth (wired in a later milestone), so
the operator path doesn't require `ANTHROPIC_API_KEY`. Either path produces
the same LangSmith traces.

---

## Architecture (target)

```
app/
├── page.tsx          # project overview + 3-surface grid
├── chat/             # M1 — streaming chat with provider toggle
├── inspector/        # M2–M3 — LangSmith console mirror
├── equity/           # M4 — interactive fairness dashboard
└── api/
    ├── chat/route.ts # streamText route handler (M1)
    └── equity/       # proxies equity_audit (M4)

lib/
├── providers.ts      # Anthropic / OpenAI / Together bindings
├── langsmith.ts      # wrapAISDK + per-turn provider options
└── mcp-client.ts     # MCP server registration (M2)

mcp-servers/
├── clinical-rag-mcp/    # M2a — 4 healthcare read tools (PubMed, NICE,
│                        #       HAPI FHIR R4 sandbox, kb.search)
└── draft-actions-mcp/   # M2b — 3 simulated write tools

evals/                # M3 — Python: clinical + tooluse + equity evaluators
equity_audit/         # M4 — installable Python package
```

---

## Constraints

- **GitHub Actions billing is blocked account-wide.** Deploy via `vercel --prod`
  CLI. Do not add workflow files that expect to execute.
- **The live `johndegraft-app` repo is not edited as part of this project.**
  The deploy mounts under the apex at `/projects/agentic-inspector/*` via
  Vercel project domain config; linking from the live portfolio is a
  separate post-stabilization task.
- **Real public data only.** The `clinical-rag-mcp` server consumes public
  healthcare sources (PubMed E-utils, NICE public guidelines, HAPI FHIR R4
  public sandbox with synthetic patients) plus a local vector index over
  this repo's docs and a NICE corpus snapshot. No PHI, no proprietary data.

---

## License

MIT.
