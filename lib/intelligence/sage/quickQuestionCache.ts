/**
 * BOT-08 — 24 h cache for the four canonical MIM-Bot quick questions.
 * Key: hash(crashSignature + question + mode). Invalidates on crash/mode change via key.
 */

import type { MimbotChatMode } from "./mimbotQuickQuestions";
import { normalizeMimbotQuestion } from "./mimbotQuickQuestions";

export const QUICK_QUESTION_TTL_MS = 24 * 60 * 60 * 1000;
export const QUICK_QUESTION_STORAGE_KEY = "mim_sage_quick_question_cache";

export interface QuickQuestionCacheEntry {
  key: string;
  crashSignature: string;
  question: string;
  mode: MimbotChatMode;
  response: string;
  cachedAt: number;
}

export type QuickQuestionCacheStore = Record<string, QuickQuestionCacheEntry>;

type Clock = () => number;

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

let inMemoryStore: QuickQuestionCacheStore | null = null;
let clock: Clock = () => Date.now();
let storageOverride: StorageLike | null | undefined;

function hashPayload(payload: string): string {
  if (typeof process !== "undefined" && typeof process.getBuiltinModule === "function") {
    const crypto = process.getBuiltinModule("crypto");
    if (crypto) {
      return crypto.createHash("sha256").update(payload).digest("hex");
    }
  }

  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let index = 0; index < payload.length; index += 1) {
    const ch = payload.charCodeAt(index);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const p2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return (p1 + p2).repeat(4).slice(0, 64);
}

export function buildQuickQuestionCacheKey(
  crashSignature: string,
  question: string,
  mode: MimbotChatMode
): string {
  const payload = `${crashSignature}|${normalizeMimbotQuestion(question)}|${mode}`;
  return hashPayload(payload);
}

function resolveStorage(): StorageLike | null {
  if (storageOverride !== undefined) return storageOverride;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseStore(raw: string): QuickQuestionCacheStore {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as QuickQuestionCacheStore;
  } catch {
    return {};
  }
}

export function purgeExpiredQuickQuestionEntries(
  store: QuickQuestionCacheStore,
  now = clock()
): QuickQuestionCacheStore {
  const next: QuickQuestionCacheStore = {};
  for (const [key, entry] of Object.entries(store)) {
    if (now - entry.cachedAt <= QUICK_QUESTION_TTL_MS) {
      next[key] = entry;
    }
  }
  return next;
}

export function loadQuickQuestionCache(): QuickQuestionCacheStore {
  if (inMemoryStore !== null) return inMemoryStore;

  const storage = resolveStorage();
  if (!storage) {
    inMemoryStore = {};
    return inMemoryStore;
  }

  const raw = storage.getItem(QUICK_QUESTION_STORAGE_KEY);
  inMemoryStore = purgeExpiredQuickQuestionEntries(raw ? parseStore(raw) : {});
  return inMemoryStore;
}

function persistQuickQuestionCache(store: QuickQuestionCacheStore): void {
  inMemoryStore = store;
  const storage = resolveStorage();
  if (!storage) return;
  try {
    storage.setItem(QUICK_QUESTION_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Best-effort persistence
  }
}

export function getCachedQuickQuestionResponse(
  crashSignature: string,
  question: string,
  mode: MimbotChatMode,
  now = clock()
): string | null {
  const key = buildQuickQuestionCacheKey(crashSignature, question, mode);
  const store = loadQuickQuestionCache();
  const entry = store[key];
  if (!entry) return null;
  if (now - entry.cachedAt > QUICK_QUESTION_TTL_MS) {
    const nextStore = { ...store };
    delete nextStore[key];
    persistQuickQuestionCache(nextStore);
    return null;
  }
  return entry.response;
}

export function saveQuickQuestionResponse(
  crashSignature: string,
  question: string,
  mode: MimbotChatMode,
  response: string,
  now = clock()
): void {
  const key = buildQuickQuestionCacheKey(crashSignature, question, mode);
  const store = purgeExpiredQuickQuestionEntries(loadQuickQuestionCache(), now);
  store[key] = {
    key,
    crashSignature,
    question: normalizeMimbotQuestion(question),
    mode,
    response,
    cachedAt: now,
  };
  persistQuickQuestionCache(store);
}

/** Test helpers */
export function _resetQuickQuestionCacheForTests(): void {
  inMemoryStore = null;
  storageOverride = undefined;
  clock = () => Date.now();
}

export function _configureQuickQuestionCacheForTests(options: {
  storage?: StorageLike | null;
  now?: number | (() => number);
}): void {
  inMemoryStore = null;
  storageOverride = options.storage === undefined ? null : options.storage;
  if (typeof options.now === "function") {
    clock = options.now;
  } else if (typeof options.now === "number") {
    const fixed = options.now;
    clock = () => fixed;
  } else {
    clock = () => Date.now();
  }
}
