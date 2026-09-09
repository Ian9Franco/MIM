/**
 * Server Remote Console (RCON) & Command Execution Engine (SRV-6b)
 * Provides command sanitization, color stripping, and execution helpers.
 */

import type {
  CommandChannel,
  RconCommandResult,
} from "@mim/contracts-core/server";

/**
 * Strips Minecraft color codes (§0-§f, §k-§r) and ANSI escape codes from console text.
 */
export function stripMinecraftFormatting(text: string): string {
  // Strip section symbol formatting (§a, §1, §l, etc.)
  const noMinecraftCodes = text.replace(/§[0-9a-fk-or]/gi, "");
  // Strip ANSI terminal color escapes
  // eslint-disable-next-line no-control-regex
  return noMinecraftCodes.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "").trim();
}

/**
 * Validates whether a command is safe for execution over RCON.
 */
export function validateCommandSafety(command: string): { safe: boolean; reason?: string } {
  const trimmed = command.trim().replace(/^\//, "");
  const baseCommand = trimmed.split(/\s+/)[0]?.toLowerCase();

  // Flag potentially hazardous commands that may terminate server or corrupt state without warning
  if (baseCommand === "stop") {
    return {
      safe: false,
      reason: "Direct 'stop' command issued via RCON. Use ProcessControl.stop() for managed shutdown.",
    };
  }

  return { safe: true };
}

/**
 * Executes a console command through a CommandChannel, timing and formatting the output.
 */
export async function executeConsoleCommand(
  channel: CommandChannel,
  command: string,
  options: { allowDangerous?: boolean; timeoutMs?: number } = {}
): Promise<RconCommandResult> {
  const startTime = Date.now();
  const normalizedCommand = command.trim().replace(/^\//, "");

  const safetyCheck = validateCommandSafety(normalizedCommand);
  if (!safetyCheck.safe && !options.allowDangerous) {
    return {
      command: normalizedCommand,
      response: `Command blocked: ${safetyCheck.reason}`,
      success: false,
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  try {
    const rawResult = await channel.execute(normalizedCommand);
    const cleanedOutput = stripMinecraftFormatting(rawResult.output || "");

    return {
      command: normalizedCommand,
      response: cleanedOutput,
      success: rawResult.accepted,
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      command: normalizedCommand,
      response: `Execution failed: ${message}`,
      success: false,
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }
}
