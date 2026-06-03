# Agentic Chat & LangSmith Inspector

![LangSmith](https://img.shields.io/badge/LangSmith-traced%20%2B%20datasets%20%2B%20experiments%20%2B%20prompt%20hub%20%2B%20annotation%20queue-2563eb)
![MCP](https://img.shields.io/badge/MCP-2%20servers%20%C2%B7%207%20tools-7c3aed)
![Vercel AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-v6-000)
![Next.js](https://img.shields.io/badge/Next.js-16-000)
![Claude Agent SDK](https://img.shields.io/badge/Claude%20Agent%20SDK-subscription%20auth-d97706)
![Evaluators](https://img.shields.io/badge/Custom%20Evaluators-7-059669)
![License: MIT](https://img.shields.io/badge/License-MIT-green)

Portfolio project — a **LangSmith-instrumented agentic platform** that ships
**datasets, experiments, custom evaluators, annotation queues, prompt hub,
and an online evaluator** on production traces, running against a live
multi-provider MCP chat in Next.js 16. Cross-links a clinical RAG eval
harness and a reusable health-equity fairness library.

**Project plan:** `~/.claude/plans/roll-into-project-3-gentle-giraffe.md`

## Try it

| Surface | Live | Notes |
|---|---|---|
| LangSmith showcase (links below) | ✅ Live, public, no sign-in | The headline recruiter artifact |
| `/equity` interactive fairness dashboard | ✅ Live at [johndegraft.app/projects/agentic-inspector/equity](https://johndegraft.app/projects/agentic-inspector/equity) | Server-rendered from the pre-baked TIGHTEN audit |
| `/inspector` MCP handshake + LangSmith console mirror | ✅ Live at [johndegraft.app/projects/agentic-inspector/inspector](https://johndegraft.app/projects/agentic-inspector/inspector) | Live MCP probe + tool registry |
| `/chat` streaming agentic chat | 🟡 Clone-locally exercise | The deployed surface intentionally surfaces a banner explaining how to enable a provider locally. The chat code, MCP wiring, and LangSmith tracing all run end-to-end when you `npm run dev` with either a `claude` CLI login (no key) or an API key. |

## Live LangSmith artifacts

The full LangSmith showcase is public; no sign-in required to view.

| Artifact | Link |
|---|---|
| 📊 **Experiment comparison** — `golden-set-v1-claude-subscription-1af843d` | [open in LangSmith](https://smith.langchain.com/o/62300b60-93c1-4c59-aa56-e992da6cde03/datasets/41207351-4311-47fc-80c8-628094056458/compare?selectedSessions=7e3b2e13-8101-481c-a570-da914ca15e4a) |
| 📚 **Versioned dataset** — `agentic-chat-inspector-golden-set-v1` (10 prompts) | [open in LangSmith](https://smith.langchain.com/o/62300b60-93c1-4c59-aa56-e992da6cde03/datasets/41207351-4311-47fc-80c8-628094056458) |
| 📝 **Prompt Hub — system v1** (terse baseline) | [open in LangSmith](https://smith.langchain.com/prompts/agentic-chat-inspector-system-v1/0826593e) |
| 📝 **Prompt Hub — system v2** (full rules + style) | [open in LangSmith](https://smith.langchain.com/prompts/agentic-chat-inspector-system-v2/635ab294) |
| 🧐 **Annotation queue** — auto-routed low-tool-use runs | `agentic-chat-inspector-tool-use-review` (org-scoped) |

## What this project demonstrates

| LangSmith surface | Where it lives |
|---|---|
| `traceable` + `wrapAISDK` per-turn tracing | `lib/langsmith.ts`, every chat turn auto-traced |
| Custom Python evaluators (7 total) | `evals/` — 4 clinical, 1 tool-use, 1 equity, 1 online PHI/secret leakage |
| Versioned dataset upsert | `scripts/seed_langsmith_dataset.py` |
| Cross-provider experiment runner | `scripts/run_experiment.py` — one experiment per provider |
| Prompt Hub push (multiple commits) | `scripts/push_prompts.py` |
| Annotation queue auto-routing | `lib/langsmith-feedback.ts` — runs with `tool_use_correctness < 0.6` or `phi_secret_leakage < 1.0` route to the queue |
| Online evaluator on production traces | `lib/online-eval.ts` (TS twin) + `evals/src/evals/online.py` |
| LangSmith console mirror in-app | `/inspector` route, deep-links to live LangSmith |

## Architecture

```
app/
├── /chat        ← streaming chat (Vercel AI SDK v6, 4 providers)
├── /inspector   ← LangSmith console mirror (MCP handshake, prompt hub,
│                  online evaluator, annotation queue cards)
├── /equity      ← interactive fairness audit dashboard
└── /api/
    ├── chat                  ← streamText + 4-provider dispatch
    ├── mcp/clinical-rag      ← Streamable HTTP MCP server (4 read tools)
    ├── mcp/draft-actions     ← Streamable HTTP MCP server (3 write tools)
    └── equity/audit          ← machine-readable AuditRecord

mcp-servers/
├── clinical-rag-mcp/    ← pubmed.search · nice.guideline · fhir.patient_context · kb.search
└── draft-actions-mcp/   ← email.draft · file.write (sandboxed) · calendar.draft

evals/              ← uv project. clinical-rag-eval judges + equity-audit
                      LangSmith plugin + new tool-use + online evaluator.
equity_audit/       ← installable Python package. fairlearn-backed metrics,
                      4 framework overlays (NICE ESF Tier B / NHS Core20PLUS5
                      / UK GDPR Art. 22 / HIPAA per NIST SP 800-66r2),
                      reportlab PDF + JSON + Markdown emitters.
```

## Providers

| Provider | Auth | Required env |
|---|---|---|
| `claude-subscription` (default) | Local Claude Code subscription via `@anthropic-ai/claude-agent-sdk` | none — uses the `claude` CLI login |
| `anthropic` | API key | `ANTHROPIC_API_KEY` |
| `openai` | API key | `OPENAI_API_KEY` |
| `together` | API key | `TOGETHER_API_KEY` |

The operator runs experiments via the subscription provider (zero API-key
spend). Public clones swap in their own keys for the other three.

## Quickstart

```bash
git clone https://github.com/JdeGraftJohnson/agentic-chat-inspector
cd agentic-chat-inspector
npm install
cp .env.example .env.local           # at minimum: LANGSMITH_API_KEY
npm run dev                          # http://localhost:3000

# Seed the LangSmith dataset (once)
cd evals && uv sync && uv run python ../scripts/seed_langsmith_dataset.py

# Push the system prompts to Prompt Hub (once)
uv run python ../scripts/push_prompts.py

# Create the annotation queue (once)
uv run python ../scripts/setup_annotation_queue.py

# Fire an experiment
uv run run-experiment --providers claude-subscription
```

## Health Equity Audit — `equity_audit/`

Standalone library that pairs with this project. Installable via `pip`,
plays as a 7th LangSmith evaluator, and surfaces the interactive `/equity`
dashboard.

```bash
cd equity_audit
uv sync --python 3.12
uv run python examples/toy_model/generate.py   # 8k synthetic biased predictions
uv run equity-audit \
  --predictions examples/toy_model/predictions.parquet \
  --demographics examples/toy_model/demographics.parquet \
  --output-dir /tmp/audit
```

Outputs `audit_report.pdf` (reportlab), `audit_record.json` (governance),
and `audit_report.md`. The toy model is calibrated to land at **TIGHTEN**
overall — NICE Tier B 2 tightened, Core20PLUS5 1 tightened, UK GDPR Art. 22
4/4 PASS, HIPAA 7/7 PASS.

HIPAA item IDs come from NIST SP 800-66r2 (Feb 2024) — §164.308(a)(1)
Risk Analysis, §164.312(b) Audit Controls, §164.312(c)(1) Integrity,
§164.514(b) De-identification, §164.502(b) Minimum Necessary, §164.524
Right of Access.

## Constraints honored

- **GitHub Actions billing is blocked account-wide.** Deploy via
  `vercel --prod`. No `.github/workflows/` files.
- **The live `johndegraft-app` repo is not edited.** Mounting this project
  under the apex at `/projects/agentic-inspector/*` is a separate Vercel
  domain-routing task the operator owns post-stabilization. For now the
  project lives at `agentic-chat-inspector.vercel.app`.
- **Real public data only.** PubMed E-utils, NICE public guidelines, HAPI
  FHIR R4 public sandbox, local repo kb. No PHI, no proprietary fintech
  feeds, no Cosmos credentials.

## License

MIT.
