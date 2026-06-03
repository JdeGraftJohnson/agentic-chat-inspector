# agentic-chat-inspector / evals

LangSmith dataset seed + 5 custom evaluators + an experiment runner that
fans out across the 3 chat providers.

## Evaluators

| ID | Source | Wraps |
|---|---|---|
| `clinical.citation_coverage` | `clinical_rag_eval.judges.deterministic.citation_coverage` | Deterministic — every expected DOI/PMID actually cited |
| `clinical.must_mention` | `clinical_rag_eval.judges.deterministic.must_mention` | Deterministic — required terms present |
| `clinical.refusal_consistency` | `clinical_rag_eval.judges.deterministic.refusal_consistency` | Deterministic — refusal cases actually refused |
| `clinical.faithfulness` | `clinical_rag_eval.judges.llm.faithfulness` | LLM-as-judge — claims supported by retrieved evidence |
| `agentic.tool_use_correctness` | this package | New — expected MCP tools actually called and at right step |

The clinical wrappers convert each LangSmith `Run` into a
`clinical_rag_eval.types.RagAnswer` and each `Example` into an
`EvalCase`, call the judge, and reduce its `JudgeFinding` list into a
single `EvaluationResult` (0..1 score + severity-derived comment).

## Dataset

`prompts/golden-set-v1.json` (project root) — 10 starter prompts, mixing
RAG questions, write-action prompts, refusal cases, and a deliberately bad
case that should trigger the tool-use evaluator red flag.

Seed it:

```bash
cd evals && uv run --frozen seed-dataset
```

The seed is idempotent — examples are upserted by `id`.

## Experiments

Fan out the golden set across all 3 providers:

```bash
cd evals && uv run --frozen run-experiment \
    --target-url http://localhost:3000/api/chat \
    --providers anthropic openai together
```

The target wraps the local Next.js `/api/chat` endpoint. For production
deploys, swap `--target-url` for the deployed URL.

The runner registers one experiment named
`golden-set-v1-{provider}-{git-sha}` per provider so the pairwise comparison
table in LangSmith stays clean.
