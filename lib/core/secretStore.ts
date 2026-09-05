export const API_KEY_FIELDS = [
  "modrinthApiKey",
  "curseforgeApiKey",
  "virusTotalApiKey",
  "geminiApiKey",
] as const;

export type ApiKeyField = (typeof API_KEY_FIELDS)[number];
export type ApiKeyUpdates = Partial<Record<ApiKeyField, string>>;
export type ApiKeyStatus = Record<ApiKeyField, boolean>;

const ENVIRONMENT_KEYS: Record<ApiKeyField, string> = {
  modrinthApiKey: "MIM_SECRET_MODRINTH",
  curseforgeApiKey: "MIM_SECRET_CURSEFORGE",
  virusTotalApiKey: "MIM_SECRET_VIRUSTOTAL",
  geminiApiKey: "MIM_SECRET_GEMINI",
};

const runtimeSecrets: ApiKeyUpdates = {};
for (const field of API_KEY_FIELDS) {
  const value = process.env[ENVIRONMENT_KEYS[field]];
  if (value) runtimeSecrets[field] = value;
}

type SecretReply = {
  type: "mim:secrets:updated";
  requestId: string;
  ok: boolean;
  error?: string;
};

const pending = new Map<string, { resolve: () => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
let listenerInstalled = false;

function installReplyListener(): void {
  if (listenerInstalled || typeof process.on !== "function") return;
  listenerInstalled = true;
  process.on("message", (message: unknown) => {
    const reply = message as Partial<SecretReply> | null;
    if (reply?.type !== "mim:secrets:updated" || typeof reply.requestId !== "string") return;
    const request = pending.get(reply.requestId);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(reply.requestId);
    if (reply.ok) request.resolve();
    else request.reject(new Error(reply.error || "Electron rejected the secret update"));
  });
}

export function getStoredApiKey(field: ApiKeyField): string {
  return runtimeSecrets[field] || "";
}

export function getApiKeyStatus(): ApiKeyStatus {
  return Object.fromEntries(API_KEY_FIELDS.map((field) => [field, Boolean(runtimeSecrets[field])])) as ApiKeyStatus;
}

export function hydrateSessionApiKeys(updates: ApiKeyUpdates): void {
  for (const field of API_KEY_FIELDS) {
    const value = updates[field]?.trim();
    if (value) runtimeSecrets[field] = value;
  }
}

export async function updateStoredApiKeys(updates: ApiKeyUpdates): Promise<{ persisted: boolean }> {
  const normalized: ApiKeyUpdates = {};
  for (const field of API_KEY_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(updates, field)) continue;
    normalized[field] = typeof updates[field] === "string" ? updates[field]!.trim() : "";
  }

  if (Object.keys(normalized).length === 0) return { persisted: Boolean(process.send) };

  if (typeof process.send === "function") {
    installReplyListener();
    const requestId = `secrets-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error("Timed out while persisting secrets through Electron safeStorage"));
      }, 5000);
      pending.set(requestId, { resolve, reject, timer });
      process.send!({ type: "mim:secrets:update", requestId, secrets: normalized });
    });
  }

  for (const field of API_KEY_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(normalized, field)) continue;
    if (normalized[field]) runtimeSecrets[field] = normalized[field];
    else delete runtimeSecrets[field];
  }

  // Plain `next dev` has no Electron parent. Keys remain session-only rather
  // than silently falling back to plaintext persistence.
  return { persisted: typeof process.send === "function" };
}
