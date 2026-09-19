import { NextResponse } from "next/server";
import { withApiGuard } from "@/lib/apiGuard";
import { serverAuditBodySchema } from "@/lib/api/contracts";
import { auditServerInstance, type ServerAuditReport } from "@/lib/server";
import type { InstanceManifest } from "@/lib/instances/types";

/**
 * /api/server/audit — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Compares a desired Minecraft project instance manifest against an observed
 * remote server instance manifest, evaluating health, diffs, duplicates, and
 * client/server environment incompatibilities.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const POST = withApiGuard(
  { bodySchema: serverAuditBodySchema },
  async ({ body }) => {
    try {
      const { desiredManifest, actualManifest, isPartialAudit = false } = body;

      if (desiredManifest.side !== "server" || actualManifest.side !== "server") {
        return NextResponse.json(
          { error: "Both desired and actual manifests must target server runtime (side: 'server')" },
          { status: 400 }
        );
      }

      const report: ServerAuditReport = auditServerInstance(
        desiredManifest as unknown as InstanceManifest,
        actualManifest as unknown as InstanceManifest
      );

      return NextResponse.json({
        report,
        isPartialAudit: Boolean(isPartialAudit),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error during server audit";
      console.error("[/api/server/audit] Unhandled audit error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
