import { withApiGuard } from "@/lib/apiGuard";
import { updateServerPropertiesSchema } from "@/lib/server/adminSchema";
import { updateRemoteServerProperties } from "@/lib/server/adminServer";
import { SftpAuditError } from "@/lib/server/transport/sftpReadTransport";
import { rejectIfNotDesktopLocal } from "@/lib/server/desktopGuard";

export const runtime = "nodejs";

export const POST = withApiGuard(
  {
    bodySchema: updateServerPropertiesSchema,
    rateLimit: { maxRequests: 6, windowMs: 60000, customIdentifier: () => "server-admin-properties:local" },
  },
  async ({ request, body }) => {
    const denied = rejectIfNotDesktopLocal(request, "Escribir server.properties está disponible desde MIM Desktop local.");
    if (denied) return denied;
    const timeout = AbortSignal.timeout(90000);
    const signal = AbortSignal.any([request.signal, timeout]);
    try {
      return Response.json(await updateRemoteServerProperties(body, signal), { headers: { "Cache-Control": "no-store" } });
    } catch (error: unknown) {
      const message = signal.aborted
        ? "La escritura de propiedades se canceló o superó los 90 segundos."
        : error instanceof SftpAuditError
          ? error.message
          : "No se pudo actualizar server.properties.";
      return Response.json({ error: message }, { status: signal.aborted ? 408 : 422, headers: { "Cache-Control": "no-store" } });
    }
  }
);
