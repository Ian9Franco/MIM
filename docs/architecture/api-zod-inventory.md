# API Zod contracts (API-02b)

Shared request schemas live in [`lib/api/contracts.ts`](../../lib/api/contracts.ts). Route handlers should pass them to `withApiGuard` as `bodySchema` / `querySchema` instead of parsing JSON by hand.

Inventory (non-failing):

```bash
npm run lint:api-schemas
```

Mutations that still lack a guard schema are listed by that command. Core mutators (`build`, `delete`, `staging`, `tweak`) plus secondary handlers (`classify`, `scan`, `settings/validate`, `settings/move-files`, `crosscheck/batch`, `project-config/auto-categorize`) now declare Zod on the guard.
