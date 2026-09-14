# MIM evaluation sources (SAGE-07)

Canonical documents and commands. Do not duplicate numeric claims in READMEs or changelogs.

| What | Canonical source | Command |
|---|---|---|
| SAGE crash classifier (deterministic) | [sage-eval.md](./sage-eval.md) | `npm run eval:sage` |
| SAGE real holdout | `scripts/evaluation/datasets/crash-corpus.json` | `npm run eval:sage -- --holdout` |
| SAGE regression gate | `scripts/evaluation/datasets/crash-corpus-regression.json` | `npm run eval:sage` (CI) |
| MimBot fixture structure | `scripts/evaluation/mimbot-fixtures.json` | `npm run eval:mimbot` |
| MimBot live LLM scoring | same fixtures + CI job `mimbot-live-eval` | `RUN_MIMBOT_LIVE=1 npm run eval:mimbot` |

SAGE latency in `sage-eval.md` is **local diagnostic** (SAGE-04). MimBot live p50/p95 is **LLM** latency and lives only in the `eval:mimbot` live output / CI logs.
