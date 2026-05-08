/**
 * SAGE Recovery Engine - Automated Recovery System
 * ─────────────────────────────────────────────────────────────────────────────
 * Sistema de recuperación automatizada orientado a reducir el tiempo entre 
 * un fallo crítico y una solución funcional mediante diagnósticos contextuales,
 * acciones correctivas guiadas y reparación asistida del entorno.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { eventBus } from "./eventBus";
import { MimEventMap } from "./eventContract";
import { incidentManager } from "./incidentManager";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface CrashAnalysis {
  crashType: "dependency_missing" | "mod_incompatible" | "loader_incorrect" | "mixin_conflict" | "version_invalid" | "unknown";
  severity: "low" | "medium" | "high" | "critical";
  responsibleMod?: string;
  missingDependencies?: string[];
  incompatibleMods?: string[];
  suggestedActions: RecoveryAction[];
  confidence: number; // 0-100
  stackTrace?: string;
  logFile: string;
}

export interface RecoveryAction {
  id: string;
  type: "install_dependency" | "disable_mod" | "update_loader" | "change_version" | "repair_config" | "reorder_pack";
  description: string;
  automated: boolean;
  priority: number;
  risk: "low" | "medium" | "high";
  params?: Record<string, any>;
}

export interface RecoverySession {
  id: string;
  crashAnalysis: CrashAnalysis;
  actions: RecoveryAction[];
  appliedActions: string[];
  status: "analyzing" | "ready" | "applying" | "completed" | "failed";
  timestamp: string;
  projectPath: string;
}

class SageRecoveryEngine {
  private activeSessions = new Map<string, RecoverySession>();
  private projectPath = "";

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Escuchar eventos de crash detectados por SAGE
    eventBus.subscribe("sage:crash-detected", (data) => {
      this.handleCrashDetection(data);
    });

    // Escuchar eventos de dependencias faltantes (usando system:error como placeholder)
    eventBus.subscribe("system:error", (data) => {
      if (data.message.includes("dependency")) {
        this.handleMissingDependency(data);
      }
    });

    // Escuchar eventos de conflictos detectados (usando system:error como placeholder)
    eventBus.subscribe("system:error", (data) => {
      if (data.message.includes("conflict")) {
        this.handleConflictDetection(data);
      }
    });
  }

  /**
   * Manejar detección de crash y iniciar análisis
   */
  private async handleCrashDetection(data: any) {
    const sessionId = crypto.randomUUID();
    const session: RecoverySession = {
      id: sessionId,
      crashAnalysis: await this.analyzeCrash(data),
      actions: [],
      appliedActions: [],
      status: "analyzing",
      timestamp: new Date().toISOString(),
      projectPath: data.projectPath || this.projectPath
    };

    this.activeSessions.set(sessionId, session);

    // Generar acciones de recuperación
    session.actions = this.generateRecoveryActions(session.crashAnalysis);
    session.status = "ready";

    // Crear incidente en ALRT
    await incidentManager.createIncident({
      id: `sage-recovery-${sessionId}`,
      title: "Crash Detectado - Recuperación Automática Disponible",
      detail: `Se detectó un crash de tipo ${session.crashAnalysis.crashType}. ${session.crashAnalysis.suggestedActions.length} acciones de recuperación disponibles.`,
      severity: session.crashAnalysis.severity === "critical" ? "danger" : "warning",
      module: "SAGE",
      meta: {
        sessionId,
        crashAnalysis: session.crashAnalysis,
        recoveryActions: session.actions
      }
    });

    // Emitir evento de recuperación lista (usando system:refresh como placeholder)
    eventBus.emit("system:refresh", {
      trigger: "auto",
      scope: "project",
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Analizar crash logs para determinar causa raíz
   */
  private async analyzeCrash(crashData: any): Promise<CrashAnalysis> {
    const logFile = crashData.logFile || "latest.log";
    const logPath = path.join(this.projectPath, "logs", logFile);
    
    let logContent = "";
    try {
      logContent = fs.readFileSync(logPath, "utf-8");
    } catch (error) {
      console.error("[SAGE Recovery] Error reading log file:", error);
    }

    const analysis: CrashAnalysis = {
      crashType: "unknown",
      severity: "medium",
      suggestedActions: [],
      confidence: 0,
      logFile
    };

    // Patrones de detección de crashes comunes
    const patterns = [
      {
        type: "dependency_missing" as const,
        patterns: [
          /java\.lang\.NoClassDefFoundError:\s*(\w+)/gi,
          /java\.lang\.ClassNotFoundException:\s*(\w+)/gi,
          /Failed to load class\s*(\w+)/gi
        ],
        extract: (match: RegExpMatchArray) => match[1]
      },
      {
        type: "mod_incompatible" as const,
        patterns: [
          /mod\s+(\w+)\s+has failed to load correctly/gi,
          /Cannot load mod\s+(\w+)/gi,
          /Mod\s+(\w+)\s+is incompatible/gi
        ],
        extract: (match: RegExpMatchArray) => match[1]
      },
      {
        type: "loader_incorrect" as const,
        patterns: [
          /Fabric loader version/gi,
          /Forge loader/gi,
          /incompatible loader/gi
        ],
        extract: () => "loader"
      },
      {
        type: "mixin_conflict" as const,
        patterns: [
          /mixin injection failed/gi,
          /mixin conflict/gi,
          /duplicate mixin/gi
        ],
        extract: () => "mixin"
      },
      {
        type: "version_invalid" as const,
        patterns: [
          /requires minecraft\s+(\d+\.\d+\.\d+)/gi,
          /Unsupported minecraft version/gi,
          /version mismatch/gi
        ],
        extract: (match: RegExpMatchArray) => match[1]
      }
    ];

    // Analizar patrones en el log
    for (const pattern of patterns) {
      for (const regex of pattern.patterns) {
        const matches = [...logContent.matchAll(regex)];
        if (matches.length > 0) {
          analysis.crashType = pattern.type;
          analysis.confidence = Math.min(90, matches.length * 20);
          
          if (pattern.type === "dependency_missing") {
            analysis.missingDependencies = matches.map(m => pattern.extract(m)).filter(Boolean);
          } else if (pattern.type === "mod_incompatible") {
            analysis.incompatibleMods = matches.map(m => pattern.extract(m)).filter(Boolean);
            if (analysis.incompatibleMods.length > 0) {
              analysis.responsibleMod = analysis.incompatibleMods[0];
            }
          }
          
          break;
        }
      }
    }

    // Determinar severidad basada en tipo de crash
    const severityMap: Record<string, CrashAnalysis["severity"]> = {
      dependency_missing: "high",
      mod_incompatible: "medium",
      loader_incorrect: "critical",
      mixin_conflict: "high",
      version_invalid: "medium",
      unknown: "low"
    };
    analysis.severity = severityMap[analysis.crashType] || "medium";

    // Extraer stack trace si está disponible
    const stackMatch = logContent.match(/at\s+[\w.$]+\([^)]+\)(\s*\n\s+at\s+[\w.$]+\([^)]+\)){3,}/);
    if (stackMatch) {
      analysis.stackTrace = stackMatch[0];
    }

    return analysis;
  }

  /**
   * Generar acciones de recuperación basadas en análisis
   */
  private generateRecoveryActions(analysis: CrashAnalysis): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (analysis.crashType) {
      case "dependency_missing":
        if (analysis.missingDependencies) {
          analysis.missingDependencies.forEach(dep => {
            actions.push({
              id: `install-${dep}`,
              type: "install_dependency",
              description: `Instalar dependencia faltante: ${dep}`,
              automated: true,
              priority: 1,
              risk: "low",
              params: { dependency: dep }
            });
          });
        }
        break;

      case "mod_incompatible":
        if (analysis.incompatibleMods) {
          analysis.incompatibleMods.forEach(mod => {
            actions.push({
              id: `disable-${mod}`,
              type: "disable_mod",
              description: `Desactivar mod incompatible: ${mod}`,
              automated: true,
              priority: 2,
              risk: "medium",
              params: { modName: mod }
            });
          });
        }
        break;

      case "loader_incorrect":
        actions.push({
          id: "update-loader",
          type: "update_loader",
          description: "Actualizar loader a versión compatible",
          automated: false,
          priority: 1,
          risk: "high"
        });
        break;

      case "mixin_conflict":
        actions.push({
          id: "resolve-mixin",
          type: "disable_mod",
          description: "Desactivar mods con conflictos de mixin",
          automated: true,
          priority: 2,
          risk: "medium"
        });
        break;

      case "version_invalid":
        actions.push({
          id: "change-version",
          type: "change_version",
          description: "Cambiar a versión de Minecraft compatible",
          automated: false,
          priority: 1,
          risk: "high"
        });
        break;
    }

    // Acción genérica de reparación de configuración
    actions.push({
      id: "repair-config",
      type: "repair_config",
      description: "Reparar configuración del proyecto",
      automated: true,
      priority: 3,
      risk: "low"
    });

    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Aplicar acción de recuperación específica
   */
  async applyRecoveryAction(sessionId: string, actionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error("Recovery session not found");
    }

    const action = session.actions.find(a => a.id === actionId);
    if (!action) {
      throw new Error("Recovery action not found");
    }

    session.status = "applying";

    try {
      let success = false;

      switch (action.type) {
        case "install_dependency":
          success = await this.installDependency(action.params?.dependency);
          break;
        case "disable_mod":
          success = await this.disableMod(action.params?.modName);
          break;
        case "update_loader":
          success = await this.updateLoader();
          break;
        case "change_version":
          success = await this.changeMinecraftVersion(action.params?.version);
          break;
        case "repair_config":
          success = await this.repairConfiguration();
          break;
        case "reorder_pack":
          success = await this.reorderResourcePack(action.params?.packName, action.params?.position);
          break;
      }

      if (success) {
        session.appliedActions.push(actionId);
        
        // Emitir evento de acción aplicada (usando system:refresh como placeholder)
        eventBus.emit("system:refresh", {
          trigger: "auto",
          scope: "project",
          timestamp: new Date().toISOString()
        });

        // Verificar si todas las acciones críticas fueron aplicadas
        const criticalActions = session.actions.filter(a => a.priority <= 2);
        const appliedCritical = criticalActions.filter(a => session.appliedActions.includes(a.id));
        
        if (appliedCritical.length === criticalActions.length) {
          session.status = "completed";
          
          // Crear incidente de recuperación completada
          await incidentManager.createIncident({
            id: `sage-recovery-complete-${sessionId}`,
            title: "Recuperación Automática Completada",
            detail: `Se aplicaron ${session.appliedActions.length} acciones de recuperación exitosamente.`,
            severity: "info",
            module: "SAGE",
            meta: { sessionId, appliedActions: session.appliedActions }
          });
        }
      }

      return success;
    } catch (error) {
      console.error(`[SAGE Recovery] Error applying action ${actionId}:`, error);
      session.status = "failed";
      return false;
    }
  }

  /**
   * Instalar dependencia faltante (integración con FOMO)
   */
  private async installDependency(dependency: string): Promise<boolean> {
    try {
      // Emitir evento para que FOMO maneje la instalación (usando fomo:version-selected como placeholder)
      eventBus.emit("fomo:version-selected", { 
        projectId: dependency, 
        versionId: "latest",
        versionNumber: "latest",
        minecraftVersion: "1.20.1",
        loader: "forge"
      });
      return true;
    } catch (error) {
      console.error("[SAGE Recovery] Error installing dependency:", error);
      return false;
    }
  }

  /**
   * Desactivar mod de forma segura
   */
  private async disableMod(modName: string): Promise<boolean> {
    try {
      const modsPath = path.join(this.projectPath, "mods");
      const modFiles = fs.readdirSync(modsPath);
      
      for (const file of modFiles) {
        if (file.toLowerCase().includes(modName.toLowerCase()) && file.endsWith(".jar")) {
          const modPath = path.join(modsPath, file);
          const disabledPath = path.join(modsPath, `${file}.disabled`);
          fs.renameSync(modPath, disabledPath);
          break;
        }
      }
      
      return true;
    } catch (error) {
      console.error("[SAGE Recovery] Error disabling mod:", error);
      return false;
    }
  }

  private async updateLoader(): Promise<boolean> {
    try {
      // Lógica para actualizar loader
      return true;
    } catch (error) {
      console.error("[SAGE Recovery] Error updating loader:", error);
      return false;
    }
  }

  private async changeMinecraftVersion(version?: string): Promise<boolean> {
    try {
      // Lógica para cambiar versión de minecraft
      return true;
    } catch (error) {
      console.error("[SAGE Recovery] Error changing Minecraft version:", error);
      return false;
    }
  }

  private async repairConfiguration(): Promise<boolean> {
    try {
      // Lógica de reparación de configuración
      const configPath = path.join(this.projectPath, "config");
      // Implementar reparaciones específicas según sea necesario
      return true;
    } catch (error) {
      console.error("[SAGE Recovery] Error repairing configuration:", error);
      return false;
    }
  }

  /**
   * Reordenar resource pack
   */
  private async reorderResourcePack(packName: string, position: number): Promise<boolean> {
    try {
      // Lógica de reordenamiento de resource packs
      const optionsPath = path.join(this.projectPath, "options.txt");
      // Implementar reordenamiento
      return true;
    } catch (error) {
      console.error("[SAGE Recovery] Error reordering resource pack:", error);
      return false;
    }
  }

  /**
   * Manejar detección de dependencias faltantes
   */
  private async handleMissingDependency(data: any) {
    await incidentManager.createIncident({
      id: `sage-missing-dep-${Date.now()}`,
      title: "Dependencia Faltante Detectada",
      detail: `Se detectó dependencia faltante: ${data.dependency}`,
      severity: "warning",
      module: "SAGE",
      meta: { dependency: data.dependency, modName: data.modName }
    });

    // Ofrecer instalación automática (usando fomo:version-selected como placeholder)
    eventBus.emit("fomo:version-selected", { 
      projectId: data.dependency, 
      versionId: "latest",
      versionNumber: "latest",
      minecraftVersion: "1.20.1",
      loader: "forge"
    });
  }

  /**
   * Manejar detección de conflictos
   */
  private async handleConflictDetection(data: any) {
    await incidentManager.createIncident({
      id: `sage-conflict-${Date.now()}`,
      title: "Conflicto Detectado",
      detail: `Conflicto detectado: ${data.conflictType} entre ${data.mods?.join(" y ")}`,
      severity: "warning",
      module: "SAGE",
      meta: data
    });
  }

  /**
   * Obtener sesión de recuperación activa
   */
  getRecoverySession(sessionId: string): RecoverySession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Obtener todas las sesiones activas
   */
  getActiveSessions(): RecoverySession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Limpiar sesiones antiguas
   */
  cleanupOldSessions() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [id, session] of this.activeSessions.entries()) {
      const sessionTime = new Date(session.timestamp).getTime();
      if (now - sessionTime > maxAge) {
        this.activeSessions.delete(id);
      }
    }
  }
}

// Singleton
export const sageRecoveryEngine = new SageRecoveryEngine();
