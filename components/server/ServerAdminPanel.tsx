"use client";

import { useMemo, useState } from "react";
import { Archive, Loader2, Save, Settings2, Terminal } from "lucide-react";
import type { InspectServerRequest } from "@/lib/server/inspectSchema";
import type { ServerAdminInspectResult } from "@/lib/server/adminServer";
import type { RconCommandResult } from "@mim/contracts-core/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { serverInputClass, serverPanelClass, serverPanelStyle } from "./serverUi";

const MANAGED_KEYS = [
  "motd",
  "max-players",
  "difficulty",
  "gamemode",
  "online-mode",
  "pvp",
  "white-list",
  "view-distance",
  "simulation-distance",
  "server-port",
  "spawn-protection",
] as const;

type Tab = "properties" | "backups" | "rcon";

interface Props {
  inspectRequest: InspectServerRequest | null;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
}

function jsonError(data: { error?: string; message?: string }, fallback: string) {
  return typeof data.message === "string" ? data.message : typeof data.error === "string" ? data.error : fallback;
}

export function ServerAdminPanel({ inspectRequest, busy, onBusyChange }: Props) {
  const [tab, setTab] = useState<Tab>("properties");
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ServerAdminInspectResult | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [confirmWrite, setConfirmWrite] = useState(false);
  const [rconPassword, setRconPassword] = useState("");
  const [rconCommand, setRconCommand] = useState("list");
  const [rconLog, setRconLog] = useState<RconCommandResult[]>([]);

  const unmanagedKeys = useMemo(() => {
    if (!snapshot?.properties) return [];
    return snapshot.properties.orderedKeys.filter(
      (key) => !MANAGED_KEYS.includes(key as (typeof MANAGED_KEYS)[number]) && key !== "rcon.password"
    );
  }, [snapshot]);

  async function loadAdmin() {
    if (!inspectRequest) {
      setError("Auditá el servidor primero para reutilizar la conexión.");
      return;
    }
    setError(null);
    onBusyChange(true);
    try {
      const response = await fetch("/api/server/admin/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inspectRequest),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(jsonError(data, "No se pudo leer la administración del servidor."));
      const next = data as ServerAdminInspectResult;
      setSnapshot(next);
      const nextDraft: Record<string, string> = {};
      for (const key of MANAGED_KEYS) {
        nextDraft[key] = next.properties?.properties[key] ?? "";
      }
      setDraft(nextDraft);
      setConfirmWrite(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión.");
    } finally {
      onBusyChange(false);
    }
  }

  async function saveProperties() {
    if (!inspectRequest || !snapshot?.properties) return;
    const updates: Record<string, string> = {};
    for (const key of MANAGED_KEYS) {
      const value = draft[key] ?? "";
      const current = snapshot.properties.properties[key] ?? "";
      if (value !== current && value.trim() !== "") updates[key] = value;
    }
    if (!Object.keys(updates).length) {
      setError("No hay cambios para guardar.");
      return;
    }
    setError(null);
    onBusyChange(true);
    try {
      const response = await fetch("/api/server/admin/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inspectRequest, confirm: true, updates }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(jsonError(data, "No se pudo guardar server.properties."));
      setSnapshot((current) => current ? { ...current, properties: data.properties, validation: data.validation } : current);
      setConfirmWrite(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión.");
    } finally {
      onBusyChange(false);
    }
  }

  async function runRcon() {
    if (!inspectRequest) return;
    setError(null);
    onBusyChange(true);
    try {
      const response = await fetch("/api/server/admin/rcon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inspectRequest,
          command: rconCommand,
          rconPassword,
          rconPort: snapshot?.rcon.port,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(jsonError(data, "No se pudo ejecutar el comando."));
      setRconLog((current) => [data as RconCommandResult, ...current].slice(0, 12));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión.");
    } finally {
      onBusyChange(false);
    }
  }

  return (
    <section aria-label="Administración del servidor" className={`${serverPanelClass} space-y-4`} style={serverPanelStyle}>
      <SectionHeading
        icon={<Settings2 className="w-4 h-4" />}
        title="Administración"
        sub="server.properties, backups y consola RCON sanitizada. No se guardan credenciales."
        accentColor="#34d399"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => { void loadAdmin(); }}
          disabled={busy || !inspectRequest}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
          Leer administración
        </button>
        {(["properties", "backups", "rcon"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg border px-3 py-1.5 text-xs capitalize ${
              tab === id
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                : "border-[var(--color-border)] text-[var(--color-muted)]"
            }`}
          >
            {id === "properties" ? "Propiedades" : id === "backups" ? "Backups" : "RCON"}
          </button>
        ))}
      </div>

      {!inspectRequest && (
        <p className="text-sm text-[var(--color-muted)]">Completá una auditoría para habilitar la administración remota.</p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>
      )}

      {snapshot && tab === "properties" && (
        <div className="space-y-4">
          {!snapshot.properties ? (
            <p className="text-sm text-[var(--color-muted)]">No hay server.properties en la carpeta del servidor.</p>
          ) : (
            <>
              {snapshot.validation?.warnings.map((warning) => (
                <p key={warning} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{warning}</p>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                {MANAGED_KEYS.map((key) => (
                  <label key={key} className="text-xs text-[var(--color-muted)]">
                    {key}
                    <input
                      className={serverInputClass}
                      value={draft[key] ?? ""}
                      disabled={busy}
                      onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                    />
                  </label>
                ))}
              </div>
              {unmanagedKeys.length > 0 && (
                <p className="text-xs text-[var(--color-muted)]">
                  Claves no administradas (se conservan al guardar): {unmanagedKeys.join(", ")}
                </p>
              )}
              {!confirmWrite ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmWrite(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Guardar propiedades
                </button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <p className="w-full text-sm text-amber-200">Esto escribe server.properties en el servidor. El proceso no se detiene solo.</p>
                  <button type="button" disabled={busy} onClick={() => { void saveProperties(); }} className="rounded-xl bg-amber-500/20 px-4 py-2 text-sm text-amber-100">
                    Confirmar escritura
                  </button>
                  <button type="button" onClick={() => setConfirmWrite(false)} className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm">
                    Cancelar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {snapshot && tab === "backups" && (
        <div className="space-y-3">
          {snapshot.world && (
            <p className="text-sm text-[var(--color-muted)]">
              Mundo: <span className="text-[var(--color-foreground)]">{snapshot.world.levelName}</span>
              {snapshot.world.generatorName ? ` · ${snapshot.world.generatorName}` : ""}
              {snapshot.world.versionName ? ` · ${snapshot.world.versionName}` : ""}
            </p>
          )}
          {snapshot.backups.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No hay archivos de backup en backups/, backup/ ni simplebackups/.</p>
          ) : (
            <ul className="space-y-2">
              {snapshot.backups.map((backup) => (
                <li key={backup.path} className="rounded-xl border border-[var(--color-border)] bg-white/[0.03] px-3 py-2 text-sm">
                  <p className="font-medium text-[var(--color-foreground)]">{backup.filename}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {backup.worldName || "mundo"} · {(backup.sizeBytes / (1024 * 1024)).toFixed(1)} MiB · {new Date(backup.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {snapshot && tab === "rcon" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-muted)]">
            RCON {snapshot.rcon.enabled ? "habilitado" : "deshabilitado"} · puerto {snapshot.rcon.port}
            {snapshot.rcon.passwordConfigured ? " · hay contraseña en server.properties (no se muestra)" : " · sin contraseña configurada"}
          </p>
          <label className="block text-xs text-[var(--color-muted)]">
            Contraseña RCON
            <input
              type="password"
              className={serverInputClass}
              value={rconPassword}
              onChange={(event) => setRconPassword(event.target.value)}
              disabled={busy}
              autoComplete="off"
            />
          </label>
          <label className="block text-xs text-[var(--color-muted)]">
            Comando
            <input
              className={serverInputClass}
              value={rconCommand}
              onChange={(event) => setRconCommand(event.target.value)}
              disabled={busy}
              placeholder="list"
            />
          </label>
          <button
            type="button"
            disabled={busy || !rconPassword.trim() || !rconCommand.trim()}
            onClick={() => { void runRcon(); }}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-100 disabled:opacity-50"
          >
            <Terminal className="h-4 w-4" />
            Ejecutar
          </button>
          {rconLog.map((entry) => (
            <pre key={`${entry.executedAt}-${entry.command}`} className="whitespace-pre-wrap break-words rounded-xl border border-[var(--color-border)] bg-black/20 p-3 font-mono text-[11px] text-[var(--color-muted)]">
              {entry.success ? "ok" : "error"} · /{entry.command} · {entry.durationMs}ms{"\n"}{entry.response}
            </pre>
          ))}
        </div>
      )}
    </section>
  );
}
