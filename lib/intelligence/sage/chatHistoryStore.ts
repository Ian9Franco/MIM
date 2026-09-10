/**
 * BOT-01 — Opt-in local chat history keyed by crash signature.
 */

export const CHAT_HISTORY_ENABLED_KEY = "mim_bot_chat_history_enabled";
export const CHAT_HISTORY_STORE_KEY = "mim_sage_chat_history";

export type StoredChatMessage = {
  role: "user" | "model";
  text: string;
};

export type ChatHistoryEntry = {
  crashSignature: string;
  updatedAt: number;
  messages: StoredChatMessage[];
};

export type ChatHistoryStore = Record<string, ChatHistoryEntry>;

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

let inMemoryStore: ChatHistoryStore | null = null;
let storageOverride: StorageLike | null | undefined;

function resolveStorage(): StorageLike | null {
  if (storageOverride !== undefined) return storageOverride;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseStore(raw: string): ChatHistoryStore {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as ChatHistoryStore;
  } catch {
    return {};
  }
}

export function loadChatHistoryStore(): ChatHistoryStore {
  if (inMemoryStore !== null) return inMemoryStore;

  const storage = resolveStorage();
  if (!storage) {
    inMemoryStore = {};
    return inMemoryStore;
  }

  inMemoryStore = parseStore(storage.getItem(CHAT_HISTORY_STORE_KEY) ?? "{}");
  return inMemoryStore;
}

function persistChatHistoryStore(store: ChatHistoryStore): void {
  inMemoryStore = store;
  const storage = resolveStorage();
  if (!storage) return;
  try {
    storage.setItem(CHAT_HISTORY_STORE_KEY, JSON.stringify(store));
  } catch {
    // Best-effort persistence
  }
}

export function isChatHistoryEnabled(): boolean {
  const storage = resolveStorage();
  if (!storage) return false;
  try {
    return storage.getItem(CHAT_HISTORY_ENABLED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setChatHistoryEnabled(enabled: boolean): void {
  const storage = resolveStorage();
  if (!storage) return;
  try {
    storage.setItem(CHAT_HISTORY_ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore write failures
  }
}

export function loadChatHistory(crashSignature: string): StoredChatMessage[] {
  const entry = loadChatHistoryStore()[crashSignature];
  if (!entry || !Array.isArray(entry.messages)) return [];
  return entry.messages.filter(
    (msg) =>
      (msg.role === "user" || msg.role === "model") &&
      typeof msg.text === "string" &&
      msg.text.trim().length > 0
  );
}

export function saveChatHistory(
  crashSignature: string,
  messages: StoredChatMessage[],
  updatedAt = Date.now()
): void {
  if (messages.length === 0) return;
  const store = { ...loadChatHistoryStore() };
  store[crashSignature] = {
    crashSignature,
    updatedAt,
    messages,
  };
  persistChatHistoryStore(store);
}

export function clearChatHistory(crashSignature: string): void {
  const store = { ...loadChatHistoryStore() };
  if (!store[crashSignature]) return;
  delete store[crashSignature];
  persistChatHistoryStore(store);
}

export function clearAllChatHistory(): void {
  persistChatHistoryStore({});
}

/** Test helpers */
export function _resetChatHistoryStoreForTests(): void {
  inMemoryStore = null;
  storageOverride = undefined;
}

export function _configureChatHistoryStoreForTests(storage: StorageLike | null): void {
  inMemoryStore = null;
  storageOverride = storage;
}
