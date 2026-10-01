import { dbCore } from "@/lib/db/core";
import type { DownloadSessionState } from "@/lib/downloads/downloadTypes";

export type PersistedDownloadSession = DownloadSessionState;

export async function saveDownloadSession(session: PersistedDownloadSession): Promise<void> {
  const db = await dbCore.init();
  await db.put("downloadSessions", session);
}

export async function loadAllDownloadSessions(): Promise<PersistedDownloadSession[]> {
  const db = await dbCore.init();
  return db.getAll("downloadSessions");
}

export async function deleteDownloadSession(sessionId: string): Promise<void> {
  const db = await dbCore.init();
  await db.delete("downloadSessions", sessionId);
}
