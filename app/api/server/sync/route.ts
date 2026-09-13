import { withApiGuard } from "@/lib/apiGuard";
import { BUILDS_BASE } from "@/lib/core/constants";
import { syncClientServerSchema } from "@/lib/server/multiplayerSchema";
import { syncClientWithRemoteServer } from "@/lib/server/multiplayerServer";
import { SftpAuditError } from "@/lib/server/transport/sftpReadTransport";
import { rejectIfNotDesktopLocal } from "@/lib/server/desktopGuard";

export const runtime = "nodejs";

export const POST = withApiGuard(
  {
    bodySchema: syncClientServerSchema,
    rateLimit: { maxRequests: 10, windowMs: 60000, customIdentifier: () => "server-sync:local" },
  },
  async ({ request, body }) => {
    const denied = rejectIfNotDesktopLocal(request, "La sincronización multiplayer está disponible desde MIM Desktop local.");
    if (denied) return denied;
    const timeout = AbortSignal.timeout(90000);
    const signal = AbortSignal.any([request.signal, timeout]);
    try {
      return Response.json(await syncClientWithRemoteServer(body, BUILDS_BASE, signal), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error: unknown) {
      const message = signal.aborted
        ? "La sincronización se canceló o superó los 90 segundos."
        : error instanceof SftpAuditError
          ? error.message
          : "No se pudo comparar el cliente con el servidor.";
      return Response.json({ error: message }, { status: signal.aborted ? 408 : 422, headers: { "Cache-Control": "no-store" } });
    }
  }
);
