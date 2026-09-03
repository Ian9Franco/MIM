/**
 * SAGE 2.0 — Log & Stacktrace Parser
 * ─────────────────────────────────────────────────────────────────────────────
 * Cleans ANSI codes, identifies runtime environments (Loader, MC, Java, OS),
 * extracts stacktrace frames, and normalizes mixin injection points.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CrashEnvironment, ModLoaderType, NormalizedFrame } from "./types";

// ANSI escape code regular expression
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

export function stripAnsi(input: string): string {
  return input.replace(ANSI_REGEX, "");
}

export function parseCrashEnvironment(rawLog: string): CrashEnvironment {
  const clean = stripAnsi(rawLog);
  const lines = clean.split(/\r?\n/);

  let minecraftVersion: string | undefined;
  let loader: ModLoaderType = "unknown";
  let loaderVersion: string | undefined;
  let javaVersion: string | undefined;
  let operatingSystem: string | undefined;
  let hasModList = false;

  const isHybridConnector =
    clean.includes("org.sinytra.connector") ||
    clean.includes("org/sinytra/connector") ||
    clean.toLowerCase().includes("sinytra connector");

  for (const line of lines) {
    // 1. Detect Minecraft Version
    if (!minecraftVersion) {
      const mcMatch = line.match(/Minecraft Version:\s*([0-9.]+)/i) ||
                      line.match(/Minecraft version\s*([0-9.]+)/i);
      if (mcMatch) minecraftVersion = mcMatch[1].trim();
    }

    // 2. Detect Mod Loader
    if (loader === "unknown") {
      if (line.includes("Fabric Loader") || line.includes("net.fabricmc.loader")) {
        loader = "fabric";
        const vMatch = line.match(/Fabric Loader\s*([0-9.]+)/i);
        if (vMatch) loaderVersion = vMatch[1];
      } else if (line.includes("NeoForge") || line.includes("net.neoforged")) {
        loader = "neoforge";
        const vMatch = line.match(/NeoForge:\s*([0-9.]+)/i);
        if (vMatch) loaderVersion = vMatch[1];
      } else if (line.includes("Minecraft Forge") || line.includes("net.minecraftforge")) {
        loader = "forge";
        const vMatch = line.match(/Minecraft Forge:\s*([0-9.]+)/i);
        if (vMatch) loaderVersion = vMatch[1];
      } else if (line.includes("Quilt Loader") || line.includes("org.quiltmc.loader")) {
        loader = "quilt";
      }
    }

    // 3. Detect Java Version
    if (!javaVersion) {
      const jvmMatch = line.match(/Java Version:\s*([0-9._-]+)/i) ||
                       line.match(/Java version\s*([0-9._-]+)/i) ||
                       line.match(/Java:\s*([0-9._-]+)/i);
      if (jvmMatch) javaVersion = jvmMatch[1].trim();
    }

    // 4. Detect OS
    if (!operatingSystem) {
      const osMatch = line.match(/Operating System:\s*([^\r\n]+)/i);
      if (osMatch) operatingSystem = osMatch[1].trim();
    }

    // 5. Detect Mod List Presence
    if (line.includes("Mods:") || line.includes("A list of mods") || line.includes("Fabric mods:") || line.includes("Loaded coremods:")) {
      hasModList = true;
    }
  }

  if (loader === "unknown" && (clean.includes("net.minecraft.client.main.Main") || clean.includes("net.minecraft.server.MinecraftServer"))) {
    loader = "vanilla";
  }

  return {
    minecraftVersion,
    loader,
    loaderVersion,
    javaVersion,
    operatingSystem,
    isHybridConnector,
    hasModList,
    totalLines: lines.length
  };
}

const STACK_FRAME_REGEX = /^\s*at\s+([a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)+)\.([a-zA-Z0-9_$<>]+)\(([^:)]+)?(?::(\d+))?\)/;

export function parseNormalizedStack(rawLog: string): NormalizedFrame[] {
  const clean = stripAnsi(rawLog);
  const lines = clean.split(/\r?\n/);
  const frames: NormalizedFrame[] = [];

  for (const line of lines) {
    const match = line.match(STACK_FRAME_REGEX);
    if (match) {
      const className = match[1];
      const methodName = match[2];
      const fileName = match[3];
      const lineNumber = match[4] ? parseInt(match[4], 10) : undefined;

      const isMixin =
        className.includes("mixin") ||
        methodName.includes("handler$") ||
        methodName.includes("redirect$") ||
        methodName.includes("modifyArg$") ||
        methodName.includes("modifyVariable$") ||
        className.includes("org.spongepowered.asm.mixin");

      let mixinTarget: string | undefined;
      if (isMixin) {
        const targetMatch = line.match(/from\s+mod\s+([a-zA-Z0-9_-]+)/i) ||
                            className.match(/\.([a-zA-Z0-9_-]+)\.mixin\./i);
        if (targetMatch) mixinTarget = targetMatch[1];
      }

      frames.push({
        raw: line.trim(),
        className,
        methodName,
        fileName,
        lineNumber,
        isMixin,
        mixinTarget
      });
    }
  }

  return frames;
}

export function extractExceptionChain(rawLog: string): string[] {
  const clean = stripAnsi(rawLog);
  const lines = clean.split(/\r?\n/);
  const exceptions: string[] = [];

  for (const line of lines) {
    if (line.includes("Exception:") || line.includes("Error:") || line.startsWith("Caused by:")) {
      exceptions.push(line.trim());
    }
  }

  return exceptions;
}
