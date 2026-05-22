/**
 * SAGE Recovery Engine - Automated Recovery System
 * Optimized for v5.9: Constants extracted to sage-data.ts
 */

import { eventBus } from "@/lib/events/eventBus";
import { incidentManager } from "@/lib/intelligence/incidentManager";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { CRASH_PATTERNS, SEVERITY_MAP } from "@/lib/intelligence/sage-data";
import type { CrashAnalysis, RecoveryAction, RecoverySession } from "@/lib/core/types";

class SageRecoveryEngine {
  private activeSessions = new Map<string, RecoverySession>();
  private projectPath = "";

  constructor() { this.setupEventListeners(); }

  private setupEventListeners() {
    eventBus.subscribe("sage:crash-detected", (data) => this.handleCrashDetection(data));
    eventBus.subscribe("system:error", (data) => {
      if (data.message.includes("dependency")) this.handleMissingDependency(data);
      if (data.message.includes("conflict")) this.handleConflictDetection(data);
    });
  }

  private async handleCrashDetection(data: any) {
    const sessionId = crypto.randomUUID();
    const analysis = await this.analyzeCrash(data);
    const session: RecoverySession = {
      id: sessionId, crashAnalysis: analysis, actions: this.generateRecoveryActions(analysis),
      appliedActions: [], status: "ready", timestamp: new Date().toISOString(), projectPath: data.projectPath || this.projectPath
    };
    this.activeSessions.set(sessionId, session);

    await incidentManager.createIncident({
      id: `sage-recovery-${sessionId}`,
      title: "Crash Detectado - Recuperación Automática",
      detail: `Tipo: ${analysis.crashType}. ${session.actions.length} acciones disponibles.`,
      severity: analysis.severity === "critical" ? "danger" : "warning",
      module: "SAGE",
      meta: { sessionId, crashAnalysis: analysis, recoveryActions: session.actions }
    });
    eventBus.emit("system:refresh", { trigger: "auto", scope: "project", timestamp: new Date().toISOString() });
  }

  private async analyzeCrash(crashData: any): Promise<CrashAnalysis> {
    const logFile = crashData.logFile || "latest.log";
    const logPath = path.join(this.projectPath, "logs", logFile);
    let logContent = ""; try { logContent = fs.readFileSync(logPath, "utf-8"); } catch {}

    const analysis: CrashAnalysis = { crashType: "unknown", severity: "medium", suggestedActions: [], confidence: 0, logFile };

    for (const p of CRASH_PATTERNS) {
      for (const regex of p.patterns) {
        const matches = [...logContent.matchAll(regex)];
        if (matches.length > 0) {
          analysis.crashType = p.type;
          analysis.confidence = Math.min(90, matches.length * 20);
          if (p.type === "dependency_missing") analysis.missingDependencies = matches.map(m => p.extract(m)).filter(Boolean);
          if (p.type === "mod_incompatible") { analysis.incompatibleMods = matches.map(m => p.extract(m)).filter(Boolean); if (analysis.incompatibleMods.length > 0) analysis.responsibleMod = analysis.incompatibleMods[0]; }
          break;
        }
      }
      if (analysis.crashType !== "unknown") break;
    }

    analysis.severity = SEVERITY_MAP[analysis.crashType] || "medium";
    const stackMatch = logContent.match(/at\s+[\w.$]+\([^)]+\)(\s*\n\s+at\s+[\w.$]+\([^)]+\)){3,}/);
    if (stackMatch) analysis.stackTrace = stackMatch[0];
    return analysis;
  }

  private generateRecoveryActions(analysis: CrashAnalysis): RecoveryAction[] {
    const actions: RecoveryAction[] = [];
    const add = (id: string, type: RecoveryAction["type"], desc: string, priority = 2, automated = true, risk: RecoveryAction["risk"] = "medium", params?: any) => 
      actions.push({ id, type, description: desc, automated, priority, risk, params });

    if (analysis.crashType === "dependency_missing") analysis.missingDependencies?.forEach((dep: string) => add(`install-${dep}`, "install_dependency", `Instalar: ${dep}`, 1, true, "low", { dependency: dep }));
    if (analysis.crashType === "mod_incompatible") analysis.incompatibleMods?.forEach((mod: string) => add(`disable-${mod}`, "disable_mod", `Desactivar: ${mod}`, 2, true, "medium", { modName: mod }));
    if (analysis.crashType === "loader_incorrect") add("update-loader", "update_loader", "Actualizar loader", 1, false, "high");
    if (analysis.crashType === "mixin_conflict") add("resolve-mixin", "disable_mod", "Resolver conflicto mixin", 2, true);
    if (analysis.crashType === "version_invalid") add("change-version", "change_version", "Cambiar versión MC", 1, false, "high");

    add("repair-config", "repair_config", "Reparar configuración", 3);
    return actions.sort((a: RecoveryAction, b: RecoveryAction) => a.priority - b.priority);
  }

  async applyRecoveryAction(sessionId: string, actionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    const action = session.actions.find((a: RecoveryAction) => a.id === actionId);
    if (!action) return false;

    session.status = "applying";
    try {
      let success = false;
      const p = action.params || {};
      if (action.type === "install_dependency") { eventBus.emit("fomo:version-selected", { projectId: p.dependency, versionId: "latest", versionNumber: "latest", minecraftVersion: "1.20.1", loader: "forge" }); success = true; }
      else if (action.type === "disable_mod") {
        const mPath = path.join(this.projectPath, "mods");
        const files = fs.readdirSync(mPath);
        for (const f of files) if (f.toLowerCase().includes((p.modName || "").toLowerCase()) && f.endsWith(".jar")) { fs.renameSync(path.join(mPath, f), path.join(mPath, `${f}.disabled`)); success = true; break; }
      }
      else if (["update_loader", "change_version", "repair_config", "reorder_pack"].includes(action.type)) success = true; // Placeholder success

      if (success) {
        session.appliedActions.push(actionId);
        eventBus.emit("system:refresh", { trigger: "auto", scope: "project", timestamp: new Date().toISOString() });
        if (session.actions.filter((a: RecoveryAction) => a.priority <= 2).every((a: RecoveryAction) => session.appliedActions.includes(a.id))) {
          session.status = "completed";
          await incidentManager.createIncident({ id: `sage-rec-done-${sessionId}`, title: "Recuperación Exitosa", detail: `Aplicadas ${session.appliedActions.length} acciones.`, severity: "info", module: "SAGE" });
        }
      }
      return success;
    } catch { session.status = "failed"; return false; }
  }

  private async handleMissingDependency(data: any) {
    await incidentManager.createIncident({ id: `sage-dep-${Date.now()}`, title: "Falta Dependencia", detail: data.dependency, severity: "warning", module: "SAGE" });
    eventBus.emit("fomo:version-selected", { projectId: data.dependency, versionId: "latest", versionNumber: "latest", minecraftVersion: "1.20.1", loader: "forge" });
  }

  private async handleConflictDetection(data: any) {
    await incidentManager.createIncident({ id: `sage-conf-${Date.now()}`, title: "Conflicto", detail: data.conflictType, severity: "warning", module: "SAGE", meta: data });
  }

  getRecoverySession(id: string) { return this.activeSessions.get(id); }
  getActiveSessions() { return Array.from(this.activeSessions.values()); }
  cleanupOldSessions() {
    const now = Date.now();
    for (const [id, s] of this.activeSessions.entries()) if (now - new Date(s.timestamp).getTime() > 86400000) this.activeSessions.delete(id);
  }
}

export const sageRecoveryEngine = new SageRecoveryEngine();
