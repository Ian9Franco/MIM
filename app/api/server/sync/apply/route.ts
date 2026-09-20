import { withApiGuard } from "@/lib/apiGuard";
import { getBuildsBase } from "@/lib/core/settings";
import { applyClientSyncFromRemote } from "@/lib/server/applyClientSync";
import { syncClientServerSchema } from "@/lib/server/multiplayerSchema";
import { SftpAuditError } from "@/lib/server/transport/sftpReadTransport";
import { rejectIfNotDesktopLocal } from "@/lib/server/desktopGuard";

export const runtime = "nodejs";

export const POST = withApiGuard(
  {
    bodySchema: syncClientServerSchema,
    rateLimit: { maxRequests: 6, windowMs: 60000, customIdentifier: () => "server-sync-apply:local" },
  },
  async ({ request, body }) => {
    const denied = rejectIfNotDesktopLocal(request, "La sincronización multiplayer está disponible desde MIM Desktop local.");
    if (denied) return denied;
    const timeout = AbortSignal.timeout(180000);
    const signal = AbortSignal.any([request.signal, timeout]);
    try {
      return Response.json(await applyClientSyncFromRemote(body, getBuildsBase(), signal), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error: unknown) {
      const message = signal.aborted
        ? "La sincronización se canceló o superó los 3 minutos."
        : error instanceof SftpAuditError
          ? error.message
          : "No se pudo aplicar la sincronización del cliente.";
      const status = signal.aborted ? 408 : error instanceof SftpAuditError ? 422 : 500;
      return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
    }
  }
);
