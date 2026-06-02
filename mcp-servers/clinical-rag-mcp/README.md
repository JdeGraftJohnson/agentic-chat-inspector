# clinical-rag-mcp

Read-only MCP server providing healthcare-grounded retrieval tools. Same data
sources the rest of the johndegraft.app portfolio cites (PubMed, NICE,
HAPI FHIR R4 public sandbox, local kb).

## Tools

| Tool | Source | Auth |
|---|---|---|
| `pubmed.search` | NCBI E-utilities (`eutils.ncbi.nlm.nih.gov/entrez/eutils`) | Optional `NCBI_API_KEY` (raises rate limit) |
| `nice.guideline` | Seeded snapshot of NICE public guideline metadata | None |
| `fhir.patient_context` | HAPI FHIR R4 public sandbox (`hapi.fhir.org/baseR4`) — synthetic patients only | None |
| `kb.search` | Local vector-ish (keyword TF) search over this repo's docs | None |

## Transports

| Transport | Use case | Entry point |
|---|---|---|
| Streamable HTTP (Web Standards) | Production — mounted at `/api/mcp/clinical-rag` in the host Next.js app | `app/api/mcp/clinical-rag/route.ts` |
| stdio | Local dev / agent attach | `bin/stdio.ts` — `npx tsx mcp-servers/clinical-rag-mcp/bin/stdio.ts` |

## Why this MCP server exists in this repo

It backs the chat surface at `/chat` and powers the Inspector tab at
`/inspector`. The agent uses it to ground answers in public healthcare
sources instead of making things up — recruiter-visible proof of agentic
RAG over real evidence.

See the [project README](../../README.md) for context.
