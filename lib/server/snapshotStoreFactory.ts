import path from "node:path";
import { getMimIndexPath } from "@/lib/core/settings";
import { FileSnapshotStore } from "@mim/server-engine/fileSnapshotStore";

export function getServerSnapshotStoreRoot(): string {
  return path.join(getMimIndexPath(), "server-manager");
}

export function createServerSnapshotStore(): FileSnapshotStore {
  return new FileSnapshotStore(getServerSnapshotStoreRoot());
}
