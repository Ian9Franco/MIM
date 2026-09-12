import { withApiGuard } from "@/lib/apiGuard";
import { executeServerRconSchema } from "@/lib/server/adminSchema";
import { executeServerRcon } from "@/lib/server/adminServer";
import { SftpAuditError } from "@/lib/server/transport/sftpReadTransport";
import { rejectIfNotDesktopLocal } from "@/lib/server/desktopGuard";

export const runtime = "nodejs";

export const POST = withApiGuard(
  {
    bodySchema: executeServerRconSchema,
    rateLimit: { maxRequests: 20, windowMs: 60000, customIdentifier: () => "server-admin-rcon:local" },
  },
  async ({ request, body }) => {
    const denied = rejectIfNotDesktopLocal(request, "La consola RCON está disponible desde MIM Desktop local.");
    if (denied) return denied;
    const timeout = AbortSignal.timeout(20000);
    const signal = AbortSignal.any([request.signal, timeout]);
    try {
      return Response.json(await executeServerRcon(body, signal), { headers: { "Cache-Control": "no-store" } });
    } catch (error: unknown) {
      const message = signal.aborted
        ? "El comando RCON se canceló o superó el tiempo de espera."
        : error instanceof SftpAuditError
          ? error.message
          : "No se pudo ejecutar el comando RCON.";
      return Response.json({ error: message }, { status: signal.aborted ? 408 : 422, headers: { "Cache-Control": "no-store" } });
    }
  }
);
