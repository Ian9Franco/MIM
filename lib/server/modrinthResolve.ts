import { fetchJsonWithRetry } from "@/lib/core/fetchJsonWithRetry";

interface ModrinthVersionFile {
  url: string;
  filename: string;
  hashes?: { sha256?: string; sha512?: string; sha1?: string };
}

interface ModrinthVersionResponse {
  id: string;
  files: ModrinthVersionFile[];
}

/** Resolves a Modrinth version to a direct HTTPS download URL. */
export async function resolveModrinthDownloadUrl(
  projectId: string,
  versionId: string,
  preferredFilename?: string
): Promise<{ url: string; filename: string; sha256?: string } | null> {
  const response = await fetchJsonWithRetry<ModrinthVersionResponse>(
    `https://api.modrinth.com/v2/version/${encodeURIComponent(versionId)}`,
    { method: "GET", retries: 2, retryDelayMs: 400 }
  );
  if (!response.ok || !response.data.files?.length) return null;
  const files = response.data.files;
  const primary =
    files.find((file: ModrinthVersionFile) => file.filename === preferredFilename) ||
    files.find((file: ModrinthVersionFile) => file.filename.toLowerCase().endsWith(".jar")) ||
    files[0];
  if (!primary?.url?.startsWith("https://")) return null;
  return {
    url: primary.url,
    filename: primary.filename,
    sha256: primary.hashes?.sha256,
  };
}
