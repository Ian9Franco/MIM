import React, { useState } from "react";
import { X, Bell, CheckCircle, AlertTriangle, ArrowUpCircle, Shield, Package, RefreshCw, FileWarning, Info, Loader2 } from "lucide-react";

interface AlertSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  conflicts: any[];
  modrinthStatus: Record<string, any>;
  library: any[];
  downloadingMods: Record<string, boolean>;
  ignoredUpdates: Set<string>;
  handleResolveConflict: (c: any, replace: boolean) => void;
  handleDownloadUpdate: (path: string, url: string, filename: string) => void;
  handleDismissUpdate: (path: string) => void;
  securityAlerts?: Array<{
    filePath: string;
    fileName: string;
    riskLevel: "clean" | "caution" | "suspicious" | "critical";
    riskScore: number;
    summary: string;
  }>;
}

export function AlertSidebar({
  sidebarOpen,
  setSidebarOpen,
  conflicts,
  modrinthStatus,
  library,
  downloadingMods,
  ignoredUpdates,
  handleResolveConflict,
  handleDownloadUpdate,
  handleDismissUpdate,
  securityAlerts = [],
}: AlertSidebarProps) {
  const [activeTab, setActiveTab] = useState<"all" | "updates" | "conflicts" | "security">("all");
  const updates = Object.entries(modrinthStatus).filter(([_, s]) => s.status === "update_available");
  const criticalAlerts = securityAlerts.filter(a => a.riskLevel === "critical" || a.riskLevel === "suspicious");
  
  return (
    <div 
      className={`fixed inset-y-0 right-0 w-[400px] z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ 
        background: "var(--color-card)", 
        borderLeft: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-lg font-headline flex items-center gap-2" style={{ color: "var(--color-foreground)" }}>
          <Bell className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
          Centro de Alertas
          {(conflicts.length + updates.length + criticalAlerts.length) > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}>
              {conflicts.length + updates.length + criticalAlerts.length}
            </span>
          )}
        </h2>
        <button 
          onClick={() => setSidebarOpen(false)} 
          className="p-2 rounded-xl transition-colors" 
          style={{ color: "var(--color-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Alert Category Tabs */}
      <div className="flex items-center gap-1 p-2 border-b" style={{ borderColor: "var(--color-border)" }}>
        <TabButton
          active={activeTab === "all"}
          onClick={() => setActiveTab("all")}
          icon={<Info className="w-3.5 h-3.5" />}
          label="Todas"
          count={conflicts.length + updates.length + criticalAlerts.length}
        />
        <TabButton
          active={activeTab === "security"}
          onClick={() => setActiveTab("security")}
          icon={<Shield className="w-3.5 h-3.5" />}
          label="Seguridad"
          count={criticalAlerts.length}
          alert={criticalAlerts.length > 0}
        />
        <TabButton
          active={activeTab === "updates"}
          onClick={() => setActiveTab("updates")}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          label="Actualizaciones"
          count={updates.length}
        />
        <TabButton
          active={activeTab === "conflicts"}
          onClick={() => setActiveTab("conflicts")}
          icon={<FileWarning className="w-3.5 h-3.5" />}
          label="Conflictos"
          count={conflicts.length}
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {/* Empty State */}
        {conflicts.length === 0 && updates.length === 0 && criticalAlerts.length === 0 && (
          <div className="text-center py-12">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--color-success-bg)" }}
            >
              <CheckCircle className="w-8 h-8" style={{ color: "var(--color-success)" }} />
            </div>
            <p className="font-subhead text-base" style={{ color: "var(--color-foreground)" }}>Todo al día</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>No hay alertas pendientes</p>
          </div>
        )}

        {/* Security Alerts */}
        {(activeTab === "all" || activeTab === "security") && criticalAlerts.length > 0 && (
          <AlertSection
            icon={<Shield className="w-4 h-4" />}
            title="Alertas de Seguridad"
            count={criticalAlerts.length}
            color="var(--color-danger)"
          >
            <div className="flex flex-col gap-2">
              {criticalAlerts.map((alert) => (
                <div 
                  key={alert.filePath} 
                  className="p-3 rounded-xl border"
                  style={{ borderColor: "var(--color-danger-border)", background: "var(--color-danger-bg)" }}
                >
                  <div className="flex items-start gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "var(--color-danger-hover)" }}
                    >
                      <AlertTriangle className="w-4 h-4" style={{ color: "var(--color-danger)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-subhead text-sm truncate" style={{ color: "var(--color-danger)" }}>{alert.fileName}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{alert.summary}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span 
                          className="px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: "var(--color-danger-hover)", color: "var(--color-danger)" }}
                        >
                          Risk: {alert.riskScore}/100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AlertSection>
        )}

        {/* Updates */}
        {(activeTab === "all" || activeTab === "updates") && updates.length > 0 && (
          <AlertSection
            icon={<RefreshCw className="w-4 h-4" />}
            title="Actualizaciones Disponibles"
            count={updates.length}
            color="var(--color-accent)"
          >
            <div className="flex flex-col gap-2">
              {updates.map(([path, s]) => {
                const mod = library.find(l => l.path === path);
                if (!mod || ignoredUpdates.has(path)) return null;
                return (
                  <div 
                    key={path} 
                    className="p-3 rounded-xl border"
                    style={{ borderColor: "var(--color-accent-border)", background: "var(--color-accent-bg)" }}
                  >
                    <div className="flex items-start gap-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "var(--color-accent-hover)" }}
                      >
                        <Package className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-subhead text-sm truncate" style={{ color: "var(--color-foreground)" }}>{mod.meta?.modName}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span style={{ color: "var(--color-muted)" }}>v{mod.meta?.modVersion}</span>
                          <span style={{ color: "var(--color-accent)" }}>→</span>
                          <span style={{ color: "var(--color-success)" }}>v{s.latestVersion}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <ActionButton
                        primary
                        onClick={() => handleDownloadUpdate(path, s.downloadUrl!, mod.fileName.replace(mod.meta?.modVersion ?? "", s.latestVersion!))}
                        disabled={downloadingMods[path]}
                        icon={downloadingMods[path] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                        label={downloadingMods[path] ? "Descargando..." : "Actualizar"}
                      />
                      <ActionButton
                        onClick={() => handleDismissUpdate(path)}
                        label="Ignorar"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </AlertSection>
        )}

        {/* Conflicts */}
        {(activeTab === "all" || activeTab === "conflicts") && conflicts.length > 0 && (
          <AlertSection
            icon={<FileWarning className="w-4 h-4" />}
            title="Archivos Duplicados"
            count={conflicts.length}
            color="var(--color-danger)"
          >
            <div className="flex flex-col gap-2">
              {conflicts.map((c, idx) => (
                <div 
                  key={idx} 
                  className="p-3 rounded-xl border"
                  style={{ borderColor: "var(--color-danger-border)", background: "var(--color-danger-bg)" }}
                >
                  <div className="flex items-start gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "var(--color-danger-hover)" }}
                    >
                      <AlertTriangle className="w-4 h-4" style={{ color: "var(--color-danger)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-subhead text-sm truncate" style={{ color: "var(--color-foreground)" }}>{c.oldFile.meta?.modName}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span style={{ color: "var(--color-muted)" }}>v{c.oldFile.meta?.modVersion}</span>
                        <span style={{ color: "var(--color-danger)" }}>vs</span>
                        <span style={{ color: "var(--color-success)" }}>v{c.newFile.meta?.modVersion}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <ActionButton
                      primary
                      danger
                      onClick={() => handleResolveConflict(c, true)}
                      icon={<RefreshCw className="w-3.5 h-3.5" />}
                      label="Reemplazar"
                    />
                    <ActionButton
                      onClick={() => handleResolveConflict(c, false)}
                      label="Mantener ambos"
                    />
                  </div>
                </div>
              ))}
            </div>
          </AlertSection>
        )}
      </div>
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────────────────────────

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  alert?: boolean;
}

function TabButton({ active, onClick, icon, label, count, alert }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all ${alert ? "relative" : ""}`}
      style={{
        background: active ? "var(--color-hover)" : "transparent",
        color: active ? "var(--color-foreground)" : "var(--color-muted)",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "var(--color-hover)";
          e.currentTarget.style.color = "var(--color-foreground)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--color-muted)";
        }
      }}
    >
      <span style={{ color: active ? "var(--color-primary)" : "inherit" }}>{icon}</span>
      <span className="text-[0.65rem] leading-tight">{label}</span>
      {count > 0 && (
        <span 
          className="text-[0.55rem] px-1.5 py-0 rounded-full"
          style={{ 
            background: alert ? "var(--color-danger-bg)" : "var(--color-secondary-bg)",
            color: alert ? "var(--color-danger)" : "var(--color-muted)",
          }}
        >
          {count}
        </span>
      )}
      {alert && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-danger)" }} />
      )}
    </button>
  );
}

interface AlertSectionProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}

function AlertSection({ icon, title, count, color, children }: AlertSectionProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color }}>{icon}</span>
        <h3 className="text-xs font-headline tracking-wider uppercase" style={{ color }}>
          {title}
        </h3>
        <span 
          className="ml-auto text-xs px-2 py-0.5 rounded-full" 
          style={{ background: "var(--color-secondary-bg)", color: "var(--color-muted)" }}
        >
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

interface ActionButtonProps {
  primary?: boolean;
  danger?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
}

function ActionButton({ primary, danger, onClick, disabled, icon, label }: ActionButtonProps) {
  const getButtonStyle = () => {
    if (primary && danger) {
      return {
        background: "var(--color-danger-bg)",
        color: "var(--color-danger)",
        hoverBg: "var(--color-danger-hover)",
      };
    }
    if (primary) {
      return {
        background: "var(--color-accent-bg)",
        color: "var(--color-accent)",
        hoverBg: "var(--color-accent-hover)",
      };
    }
    return {
      background: "var(--color-secondary-bg)",
      color: "var(--color-muted)",
      hoverBg: "var(--color-hover)",
    };
  };

  const style = getButtonStyle();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
      style={{
        background: style.background,
        color: style.color,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = style.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = style.background)}
    >
      {icon}
      {label}
    </button>
  );
}
