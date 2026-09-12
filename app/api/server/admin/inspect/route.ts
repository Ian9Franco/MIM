import { withApiGuard } from "@/lib/apiGuard";
import { inspectServerAdminSchema } from "@/lib/server/adminSchema";
import { inspectServerAdmin } from "@/lib/server/adminServer";
import { SftpAuditError } from "@/lib/server/transport/sftpReadTransport";
import { rejectIfNotDesktopLocal } from "@/lib/server/desktopGuard";

export const runtime = "nodejs";

export const POST = withApiGuard(
  {
    bodySchema: inspectServerAdminSchema,
    rateLimit: { maxRequests: 10, windowMs: 60000, customIdentifier: () => "server-admin-inspect:local" },
  },
  async ({ request, body }) => {
    const denied = rejectIfNotDesktopLocal(request, "La administración remota está disponible desde MIM Desktop local.");
    if (denied) return denied;
    const timeout = AbortSignal.timeout(90000);
    const signal = AbortSignal.any([request.signal, timeout]);
    try {
      return Response.json(await inspectServerAdmin(body, signal), { headers: { "Cache-Control": "no-store" } });
    } catch (error: unknown) {
      const message = signal.aborted
        ? "La inspección de administración se canceló o superó los 90 segundos."
        : error instanceof SftpAuditError
          ? error.message
          : "No se pudo leer la administración del servidor.";
      return Response.json({ error: message }, { status: signal.aborted ? 408 : 422, headers: { "Cache-Control": "no-store" } });
    }
  }
);
