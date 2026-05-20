/**
 * Client-side JSON fetch with small retries. Helps when the embedded Next server
 * or Turbopack is still waking up on first navigation (TypeError: Failed to fetch).
 */
export async function fetchJsonWithRetry<T = unknown>(
  path: string,
  options?: RequestInit & { retries?: number; retryDelayMs?: number }
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const retries = options?.retries ?? 3;
  const retryDelayMs = options?.retryDelayMs ?? 400;
  const { retries: _r, retryDelayMs: _d, ...init } = options ?? {};

  const url =
    typeof window !== "undefined" && path.startsWith("/")
      ? new URL(path, window.location.origin).toString()
      : path;

  let lastMessage = "Failed to fetch";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        lastMessage = `HTTP ${res.status}`;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
          continue;
        }
        return { ok: false, error: lastMessage };
      }
      const data = (await res.json()) as T;
      return { ok: true, data };
    } catch (e: unknown) {
      lastMessage = e instanceof Error ? e.message : String(e);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
      }
    }
  }

  return { ok: false, error: lastMessage };
}
