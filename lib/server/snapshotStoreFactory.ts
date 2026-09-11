import path from "node:path";
import { getPortableDir } from "@/lib/core/settings";
import { FileSnapshotStore } from "@mim/server-engine/fileSnapshotStore";

export function getServerSnapshotStoreRoot(): string {
  return path.join(getPortableDir(), "server-manager");
}

export function createServerSnapshotStore(): FileSnapshotStore {
  return new FileSnapshotStore(getServerSnapshotStoreRoot());
}
