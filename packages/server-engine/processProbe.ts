import type { ReadOnlyFileTransport } from "@mim/contracts-core/server";
import type { ServerRuntimeStatus } from "./safety";

export interface ServerProcessProbe {
  status: ServerRuntimeStatus;
  evidence: string;
  /** SFTP cannot start/stop the JVM; control stays with the hosting panel. */
  controllable: false;
  lockPath?: string;
}

function lockCandidates(levelName: string): string[] {
  const names = [levelName.trim() || "world", "world"];
  return [...new Set(names)].map((name) => `${name}/session.lock`);
}

/**
 * Best-effort process inference over SFTP.
 * A live Minecraft world holds `session.lock`. Absence is not proof of a stopped JVM.
 */
export async function probeServerProcess(
  transport: ReadOnlyFileTransport,
  levelName = "world"
): Promise<ServerProcessProbe> {
  const candidates = lockCandidates(levelName);

  for (const lockPath of candidates) {
    try {
      const bytes = await transport.read(lockPath);
      if (bytes.byteLength > 0) {
        return {
          status: "online",
          evidence: `Hay ${lockPath}: el mundo está abierto por un proceso de Minecraft.`,
          controllable: false,
          lockPath,
        };
      }
    } catch {
      /* missing or unreadable — try next */
    }
  }

  const worldDir = (levelName.trim() || "world").replace(/\\/g, "/");
  try {
    const entries = await transport.list(worldDir);
    const hasLock = entries.some((entry) => entry.kind === "file" && entry.name.toLowerCase() === "session.lock");
    if (hasLock) {
      return {
        status: "online",
        evidence: `La carpeta ${worldDir} lista session.lock.`,
        controllable: false,
        lockPath: `${worldDir}/session.lock`,
      };
    }
    return {
      status: "offline",
      evidence: `La carpeta ${worldDir} no tiene session.lock. No certifica que el proceso esté detenido.`,
      controllable: false,
    };
  } catch {
    return {
      status: "unknown",
      evidence: "No se pudo leer el mundo remoto. El estado del proceso queda sin verificar.",
      controllable: false,
    };
  }
}

export function processControlFromProbe(probe: ServerProcessProbe) {
  return {
    async status() {
      return probe.status;
    },
    async start() {
      throw new Error("Process start is not available over SFTP.");
    },
    async stop() {
      throw new Error("Process stop is not available over SFTP.");
    },
    async restart() {
      throw new Error("Process restart is not available over SFTP.");
    },
  };
}
