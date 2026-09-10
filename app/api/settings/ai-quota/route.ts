import { NextResponse } from "next/server";
import { withApiGuard } from "@/lib/apiGuard";
import { getAiQuotaSnapshots } from "@/lib/intelligence/ai/quotaTracker";

export const GET = withApiGuard({}, async () => {
  const providers = getAiQuotaSnapshots();

  return NextResponse.json({
    windowSeconds: 60,
    providers,
    note:
      "Contadores locales de esta sesión del servidor. No reemplazan el dashboard oficial del proveedor.",
  });
});
