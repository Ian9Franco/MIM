"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Settings, Keyboard, Package, Save, Download, Upload, 
  AlertTriangle, CheckCircle, Wand2, History, Trash2,
  ChevronDown, ChevronRight, Search, Zap, Layers
} from "lucide-react";
import { KeybindManager } from "./KeybindManager";
import { ResourcePackManager } from "./ResourcePackManager";
import { SnapshotManager } from "./SnapshotManager";

interface TweakPanelProps {
  projectName: string;
  version: string;
  loader: string;
}

interface TweakData {
  optionsExists: boolean;
  keybinds: any[];
  keybindsGrouped: {
    vanilla: any[];
    mods: Record<string, any[]>;
    orphaned: any[];
  };
  keybindConflicts: any[];
  settings: Record<string, string>;
  resourcePacks: {
    active: string[];
    available: string[];
    visualStack: any[];
    issues: any[];
    autoFixable: any[];
  };
  recommendations: any[];
  snapshots: any[];
  modCount: number;
}

type TabType = "overview" | "keybinds" | "packs" | "snapshots" | "settings";

export function TweakPanel({ projectName, version, loader }: TweakPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [data, setData] = useState<TweakData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tweak?projectName=${encodeURIComponent(projectName)}&version=${version}&loader=${loader}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        showMessage("error", json.error || "Error cargando datos");
      }
    } catch (e) {
      showMessage("error", "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [projectName, version, loader]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleInitialize = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, version, action: "initialize" }),
      });
      const json = await res.json();
      if (res.ok) {
        showMessage("success", json.message);
        fetchData();
      } else {
        showMessage("error", json.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePushToMinecraft = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, version, action: "push-to-minecraft" }),
      });
      const json = await res.json();
      if (res.ok) {
        showMessage("success", json.message);
      } else {
        showMessage("error", json.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "overview" as TabType, label: "Resumen", icon: <Settings className="w-4 h-4" /> },
    { id: "keybinds" as TabType, label: "Teclado", icon: <Keyboard className="w-4 h-4" /> },
    { id: "packs" as TabType, label: "Resource Packs", icon: <Package className="w-4 h-4" /> },
    { id: "snapshots" as TabType, label: "Snapshots", icon: <History className="w-4 h-4" /> },
  ];

  if (loading && !data) {
    return (
      <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="flex items-center gap-3 text-[var(--color-muted)]">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando configuración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-white/5"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {data?.optionsExists ? (
            <>
              <button
                onClick={handlePushToMinecraft}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                Aplicar al Juego
              </button>
              <button
                onClick={() => fetchData()}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-white/5 transition-all"
              >
                <div className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}>
                  <Settings className="w-4 h-4" />
                </div>
              </button>
            </>
          ) : (
            <button
              onClick={handleInitialize}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Importar de Minecraft
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && data && (
          <OverviewTab data={data} onAction={fetchData} projectName={projectName} version={version} loader={loader} />
        )}
        {activeTab === "keybinds" && data && (
          <KeybindManager
            keybinds={data.keybinds}
            grouped={data.keybindsGrouped}
            conflicts={data.keybindConflicts}
            projectName={projectName}
            version={version}
            onUpdate={fetchData}
          />
        )}
        {activeTab === "packs" && data && (
          <ResourcePackManager
            resourcePacks={data.resourcePacks}
            projectName={projectName}
            version={version}
            onUpdate={fetchData}
          />
        )}
        {activeTab === "snapshots" && data && (
          <SnapshotManager
            snapshots={data.snapshots}
            projectName={projectName}
            version={version}
            loader={loader}
            onUpdate={fetchData}
          />
        )}
      </div>
    </div>
  );
}

function OverviewTab({ 
  data, 
  onAction, 
  projectName, 
  version, 
  loader 
}: { 
  data: TweakData; 
  onAction: () => void;
  projectName: string;
  version: string;
  loader: string;
}) {
  const [fixingPacks, setFixingPacks] = useState(false);

  const handleQuickFixPacks = async () => {
    setFixingPacks(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, version, action: "fix-pack-order" }),
      });
      const json = await res.json();
      if (res.ok && json.fixed) {
        onAction();
      }
    } finally {
      setFixingPacks(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Keyboard className="w-5 h-5" />}
          label="Keybinds"
          value={data.keybinds.length}
          warning={data.keybindConflicts.length > 0}
          warningText={`${data.keybindConflicts.length} conflictos`}
        />
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="Resource Packs"
          value={data.resourcePacks.active.length}
          warning={data.resourcePacks.issues.length > 0}
          warningText={`${data.resourcePacks.issues.length} problemas`}
        />
        <StatCard
          icon={<History className="w-5 h-5" />}
          label="Snapshots"
          value={data.snapshots.length}
        />
        <StatCard
          icon={<Layers className="w-5 h-5" />}
          label="Mods"
          value={data.modCount}
        />
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            Recomendaciones Inteligentes
          </h3>
          <div className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  rec.impact === "high"
                    ? "bg-rose-500/5 border-rose-500/20"
                    : rec.impact === "medium"
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-blue-500/5 border-blue-500/20"
                }`}
              >
                <div className={`w-2 h-2 mt-1.5 rounded-full ${
                  rec.impact === "high" ? "bg-rose-400" : rec.impact === "medium" ? "bg-amber-400" : "bg-blue-400"
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">{rec.desc}</p>
                  {rec.action === "fix-packs" && data.resourcePacks.autoFixable.length > 0 && (
                    <button
                      onClick={handleQuickFixPacks}
                      disabled={fixingPacks}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                    >
                      <Wand2 className="w-3 h-3" />
                      {fixingPacks ? "Corrigiendo..." : "Corregir Automáticamente"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Preview */}
      <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <h3 className="text-sm font-semibold mb-3">Configuración Actual</h3>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <SettingItem label="Distancia de Render" value={`${data.settings.renderDistance || "?"} chunks`} />
          <SettingItem label="FOV" value={`${data.settings.fov || "?"}`} />
          <SettingItem label="Gamma" value={`${data.settings.gamma || "?"}`} />
          <SettingItem label="VSync" value={data.settings.enableVsync === "true" ? "Activado" : "Desactivado"} />
          <SettingItem label="Sombras" value={data.settings.entityShadows === "true" ? "Activado" : "Desactivado"} />
          <SettingItem label="Mipmaps" value={`${data.settings.mipmapLevels || "?"}`} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  icon, label, value, warning, warningText 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number;
  warning?: boolean;
  warningText?: string;
}) {
  return (
    <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="flex items-center gap-2 text-[var(--color-muted)] mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {warning && (
        <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {warningText}
        </p>
      )}
    </div>
  );
}

function SettingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
