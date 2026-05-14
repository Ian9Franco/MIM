import { getApiKey } from "@/lib/settings";

const MODRINTH_API = "https://api.modrinth.com/v2";
const MODRINTH_API_V3 = "https://api.modrinth.com/v3";

export function buildHeaders() {
  let token = getApiKey("modrinth");
  if (!token) return null;
  if (!token.startsWith("mrp_") && !token.startsWith("Bearer ") && token.length < 100) {
    token = `mrp_${token}`;
  }
  return { 
    "User-Agent": "MIM-App/1.0 (contact@mim.local)", 
    "Authorization": token 
  };
}

export async function tryFetchUserCollections(userId: string, headers: Record<string, string>) {
  const collections: any[] = [];
  const seenIds = new Set<string>();
  try {
    const res = await fetch(`${MODRINTH_API_V3}/user/${userId}/collections`, { headers, cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const coll of data) {
          if (!seenIds.has(coll.id)) {
            collections.push(coll);
            seenIds.add(coll.id);
          }
        }
      }
    }
  } catch {}
  return collections;
}

export async function getAuthorName(projectId: string, headers: any) {
  try {
    const res = await fetch(`${MODRINTH_API}/project/${projectId}/members`, { headers, cache: "force-cache" });
    if (res.ok) {
      const members = await res.json();
      const owner = members.find((m: any) => m.role?.toLowerCase() === "owner" || m.is_owner === true) || members[0];
      return owner?.user?.username || "Desconocido";
    }
  } catch {}
  return "Desconocido";
}
