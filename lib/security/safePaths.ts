import fs from "fs";
import path from "path";

export class UnsafePathError extends Error {
  constructor() { super("Acceso no autorizado: ruta fuera del directorio permitido"); }
}

/** A Windows-safe single segment, even when the server runs on Unix. */
export function assertPathSegment(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() ||
      value === "." || value === ".." || /[<>:"/\\|?*\x00-\x1f]/.test(value) ||
      /[. ]$/.test(value) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value)) {
    throw new UnsafePathError();
  }
}

/** Reject traversal and symlinks/junctions beneath the trusted, configured root.
 * Missing components are allowed for new files; existing ancestors are checked.
 */
export function resolveWithin(root: string, relative: string, allowRoot = false): string {
  if (typeof relative !== "string" || path.isAbsolute(relative) || path.win32.isAbsolute(relative)) {
    throw new UnsafePathError();
  }
  const segments = relative.split(/[\\/]/);
  if (relative !== "") segments.forEach(assertPathSegment);
  const base = path.resolve(root);
  const target = path.resolve(base, ...segments);
  const rel = path.relative(base, target);
  if ((!allowRoot && !rel) || rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new UnsafePathError();
  }
  let cursor = base;
  for (const segment of rel ? rel.split(path.sep) : []) {
    cursor = path.join(cursor, segment);
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) throw new UnsafePathError();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return target;
}
