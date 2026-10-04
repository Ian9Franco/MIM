import { draftItemPlatformUrl } from "./draftItemPlatformUrl";

export const PREFLIGHT_FAILED_STASH_KEY = "mim-draft-preflight-failed-v1";

export type PreflightFailedStashEntry = {
  id: string;
  projectId: string;
  modName: string;
  source: string;
  contentType: string;
  error: string;
  platformUrl: string;
};

export type PreflightFailedStash = {
  savedAt: string;
  branch: string;
  loader: string;
  gameVersion: string;
  entries: PreflightFailedStashEntry[];
};

export function buildStashEntry(item: {
  id?: string;
  project_id?: string;
  mod_name?: string;
  source?: string | null;
  content_type?: string | null;
}, error: string): PreflightFailedStashEntry {
  return {
    id: String(item.id || item.project_id || ""),
    projectId: String(item.project_id || ""),
    modName: String(item.mod_name || item.project_id || "—"),
    source: String(item.source || "modrinth"),
    contentType: String(item.content_type || "mod"),
    error,
    platformUrl: draftItemPlatformUrl(item),
  };
}

export function readPreflightFailedStash(): PreflightFailedStash | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PREFLIGHT_FAILED_STASH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PreflightFailedStash;
    if (!parsed || !Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePreflightFailedStash(stash: PreflightFailedStash): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PREFLIGHT_FAILED_STASH_KEY, JSON.stringify(stash));
}

export function mergePreflightFailedStash(
  branch: string,
  loader: string,
  gameVersion: string,
  newEntries: PreflightFailedStashEntry[],
): PreflightFailedStash {
  const existing = readPreflightFailedStash();
  const byId = new Map<string, PreflightFailedStashEntry>();
  for (const entry of existing?.entries || []) byId.set(entry.id, entry);
  for (const entry of newEntries) byId.set(entry.id, entry);
  return {
    savedAt: new Date().toISOString(),
    branch,
    loader,
    gameVersion,
    entries: [...byId.values()],
  };
}

export function clearPreflightFailedStash(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(PREFLIGHT_FAILED_STASH_KEY);
}

export function formatPreflightFailureReport(
  rows: Array<{ modName: string; error: string; platformUrl: string; storedVersionId?: string }>,
  header: string,
): string {
  const lines = [header, ""];
  for (const row of rows) {
    const urlPart = row.platformUrl ? ` | ${row.platformUrl}` : "";
    const draftPart = row.storedVersionId ? ` (draft: ${row.storedVersionId})` : "";
    lines.push(`FAIL ${row.modName}${draftPart} — ${row.error}${urlPart}`);
  }
  return lines.join("\n");
}
