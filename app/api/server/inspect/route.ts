import { withApiGuard } from "@/lib/apiGuard";
import { BUILDS_BASE } from "@/lib/core/constants";
import { inspectServerSchema } from "@/lib/server/inspectSchema";
import { inspectServer } from "@/lib/server/inspectServer";
import { SftpAuditError } from "@/lib/server/transport/sftpReadTransport";

export const runtime = "nodejs";
export const POST = withApiGuard(
  { bodySchema: inspectServerSchema, rateLimit: { maxRequests: 10, windowMs: 60000, customIdentifier: () => "server-audit:local" } },
  async ({ request, body }) => {
    const url = new URL(request.url);
    // Next may normalize request.url to localhost even when the browser uses 127.0.0.1.
    const authority = request.headers.get("host") || url.host;
    const localUrl = new URL(`${url.protocol}//${authority}`);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(localUrl.hostname);
    const desktop = process.env.MIM_DESKTOP_RUNTIME === "1" || process.env.NODE_ENV === "development";
    if (!desktop || !local || request.headers.get("origin") !== localUrl.origin) {
      return Response.json({ error: "La auditoría SFTP está disponible desde MIM Desktop local." }, { status: 403 });
    }
    const timeout = AbortSignal.timeout(90000);
    const signal = AbortSignal.any([request.signal, timeout]);
    try {
      return Response.json(await inspectServer(body, BUILDS_BASE, signal), { headers: { "Cache-Control": "no-store" } });
    } catch (error: unknown) {
      // Never return/log transport exceptions, credentials or server.properties.
      const message = signal.aborted ? "La auditoría se canceló o superó los 90 segundos." :
        error instanceof SftpAuditError ? error.message : "No se pudo completar la auditoría.";
      return Response.json({ error: message }, { status: signal.aborted ? 408 : 422, headers: { "Cache-Control": "no-store" } });
    }
  }
);
