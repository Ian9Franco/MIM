import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
const line = fs.readFileSync(envPath, "utf8").split(/\r?\n/).find((l) => l.startsWith("CURSEFORGE_API_KEY="));
const raw = line ? line.slice("CURSEFORGE_API_KEY=".length).trim() : "";
const key = raw.replace(/^["']|["']$/g, "");

const meta = {
  configured: Boolean(key),
  length: key.length,
  expectedLength: 60,
  lengthOk: key.length === 60,
  bcryptPrefix: /^\$2[aby]\$/.test(key),
  hasQuotesInFile: /^["']/.test(raw),
};

async function probe(label, url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "x-api-key": key,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = text.slice(0, 240);
  try {
    const json = JSON.parse(text);
    body = JSON.stringify({
      ok: json?.ok,
      error: json?.error,
      dataKeys: json?.data ? Object.keys(json.data).slice(0, 6) : undefined,
      totalCount: json?.pagination?.totalCount,
      featuredCount: Array.isArray(json?.data?.featured) ? json.data.featured.length : undefined,
    });
  } catch {
    // keep text slice
  }
  return { label, status: res.status, statusText: res.statusText, body };
}

const results = await Promise.all([
  probe("games/432", "https://api.curseforge.com/v1/games/432"),
  probe(
    "mods/search",
    "https://api.curseforge.com/v1/mods/search?gameId=432&classId=6&pageSize=3&sortField=1&sortOrder=desc&index=0",
  ),
  probe("mods/featured", "https://api.curseforge.com/v1/mods/featured", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId: 432, excludedModIds: [], gameVersionTypeId: null }),
  }),
]);

console.log(JSON.stringify({ meta, results }, null, 2));
