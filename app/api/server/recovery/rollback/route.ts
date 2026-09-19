import { withApiGuard } from "@/lib/apiGuard";
import { rollbackServerSnapshot } from "@/lib/server/recoveryServer";
import { rollbackServerSchema } from "@/lib/server/recoverySchema";
import { rejectIfNotDesktopLocal } from "@/lib/server/desktopGuard";

export const runtime = "nodejs";

export const POST = withApiGuard(
  {
    bodySchema: rollbackServerSchema,
    rateLimit: { maxRequests: 4, windowMs: 60000, customIdentifier: () => "server-recovery-rollback:local" },
  },
  async ({ request, body }) => {
    const denied = rejectIfNotDesktopLocal(request, "La recuperación de servidor está disponible desde MIM Desktop local.");
    if (denied) return denied;
    const timeout = AbortSignal.timeout(120000);
    const signal = AbortSignal.any([request.signal, timeout]);
    try {
      return Response.json(await rollbackServerSnapshot(body, signal), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error: unknown) {
      const message = signal.aborted
        ? "El rollback se canceló o superó los 2 minutos."
        : error instanceof Error
          ? error.message
          : "No se pudo ejecutar el rollback.";
      return Response.json({ error: message }, { status: signal.aborted ? 408 : 422, headers: { "Cache-Control": "no-store" } });
    }
  }
);
