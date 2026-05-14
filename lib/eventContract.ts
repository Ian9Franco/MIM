/**
 * MIM Event Bus - Formal Event Contract
 * Unified entry point for the MIM ecosystem event taxonomy.
 */

export * from "./events/metadata";
export * from "./events/taxonomy";
export * from "./events/intelligence";
export * from "./events/utils";

import { MimEventMap } from "./events/taxonomy";
import { EventMetadata } from "./events/metadata";

export type EventName = keyof MimEventMap;
export type EventPayload<T extends EventName> = MimEventMap[T];
export type EventHandler<T extends EventName> = (payload: EventPayload<T> & { metadata: EventMetadata }) => void;
