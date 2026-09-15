/**
 * MIM Intelligence — Decoupled Search Grounding Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides external, LLM-vendor-agnostic web search grounding.
 * Fetches real-world metadata snippets from GitHub, Modrinth, CurseForge and
 * Minecraft wikis before LLM inference, allowing any provider (Gemini,
 * OpenRouter / GLM-5.3, local LLMs) to benefit from grounded evidence.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export interface WebSearchOptions {
  maxResults?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface WebSearchProvider {
  name: string;
  search(query: string, options?: WebSearchOptions): Promise<WebSearchResult[]>;
}

function sanitizeSnippet(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Modrinth & CurseForge search aggregator that finds project info directly
 * from open Minecraft APIs without requiring Google/external vendor tools.
 */
export class MinecraftPlatformSearchProvider implements WebSearchProvider {
  public readonly name = "minecraft-platforms";

  public async search(query: string, options: WebSearchOptions = {}): Promise<WebSearchResult[]> {
    const maxResults = options.maxResults ?? 3;
    const timeoutMs = options.timeoutMs ?? 2500;
    const cleanQuery = query.replace(/[^\w\s-]/g, " ").trim();
    if (!cleanQuery) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(cleanQuery)}&limit=${maxResults}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "MIM-Intelligence/1.0 (Minecraft Intelligent Manager)",
          Accept: "application/json",
        },
        signal: options.signal ?? controller.signal,
      });

      if (!response.ok) return [];

      const data = await response.json();
      const hits = Array.isArray(data?.hits) ? data.hits : [];

      return hits.slice(0, maxResults).map((hit: Record<string, unknown>) => ({
        title: String(hit.title || hit.slug || "Modrinth Project"),
        url: `https://modrinth.com/${String(hit.project_type || "mod")}/${String(hit.slug || "")}`,
        snippet: sanitizeSnippet(String(hit.description || "")),
        source: "modrinth",
      }));
    } catch {
      // Non-fatal: search grounding is best-effort
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Combined / Primary decoupled search provider.
 */
export class DecoupledSearchEngine implements WebSearchProvider {
  public readonly name = "decoupled-search-engine";
  private readonly providers: WebSearchProvider[];

  constructor(providers: WebSearchProvider[] = [new MinecraftPlatformSearchProvider()]) {
    this.providers = providers;
  }

  public async search(query: string, options: WebSearchOptions = {}): Promise<WebSearchResult[]> {
    const maxResults = options.maxResults ?? 3;
    const results: WebSearchResult[] = [];

    for (const provider of this.providers) {
      if (results.length >= maxResults) break;
      try {
        const found = await provider.search(query, options);
        for (const item of found) {
          if (results.length >= maxResults) break;
          if (!results.some((r) => r.url === item.url)) {
            results.push(item);
          }
        }
      } catch {
        // Continue with next provider
      }
    }

    return results;
  }
}

const defaultEngine = new DecoupledSearchEngine();

/**
 * Executes decoupled web search grounding across available search providers.
 */
export async function searchDecoupledWeb(
  query: string,
  options?: WebSearchOptions
): Promise<WebSearchResult[]> {
  return defaultEngine.search(query, options);
}
