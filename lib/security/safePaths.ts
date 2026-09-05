import fs from "fs";
import path from "path";

/** Raised when user-controlled path input escapes or aliases a trusted root. */
export class UnsafePathError extends Error {
  constructor(message = "Acceso no autorizado: ruta fuera del directorio permitido") {
    super(message);
    this.name = "UnsafePathError";
  }
}

/**
 * Validate one Windows-compatible filesystem segment.
 * MIM Desktop targets Windows, so reject names that would be unsafe or ambiguous there
 * even when tests execute on another operating system.
 */
export function assertPathSegment(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value !== value.trim() ||
    value === "." ||
    value === ".." ||
    /[<>:"/\\|?*\x00-\x1f]/.test(value) ||
    /[. ]$/.test(value) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value)
  ) {
    throw new UnsafePathError("Nombre o segmento de ruta no permitido");
  }
}

function assertNoSymlinkInAncestry(base: string, relation: string): void {
  let cursor = base;
  for (const segment of relation ? relation.split(path.sep) : []) {
    cursor = path.join(cursor, segment);
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) {
        throw new UnsafePathError("Acceso no autorizado: enlace simbólico fuera del perímetro permitido");
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      break;
    }
  }
}

/**
 * Resolve a user-controlled relative path strictly below a trusted root.
 * Existing symlink/junction components are rejected so containment cannot be bypassed
 * after lexical path validation. Missing descendants are allowed for new files.
 */
export function resolveWithin(root: string, relative: string, allowRoot = false): string {
  if (typeof relative !== "string" || path.isAbsolute(relative) || path.win32.isAbsolute(relative)) {
    throw new UnsafePathError();
  }

  const clean = relative.replace(/[\\/]+$/, "");
  const segments = clean === "" ? [] : clean.split(/[\\/]/);
  for (const segment of segments) assertPathSegment(segment);

  const base = path.resolve(root);
  const target = path.resolve(base, ...segments);
  const relation = path.relative(base, target);

  if (
    (!allowRoot && relation === "") ||
    relation === ".." ||
    relation.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relation)
  ) {
    throw new UnsafePathError();
  }

  assertNoSymlinkInAncestry(base, relation);

  return target;
}
