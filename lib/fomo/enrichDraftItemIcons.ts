type DraftItemRow = {
  project_id: string;
  source?: string | null;
  icon_url?: string | null;
  iconUrl?: string | null;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Rellena icon_url faltantes vía APIs de Modrinth / CurseForge. */
export async function enrichDraftItemsWithIcons<T extends DraftItemRow>(
  items: T[],
  request: typeof fetch = fetch,
): Promise<T[]> {
  const missing = items.filter((item) => !item.icon_url && !item.iconUrl);
  if (!missing.length) return items;

  const iconMap = new Map<string, string>();

  const modrinthIds = [
    ...new Set(
      missing
        .filter((item) => item.source !== "curseforge")
        .map((item) => String(item.project_id))
        .filter(Boolean),
    ),
  ];

  for (const ids of chunk(modrinthIds, 50)) {
    try {
      const res = await request(
        `/api/modrinth/projects?ids=${encodeURIComponent(JSON.stringify(ids))}`,
      );
      if (!res.ok) continue;
      const data = (await res.json()) as { mods?: { projectId: string; iconUrl?: string | null }[] };
      for (const mod of data.mods || []) {
        if (mod.iconUrl) iconMap.set(mod.projectId, mod.iconUrl);
      }
    } catch {
      // Best-effort enrichment; cards fall back to type icon.
    }
  }

  const curseforgeItems = missing.filter((item) => item.source === "curseforge");
  await Promise.all(
    curseforgeItems.map(async (item) => {
      try {
        const res = await request(
          `/api/curseforge/project?projectId=${encodeURIComponent(String(item.project_id))}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { iconUrl?: string; logo?: { url?: string } };
        const icon = data.iconUrl || data.logo?.url;
        if (icon) iconMap.set(String(item.project_id), icon);
      } catch {
        // ignore
      }
    }),
  );

  if (!iconMap.size) return items;

  return items.map((item) => {
    const existing = item.icon_url || item.iconUrl;
    if (existing) return item;
    const icon = iconMap.get(String(item.project_id));
    return icon ? { ...item, icon_url: icon } : item;
  });
}
