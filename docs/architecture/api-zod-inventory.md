# API Zod contracts (API-02b)

Shared request schemas live in [`lib/api/contracts.ts`](../../lib/api/contracts.ts). Route handlers should pass them to `withApiGuard` as `bodySchema` / `querySchema` instead of parsing JSON by hand.

Inventory (non-failing):

```bash
npm run lint:api-schemas
```

Mutation handlers declare a Zod schema on the guard (JSON `bodySchema`, or `querySchema` for empty/multipart POSTs). GET handlers that still read `searchParams` without `querySchema` are listed by the inventory and are not a CI gate.
