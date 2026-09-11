"use client";
import { useState, type FormEvent } from "react";
import { Cable, Search } from "lucide-react";
import type { Project } from "@/lib/core/types";
import type { InspectServerRequest } from "@/lib/server/inspectSchema";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { serverInputClass, serverPanelClass, serverPanelStyle } from "./serverUi";

interface Props {
  projects: Project[];
  busy: boolean;
  onInspect: (input: InspectServerRequest) => void;
  onChange: () => void;
}

export function ServerConnectionForm({ projects, busy, onInspect, onChange }: Props) {
  const [authType, setAuthType] = useState<"password" | "privateKey">("password");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const value = (name: string) => String(values.get(name) || "");
    const project = projects.find((item) => item.id === value("project"));
    if (!project) return;
    const auth = authType === "password" ? { type: "password" as const, password: value("password") } :
      { type: "privateKey" as const, privateKey: value("privateKey"), passphrase: value("passphrase") || undefined };
    onInspect({ project, runtime: { minecraftVersion: value("version"), loader: value("loader") as Project["loader"] },
      connection: { host: value("host"), port: Number(value("port")), username: value("username"), rootPath: value("root"), knownHostFingerprint: value("fingerprint"), auth } });
    // Secrets live only in this request. Keep ordinary connection fields for another audit.
    for (const name of ["password", "privateKey", "passphrase"]) {
      const element = form.elements.namedItem(name);
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) element.value = "";
    }
  }
  return (
    <form onSubmit={submit} onChange={onChange} className={serverPanelClass} style={serverPanelStyle}>
      <SectionHeading icon={<Cable className="w-4 h-4" />} title="Conexión SFTP" sub="Compará el último build AllHost del proyecto elegido." accentColor="#10b981" />
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
      <label className="block text-sm font-medium text-[var(--color-foreground)]">Proyecto de MIM
        <select name="project" required className={serverInputClass} defaultValue="">
          <option value="" disabled>Elegí un proyecto con build AllHost</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.version} · {project.loader}</option>)}
        </select>
      </label>
      <p className="text-xs text-[var(--color-muted)]">Se compara el último build de servidor generado, no los cambios del proyecto posteriores al build.</p>
      <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
        <label className="text-sm font-medium text-[var(--color-foreground)]">Host SFTP<input className={serverInputClass} name="host" placeholder="sftp.ejemplo.com" required autoCapitalize="none" spellCheck={false} /></label>
        <label className="text-sm font-medium text-[var(--color-foreground)]">Puerto<input className={serverInputClass} name="port" type="number" min={1} max={65535} defaultValue={22} required /></label>
      </div>
      <label className="block text-sm font-medium text-[var(--color-foreground)]">Carpeta raíz del servidor<input className={serverInputClass} name="root" defaultValue="/" required /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-[var(--color-foreground)]">Versión de Minecraft del servidor<input className={serverInputClass} name="version" placeholder="1.20.1" required /></label>
        <label className="text-sm font-medium text-[var(--color-foreground)]">Loader del servidor<select className={serverInputClass} name="loader" defaultValue="" required>
          <option value="" disabled>Elegí el loader</option><option value="fabric">Fabric</option><option value="forge">Forge</option><option value="neoforge">NeoForge</option>
        </select></label>
      </div>
      <p className="text-xs text-[var(--color-muted)]">Indicá la versión y el loader desde tu panel de hosting. Una dependencia de un mod no permite comprobar el runtime instalado.</p>
      <label className="block text-sm font-medium text-[var(--color-foreground)]">Huella del host SSH (SHA256)<input className={serverInputClass} name="fingerprint" placeholder="SHA256:…" required autoCapitalize="none" spellCheck={false} /></label>
      <p className="text-xs text-[var(--color-muted)]">Pedí la huella al administrador o consultala en el panel del hosting. La conexión se rechaza si no coincide.</p>
      <label className="block text-sm font-medium text-[var(--color-foreground)]">Usuario SFTP<input className={serverInputClass} name="username" required autoComplete="off" autoCapitalize="none" /></label>
      <label className="block text-sm font-medium text-[var(--color-foreground)]">Autenticación<select className={serverInputClass} value={authType} onChange={(e) => setAuthType(e.target.value as typeof authType)}>
        <option value="password">Contraseña</option><option value="privateKey">Clave privada</option>
      </select></label>
      {authType === "password" ? <label className="block text-sm font-medium text-[var(--color-foreground)]">Contraseña<input className={serverInputClass} name="password" type="password" required autoComplete="off" /></label> : <>
        <label className="block text-sm font-medium text-[var(--color-foreground)]">Clave privada<textarea className={`${serverInputClass} font-mono`} name="privateKey" required rows={4} autoComplete="off" spellCheck={false} /></label>
        <label className="block text-sm font-medium text-[var(--color-foreground)]">Frase de contraseña (opcional)<input className={serverInputClass} name="passphrase" type="password" autoComplete="off" /></label>
      </>}
      <p className="text-xs text-[var(--color-muted)]">MIM usa las credenciales solo para esta consulta y no las guarda. Cada nueva auditoría requiere ingresarlas nuevamente.</p>
      <button
        type="submit"
        disabled={!projects.length || busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] disabled:opacity-50"
      >
        <Search className="h-4 w-4" />
        {busy ? "Auditando…" : "Conectar y auditar mods"}
      </button>
    </fieldset>
    </form>
  );
}
