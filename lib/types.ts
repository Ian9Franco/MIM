import type { Loader } from "./constants";

export interface PendingFile {
  path: string;
  fileName: string;
  meta?: { version?: string; loader?: string; gameVersion?: string; modVersion?: string; modName?: string; modId?: string; projectType?: string };
}

export interface LibraryFile extends PendingFile {
  category: string;
  sub: string;
}

export interface Project {
  id: string;
  name: string;
  version: string;
  loader: Loader;
}
