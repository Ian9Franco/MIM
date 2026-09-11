import { withApiGuard } from "@/lib/apiGuard";
import { BUILDS_BASE } from "@/lib/core/constants";
import { deployServerSchema } from "@/lib/server/deploySchema";
import { deployServer } from "@/lib/server/deployServer";
import { SftpAuditError } from "@/lib/server/transport/sftpReadTransport";
import { rejectIfNotDesktopLocal } from "@/lib/server/desktopGuard";

export const runtime = "nodejs";
export const POST = withApiGuard(
  { bodySchema: deployServerSchema, rateLimit: { maxRequests: 10, windowMs: 60000, customIdentifier: () => "server-deploy:local" } },
  async ({ request, body }) => {
    const denied = rejectIfNotDesktopLocal(request, "El despliegue SFTP está disponible desde MIM Desktop local.");
    if (denied) return denied;
    const timeout = AbortSignal.timeout(180000);
    const signal = AbortSignal.any([request.signal, timeout]);
    try {
      const result = await deployServer(body, BUILDS_BASE, signal);
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error: unknown) {
      // Never return/log transport exceptions, credentials or server.properties.
      const message = signal.aborted ? "El despliegue se canceló o superó los 180 segundos." :
        error instanceof SftpAuditError ? error.message : "No se pudo completar el despliegue.";
      return Response.json({ error: message }, { status: signal.aborted ? 408 : 422, headers: { "Cache-Control": "no-store" } });
    }
  }
);
