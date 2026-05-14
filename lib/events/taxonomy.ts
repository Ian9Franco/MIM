/**
 * MIM Event Bus - Official Taxonomy
 * Official event map and formal taxonomy of the MIM ecosystem.
 */

export type MimEventMap = {
  // FOMO EVENTS
  "fomo:search": { query: string; source: "modrinth" | "curseforge" | "local"; };
  "fomo:search-initiated": { query: string; source: "modrinth" | "curseforge" | "local"; filters?: Record<string, any>; };
  "fomo:search-completed": { query: string; resultCount: number; duration: number; source: "modrinth" | "curseforge" | "local"; };
  "fomo:mod-selected": { projectId: string; projectTitle: string; source: "modrinth" | "curseforge"; metadata?: { downloads: number; categories: string[]; loaders: string[]; }; };
  "fomo:version-selected": { projectId: string; versionId: string; versionNumber: string; minecraftVersion: string; loader: string; };
  "fomo:download-initiated": { projectId: string; versionId: string; fileName: string; fileSize: number; source: "modrinth" | "curseforge" | "local"; };
  "fomo:download-progress": { projectId: string; versionId: string; downloaded: number; total: number; speed: number; };
  "fomo:download-completed": { projectId: string; versionId: string; fileName: string; filePath: string; checksum: string; duration: number; };
  "fomo:mod-downloaded": { modId: string; fileName: string; source: "modrinth" | "curseforge"; };
  "fomo:download-failed": { projectId: string; versionId: string; error: string; retryCount: number; };
  "fomo:mod-installed": { projectId: string; versionId: string; fileName: string; targetPath: string; dependencies?: string[]; };
  "fomo:collection-synced": { collectionId: string; modsAdded: number; modsRemoved: number; syncDuration: number; };

  // SAGE EVENTS
  "sage:analysis-initiated": { type: "crash" | "log" | "security" | "dependency"; targetPath?: string; sessionId: string; };
  "sage:crash-detected": { crashId: string; crashType: "jvm" | "mod" | "dependency" | "shader" | "memory"; severity: "low" | "medium" | "high" | "critical"; logFile: string; stackTrace?: string; suspectedMods?: string[]; sessionId: string; };
  "sage:dependency-missing": { dependencyId: string; dependencyName: string; requiredBy: string; version?: string; severity: "warning" | "error"; };
  "sage:conflict-detected": { conflictId: string; conflictType: "mixin" | "access-transformer" | "loader" | "version"; involvedMods: string[]; severity: "low" | "medium" | "high" | "critical"; description: string; };
  "sage:security-risk": { riskId: string; riskType: "malware" | "network" | "file-system" | "obfuscation"; severity: "clean" | "caution" | "suspicious" | "critical"; fileName: string; riskScore: number; findings: string[]; };
  "sage:recovery-initiated": { sessionId: string; crashId: string; recoveryType: "dependency" | "disable-mod" | "config-repair" | "version-change"; };
  "sage:recovery-action-suggested": { sessionId: string; actionId: string; actionType: "install-dependency" | "disable-mod" | "update-config"; description: string; automated: boolean; riskLevel: "low" | "medium" | "high"; };
  "sage:recovery-action-applied": { sessionId: string; actionId: string; success: boolean; result?: string; error?: string; };
  "sage:recovery-completed": { sessionId: string; success: boolean; actionsApplied: number; duration: number; };
  "sage:player-rescued": { playerId: string; playerName: string; rescueType: "position" | "inventory" | "dimension"; success: boolean; backupCreated: boolean; };
  "sage:analysis-completed": { type: string; success: boolean; category: string; };

  // TWEAK EVENTS
  "tweak:config-loaded": { configType: "options" | "shader" | "mod-config"; filePath: string; entriesCount: number; };
  "tweak:config-updated": { configType: "options" | "shader" | "mod-config"; filePath: string; changes: Record<string, { old: any; new: any }>; applied: boolean; };
  "tweak:mod-toggled": { modId: string; modFileName: string; enabled: boolean; reason: "manual" | "conflict" | "recovery"; };
  "tweak:keybind-updated": { keybind: string; action: string; oldKey?: string; newKey: string; modName: string; };
  "tweak:keybind-synced": { totalKeybinds: number; syncedKeybinds: number; conflicts: number; };
  "tweak:shader-changed": { shaderName: string; shaderType: "iris" | "sodium" | "optifine"; oldShader?: string; applied: boolean; compatibility?: { status: "compatible" | "warning" | "incompatible"; issues: string[]; }; };
  "tweak:optimization-applied": { optimizationType: "jvm-args" | "memory" | "render" | "performance"; oldValue: any; newValue: any; source: "manual" | "automatic" | "suggested"; effectiveness?: number; };

  // ALRT EVENTS
  "alrt:signal-received": { signalId: string; signalType: "operational" | "security" | "performance" | "error"; source: any; severity: "info" | "warning" | "error" | "critical"; message: string; metadata?: Record<string, any>; };
  "alrt:pattern-detected": { patternId: string; patternName: string; confidence: number; matchedEvents: string[]; timeWindow: number; severity: "info" | "warning" | "error" | "critical"; };
  "alrt:correlation-created": { correlationId: string; incidentId: string; signalIds: string[]; patternId: string; context: { summary: string; affectedModules: any[]; riskScore: number; }; };
  "alrt:incident-created": { incidentId: string; title: string; description: string; severity: "info" | "warning" | "danger"; status: "unseen" | "unread" | "acknowledged" | "resolved"; module: any; correlationId?: string; recommendations?: string[]; };
  "alrt:incident-updated": { incidentId: string; changes: any; updatedBy: any; };
  "alrt:incident-escalated": { incidentId: string; escalationLevel: number; reason: string; escalatedTo: any; autoEscalated: boolean; };
  "alrt:recommendation-generated": { recommendationId: string; incidentId: string; type: "action" | "configuration" | "dependency" | "security"; priority: number; description: string; automated: boolean; confidence: number; };

  // SECURITY EVENTS
  "security:scan-initiated": { scanType: "file" | "directory" | "mod"; target: string; scanDepth: "quick" | "deep" | "full"; };
  "security:threat-detected": { threatId: string; threatType: "malware" | "suspicious" | "network" | "file-system"; severity: "low" | "medium" | "high" | "critical"; fileName: string; filePath: string; riskScore: number; indicators: string[]; virusTotal?: { positives: number; total: number; scanDate: string; }; };
  "security:scan-completed": { scanId: string; filesScanned: number; threatsFound: number; duration: number; threats: string[]; };
  "security:quarantine-applied": { threatId: string; fileName: string; quarantinePath: string; action: "move" | "delete" | "disable"; timestamp: string; };

  // WATCHER EVENTS
  "watcher:file-changed": { filePath: string; changeType: "created" | "modified" | "deleted"; fileSize: number; fileType: "mod" | "config" | "resourcepack" | "shader" | "unknown"; timestamp: string; };
  "watcher:directory-changed": { directoryPath: string; changeType: "file-added" | "file-removed" | "directory-added" | "directory-removed"; affectedFiles: string[]; timestamp: string; };
  "watcher:sync-required": { reason: "external-changes" | "file-conflict" | "missing-files"; affectedPaths: string[]; urgency: "low" | "medium" | "high"; };

  // BUILDER EVENTS
  "builder:build-initiated": { buildType: "modpack" | "server" | "client"; buildConfig: Record<string, any>; outputPath: string; };
  "builder:dependency-resolved": { buildId: string; dependencies: Array<{ modId: string; version: string; source: string; resolved: boolean; }>; };
  "builder:packaging-completed": { buildId: string; packageType: "zip" | "tar" | "custom"; outputPath: string; fileSize: number; includedMods: number; checksum: string; };
  "builder:validation-completed": { buildId: string; validationType: "manifest" | "dependencies" | "compatibility"; passed: boolean; issues: string[]; warnings: string[]; };

  // SYSTEM EVENTS
  "system:startup": { version: string; environment: "development" | "production" | "test"; modules: any[]; startupTime: number; };
  "system:shutdown": { reason: "manual" | "error" | "update"; duration: number; graceful: boolean; };
  "system:project-changed": { projectId: string; projectName: string; minecraftVersion: string; loader: string; previousProject?: string; };
  "system:settings-updated": { section: string; changes: Record<string, { old: any; new: any }>; requiresRestart: boolean; };
  "system:error": { errorId: string; source: any; errorType: "validation" | "runtime" | "network" | "file-system" | "dependency"; severity: "low" | "medium" | "high" | "critical"; message: string; stackTrace?: string; context?: Record<string, any>; recoverable: boolean; };
  "system:warning": { warningId: string; source: any; warningType: "performance" | "compatibility" | "configuration" | "resource"; message: string; impact: "low" | "medium" | "high"; suggestedAction?: string; };
  "system:refresh": { trigger: "manual" | "auto" | "external"; scope: "full" | "project" | "module"; timestamp: string; };
};
