import { NextResponse } from "next/server";
import { withApiGuard } from "@/lib/apiGuard";
import { fetchOpenRouterAccountSnapshot } from "@/lib/intelligence/ai/openRouterAccount";
import { getAiQuotaSnapshots } from "@/lib/intelligence/ai/quotaTracker";

export const GET = withApiGuard({}, async () => {
  const providers = getAiQuotaSnapshots();
  const openRouter = await fetchOpenRouterAccountSnapshot();

  return NextResponse.json({
    windowSeconds: 60,
    providers,
    openRouter,
    note:
      "Contadores locales de esta sesión del servidor. OpenRouter usage proviene de la API del proveedor cuando hay clave configurada.",
  });
});
