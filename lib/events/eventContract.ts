/**
 * MIM Event Bus - Formal Event Contract
 * Unified entry point for the MIM ecosystem event taxonomy.
 */

export * from "./metadata";
export * from "./taxonomy";
export * from "./intelligence";
export * from "./utils";

import { MimEventMap } from "./taxonomy";
import { EventMetadata } from "./metadata";

export type EventName = keyof MimEventMap;
export type EventPayload<T extends EventName> = MimEventMap[T];
export type EventHandler<T extends EventName> = (payload: EventPayload<T> & { metadata: EventMetadata }) => void;
