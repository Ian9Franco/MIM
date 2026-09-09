/**
 * Remote SAGE Diagnostic System for Minecraft Servers (SRV-5)
 * Analyzes remote crash logs and correlates incidents with recent deployments.
 */

import type {
  ReadOnlyFileTransport,
  RemoteLogEntry,
  ServerCrashCategory,
  ServerSageIncidentReport,
  ServerChangeRecord,
} from "@mim/contracts-core/server";

const CRASH_PATTERNS: Array<{
  pattern: RegExp;
  category: ServerCrashCategory;
  culpritExtractor?: (match: RegExpMatchArray, logText: string) => string[];
  remediationTemplate: (culprits: string[]) => string;
}> = [
  {
    pattern: /(?:requires?\s+['"]?([a-zA-Z0-9_\-]+)['"]?|missing mod:\s*([a-zA-Z0-9_\-]+)|Mandatory dependency\s+([a-zA-Z0-9_\-]+)|['"]?([a-zA-Z0-9_\-]+)['"]?\s+which is missing!)/i,
    category: "missing_dependency",
    culpritExtractor: (match) => {
      const captured = match[1] || match[2] || match[3] || match[4];
      return captured ? [captured.toLowerCase()] : [];
    },
    remediationTemplate: (culprits) =>
      culprits.length > 0
        ? `Install required dependency: '${culprits.join(", ")}' on the server.`
        : "Verify and install missing server-side mod dependencies.",
  },
  {
    pattern: /(?:Incompatible with\s+['"]?([a-zA-Z0-9_\-]+)['"]?|Duplicate mod id\s+['"]?([a-zA-Z0-9_\-]+)['"]?|cannot be loaded together)/i,
    category: "mod_incompatibility",
    culpritExtractor: (match) => {
      const captured = match[1] || match[2];
      return captured ? [captured.toLowerCase()] : [];
    },
    remediationTemplate: (culprits) =>
      culprits.length > 0
        ? `Incompatible or duplicate mod identified: '${culprits.join(", ")}'. Remove or update conflicting versions.`
        : "Check for conflicting mod versions or duplicate mod IDs in the mods folder.",
  },
  {
    pattern: /(?:Mixin apply failed|Critical injection failure|org\.spongepowered\.asm\.mixin)/i,
    category: "mixin_injection_failure",
    culpritExtractor: (_match, logText) => {
      const mixinMatch = logText.match(/in class ['"]?([a-zA-Z0-9_.$]+)['"]?/i);
      return mixinMatch ? [mixinMatch[1]] : [];
    },
    remediationTemplate: (culprits) =>
      culprits.length > 0
        ? `Mixin injection failure originating in '${culprits[0]}'. Update or remove the mod injecting this mixin.`
        : "A mod failed to inject bytecode mixins into Minecraft. Check modloader compatibility.",
  },
  {
    pattern: /(?:UnsupportedClassVersionError|compiled by a more recent version of the Java Runtime \(class file version (\d+))/i,
    category: "java_version_mismatch",
    culpritExtractor: (match) => (match[1] ? [`Java class version ${match[1]}`] : []),
    remediationTemplate: () =>
      "The server is running on an outdated Java version for these mods. Upgrade the server Java Runtime.",
  },
  {
    pattern: /(?:OutOfMemoryError|Java heap space)/i,
    category: "out_of_memory",
    remediationTemplate: () =>
      "Server ran out of memory. Allocate more RAM in the server startup arguments (-Xmx).",
  },
  {
    pattern: /(?:Ticking entity|Entity being ticked|Block entity being ticked)/i,
    category: "ticking_entity",
    culpritExtractor: (_match, logText) => {
      const entityMatch = logText.match(/Entity Type:\s*([a-zA-Z0-9_:]+)/i);
      return entityMatch ? [entityMatch[1]] : [];
    },
    remediationTemplate: (culprits) =>
      culprits.length > 0
        ? `Corrupted or ticking entity detected: '${culprits[0]}'. Remove the entity or restore world chunk backup.`
        : "A ticking entity crashed the server world loop.",
  },
  {
    pattern: /(?:ClassNotFoundException:\s*([a-zA-Z0-9_.$]+)|NoClassDefFoundError:\s*([a-zA-Z0-9_.$]+))/i,
    category: "class_not_found",
    culpritExtractor: (match) => {
      const cls = match[1] || match[2];
      return cls ? [cls] : [];
    },
    remediationTemplate: (culprits) =>
      culprits.length > 0
        ? `Missing class: '${culprits[0]}'. This usually indicates a client-only mod uploaded to the server or a missing library.`
        : "A required Java class was not found in the classpath.",
  },
];

/**
 * Parses raw server log text into structured log entries.
 */
export function parseRemoteServerLog(rawLog: string): RemoteLogEntry[] {
  const lines = rawLog.split(/\r?\n/);
  const entries: RemoteLogEntry[] = [];
  const logLineRegex = /^\[(\d{2}:\d{2}:\d{2})\]\s+\[([^/]+)\/([A-Z]+)\](?:\s+\[([^\]]+)\])?:?\s*(.*)$/;

  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(logLineRegex);
    if (match) {
      entries.push({
        timestamp: match[1],
        thread: match[2],
        level: (match[3] as RemoteLogEntry["level"]) || "INFO",
        logger: match[4],
        message: match[5],
      });
    } else if (entries.length > 0) {
      // Append multi-line stack trace to the last entry
      entries[entries.length - 1].message += `\n${line}`;
    } else {
      entries.push({
        level: "INFO",
        message: line,
      });
    }
  }

  return entries;
}

/**
 * Analyzes a server log text or crash report and correlates with recent server changes.
 */
export function diagnoseServerLog(
  serverId: string,
  rawLog: string,
  recentChanges: ServerChangeRecord[] = [],
  correlatedDeploymentId?: string
): ServerSageIncidentReport {
  const incidentId = `sage_inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let detectedCategory: ServerCrashCategory = "unknown";
  let culpritMods: string[] = [];
  let rootCause = "Unrecognized server crash or unexpected termination.";
  let recommendedAction = "Review server console logs and ensure all mods are server-compatible.";

  for (const rule of CRASH_PATTERNS) {
    const match = rawLog.match(rule.pattern);
    if (match) {
      detectedCategory = rule.category;
      if (rule.culpritExtractor) {
        culpritMods = rule.culpritExtractor(match, rawLog);
      }
      rootCause = match[0];
      recommendedAction = rule.remediationTemplate(culpritMods);
      break;
    }
  }

  // Correlate with recent server deployment / change history
  const correlatedChanges: ServerChangeRecord[] = [];
  if (culpritMods.length > 0 && recentChanges.length > 0) {
    for (const change of recentChanges) {
      const matchesMod = culpritMods.some(
        (culprit) =>
          change.summary.toLowerCase().includes(culprit.toLowerCase()) ||
          change.artifactAfter?.modName?.toLowerCase().includes(culprit.toLowerCase()) ||
          change.artifactAfter?.modId?.toLowerCase().includes(culprit.toLowerCase()) ||
          change.artifactAfter?.fileName?.toLowerCase().includes(culprit.toLowerCase())
      );
      if (matchesMod) {
        correlatedChanges.push(change);
      }
    }
  }

  // Extract relevant snippet
  const stackTraceIndex = rawLog.search(/(?:Exception|Error|Stacktrace:)/i);
  const snippet = stackTraceIndex !== -1
    ? rawLog.substring(stackTraceIndex, stackTraceIndex + 1200)
    : rawLog.substring(0, 1200);

  return {
    incidentId,
    serverId,
    analyzedAt: new Date().toISOString(),
    category: detectedCategory,
    culpritMods,
    rootCause,
    recommendedAction,
    correlatedDeploymentId,
    correlatedChanges: correlatedChanges.length > 0 ? correlatedChanges : undefined,
    stackTraceSnippet: snippet,
    rawLogSnippet: rawLog.length > 1500 ? rawLog.substring(0, 1500) + "..." : rawLog,
  };
}

/**
 * Ingests latest.log or crash reports remotely via FileTransport and runs SAGE diagnosis.
 */
export async function diagnoseRemoteServer(
  transport: ReadOnlyFileTransport,
  serverId: string,
  logPath: string = "logs/latest.log",
  recentChanges: ServerChangeRecord[] = []
): Promise<ServerSageIncidentReport> {
  try {
    const logBuffer = await transport.read(logPath);
    const logText = new TextDecoder("utf-8").decode(logBuffer);
    return diagnoseServerLog(serverId, logText, recentChanges);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      incidentId: `sage_inc_${Date.now()}_err`,
      serverId,
      analyzedAt: new Date().toISOString(),
      category: "unknown",
      culpritMods: [],
      rootCause: `Failed to read remote log file at '${logPath}': ${errorMsg}`,
      recommendedAction: "Verify SFTP permissions and that the server has generated log files.",
    };
  }
}
