import type { MimEventMap as CoreMimEventMap } from "./taxonomy";
import type { ServerEventMap } from "./server";

/**
 * Unified event map consumed by the runtime event bus.
 * `taxonomy.ts` remains the legacy/core taxonomy while domain extensions can
 * compose additional contracts here without turning that file into a monolith.
 */
export type MimEventMap = CoreMimEventMap & ServerEventMap;
export type { CoreMimEventMap, ServerEventMap };
