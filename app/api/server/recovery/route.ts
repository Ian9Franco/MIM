import { withApiGuard } from "@/lib/apiGuard";
import { loadServerRecoveryState } from "@/lib/server/recoveryServer";
import { rejectIfNotDesktopLocal } from "@/lib/server/desktopGuard";

export const runtime = "nodejs";

export const GET = withApiGuard(
  {
    rateLimit: { maxRequests: 30, windowMs: 60000, customIdentifier: () => "server-recovery:local" },
  },
  async ({ request }) => {
    const denied = rejectIfNotDesktopLocal(request, "La recuperación de servidor está disponible desde MIM Desktop local.");
    if (denied) return denied;
    const pending = await loadServerRecoveryState();
    return Response.json({ pending }, { headers: { "Cache-Control": "no-store" } });
  }
);
