const LEGACY_GEMINI_STORAGE_KEY = "mim_gemini_api_key";

/**
 * One-way migration for renderer versions that duplicated Gemini credentials
 * in localStorage. The value is removed only after the secure settings API
 * confirms that a credential is configured.
 */
export async function migrateLegacyBrowserGeminiKey(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  let legacyKey = "";
  try {
    legacyKey = window.localStorage.getItem(LEGACY_GEMINI_STORAGE_KEY)?.trim() || "";
  } catch {
    return false;
  }
  if (!legacyKey) return false;

  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ geminiApiKey: legacyKey }),
  });
  if (!response.ok) return false;

  const result = await response.json();
  if (!result?.apiKeysConfigured?.geminiApiKey) return false;
  window.localStorage.removeItem(LEGACY_GEMINI_STORAGE_KEY);
  return true;
}
