import { withApiGuard } from "@/lib/apiGuard";
import { diagnoseServerSchema } from "@/lib/server/diagnoseSchema";
import { diagnoseServer } from "@/lib/server/diagnoseServer";
import { SftpAuditError } from "@/lib/server/transport/sftpReadTransport";
import { rejectIfNotDesktopLocal } from "@/lib/server/desktopGuard";

export const runtime = "nodejs";

export const POST = withApiGuard(
  {
    bodySchema: diagnoseServerSchema,
    rateLimit: { maxRequests: 10, windowMs: 60000, customIdentifier: () => "server-diagnose:local" },
  },
  async ({ request, body }) => {
    const denied = rejectIfNotDesktopLocal(request, "El diagnóstico remoto SAGE está disponible desde MIM Desktop local.");
    if (denied) return denied;
    const timeout = AbortSignal.timeout(90000);
    const signal = AbortSignal.any([request.signal, timeout]);
    try {
      return Response.json(await diagnoseServer(body, signal), { headers: { "Cache-Control": "no-store" } });
    } catch (error: unknown) {
      const message = signal.aborted
        ? "El diagnóstico se canceló o superó los 90 segundos."
        : error instanceof SftpAuditError
          ? error.message
          : "No se pudo completar el diagnóstico remoto.";
      return Response.json({ error: message }, { status: signal.aborted ? 408 : 422, headers: { "Cache-Control": "no-store" } });
    }
  }
);
