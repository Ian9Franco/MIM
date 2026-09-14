# SAGE evaluation datasets

Two files, on purpose:

| File | Role |
|---|---|
| `crash-corpus-regression.json` | Templated snippets (`origin: synthetic`) for the **SAGE-03 CI gate** only. Not real captured logs. |
| `crash-corpus.json` | Captured logs + SRV-5 fixture seed. **Never** `origin: synthetic`. Ingest with `npm run sage:ingest-log`. |

## Not the same as MIM Server (SRV-5)

- **This folder** feeds `npm run eval:sage` — the local deterministic crash classifier.
- **MIM Server remote diagnosis** (SFTP, `/servers`, `latest.log`) is SRV-5 and is wired separately. When you test a local or hosted server, export excerpts into `crash-corpus.json`; do not edit the regression fixture.

## Adding a real log

```json
{
  "id": "SERVER-001",
  "category": "MISSING_DEPENDENCY",
  "loader": "fabric",
  "minecraftVersion": "1.21.1",
  "expectedCulprit": "fabric-api",
  "origin": "community",
  "license": "user-consent",
  "anonymized": true,
  "split": "holdout",
  "notes": "Captured from VPS after first deploy test",
  "rawLog": "..."
}
```

Use `split: holdout` for logs never used to tune SAGE rules. Run `npm run eval:sage -- --holdout` to score them without affecting CI.

```bash
npm run sage:ingest-log -- --file path/to/latest.log --id HOST-001 --category MISSING_DEPENDENCY --loader fabric --version 1.20.1 --culprit fabric-api --origin community
```
