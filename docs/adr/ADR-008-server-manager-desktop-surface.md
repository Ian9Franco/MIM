# ADR-008: Server Manager as Desktop Surface (ARCH-6)

- **Status:** Accepted
- **Deciders:** Ian Franco
- **Date:** 2026-09-10

---

## 1. Context & Problem Statement

MIM Server Manager combines Node-only capabilities (SFTP, staging, rollback) with Desktop UX. After ARCH-5 moved the public Hub to `apps/hub`, we must decide where the **UI surface** lives without creating an empty app or duplicating engines.

Candidates considered:

1. **Section inside Desktop** — routes such as `/servers` under the Electron/Next Desktop app.
2. **`@mim/server-ui` package** — shared React components consumed by Desktop (and potentially Hub later).
3. **Separate deployable app** — standalone Next/Electron product for Server Manager.

Constraints:

- SFTP and writable transports are **Desktop-local only** (see `app/api/server/inspect/route.ts` host/runtime guards).
- Domain logic already lives in `@mim/server-engine` and `@mim/contracts-core/server`.
- `apps/hub` must not import Node transports or Desktop-only APIs.
- ARCH-4 physical move of Desktop to `apps/desktop/` is incomplete; UI still resides at repo root today.

## 2. Decision

1. **Server Manager is a Desktop surface**, not a third application and not part of MIM Hub.
2. **Ownership map (current → target ARCH-4 completion):**

   | Layer | Location today | Target |
   |---|---|---|
   | Routes | `app/servers/` | `apps/desktop/app/servers/` (when Desktop tree moves) |
   | UI | `components/server/` | same tree under Desktop |
   | Desktop API | `app/api/server/*` | same tree under Desktop |
   | Adapters | `lib/server/` | thin re-exports over `@mim/server-engine` |
   | Engine | `packages/server-engine/` | unchanged |

3. **Do not create `@mim/server-ui` now.** There is a single consumer (Desktop). Extract a UI package only when a second surface needs the same components or ARCH-7 scoped CI forces a hard boundary.
4. **Route namespace:** all Server Manager UX stays under `/servers` (audit today; deploy/admin/multiplayer as sub-flows later).
5. **Hub boundary:** no Server Manager routes in `apps/hub`; no SFTP credentials or deploy actions in the public web app.

## 3. Consequences

### Positive

- Matches existing implementation (`/servers`, `components/server/`, local-only API guards).
- SRV-4 UI work can proceed without a package extraction PR blocking product delivery.
- Clear separation from `apps/hub` after ARCH-5.

### Trade-offs

- Server UI remains colocated with Desktop root until the ARCH-4 file move completes.
- `components/server/` is not yet enforceable as a package boundary in `verify-boundaries.ts`.

### Unlocks next (SRV-4)

- `POST /api/server/deploy` (Desktop-local, same guard pattern as `/api/server/inspect`).
- Deploy panel wired to `executeServerDeployment` from `@mim/server-engine/executor`.
- UI states: `idle` → `preflight` → `executing` → `completed` | `failed` | `recovery-required`.

## 4. Related

- Epic #58 — Server Manager
- ARCH-6 in [sprint-action-plan.md](../planning/sprint-action-plan.md)
- [server-manager.md](../architecture/server-manager.md)
