/** Server-only CurseForge key for hub API routes. */
export function getCurseForgeApiKey(): string {
  return process.env.CURSEFORGE_API_KEY?.trim() || "";
}

export function requireCurseForgeApiKey(): string | null {
  const apiKey = getCurseForgeApiKey();
  return apiKey || null;
}
