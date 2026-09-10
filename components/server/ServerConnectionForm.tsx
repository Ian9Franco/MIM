"use client";
import { useState, type FormEvent } from "react";
import type { Project } from "@/lib/core/types";
import type { InspectServerRequest } from "@/lib/server/inspectSchema";

interface Props {
  projects: Project[];
  busy: boolean;
  onInspect: (input: InspectServerRequest) => void;
  onChange: () => void;
}
const inputClass = "mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-2 focus:outline-emerald-500";
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
  return <form onSubmit={submit} onChange={onChange} className="rounded-2xl border border-[var(--color-border)] p-5 md:p-6">
    <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
      <legend className="mb-4 text-lg font-semibold">Conectar y comparar</legend>
      <label className="block text-sm">Proyecto de MIM
        <select name="project" required className={inputClass} defaultValue="">
          <option value="" disabled>Elegí un proyecto con build AllHost</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.version} · {project.loader}</option>)}
        </select>
      </label>
      <p className="text-xs opacity-70">Se compara el último build de servidor generado, no los cambios del proyecto posteriores al build.</p>
      <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
        <label className="text-sm">Host SFTP<input className={inputClass} name="host" placeholder="sftp.ejemplo.com" required autoCapitalize="none" spellCheck={false} /></label>
        <label className="text-sm">Puerto<input className={inputClass} name="port" type="number" min={1} max={65535} defaultValue={22} required /></label>
      </div>
      <label className="block text-sm">Carpeta raíz del servidor<input className={inputClass} name="root" defaultValue="/" required /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Versión de Minecraft del servidor<input className={inputClass} name="version" placeholder="1.20.1" required /></label>
        <label className="text-sm">Loader del servidor<select className={inputClass} name="loader" defaultValue="" required>
          <option value="" disabled>Elegí el loader</option><option value="fabric">Fabric</option><option value="forge">Forge</option><option value="neoforge">NeoForge</option>
        </select></label>
      </div>
      <p className="text-xs opacity-70">Indicá la versión y el loader desde tu panel de hosting. Una dependencia de un mod no permite comprobar el runtime instalado.</p>
      <label className="block text-sm">Huella del host SSH (SHA256)<input className={inputClass} name="fingerprint" placeholder="SHA256:…" required autoCapitalize="none" spellCheck={false} /></label>
      <p className="text-xs opacity-70">Pedí la huella al administrador o consultala en el panel del hosting. La conexión se rechaza si no coincide.</p>
      <label className="block text-sm">Usuario SFTP<input className={inputClass} name="username" required autoComplete="off" autoCapitalize="none" /></label>
      <label className="block text-sm">Autenticación<select className={inputClass} value={authType} onChange={(e) => setAuthType(e.target.value as typeof authType)}>
        <option value="password">Contraseña</option><option value="privateKey">Clave privada</option>
      </select></label>
      {authType === "password" ? <label className="block text-sm">Contraseña<input className={inputClass} name="password" type="password" required autoComplete="off" /></label> : <>
        <label className="block text-sm">Clave privada<textarea className={`${inputClass} font-mono`} name="privateKey" required rows={4} autoComplete="off" spellCheck={false} /></label>
        <label className="block text-sm">Frase de contraseña (opcional)<input className={inputClass} name="passphrase" type="password" autoComplete="off" /></label>
      </>}
      <p className="text-xs opacity-70">MIM usa las credenciales solo para esta consulta y no las guarda. Cada nueva auditoría requiere ingresarlas nuevamente.</p>
      <button type="submit" disabled={!projects.length} className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? "Auditando…" : "Conectar y auditar mods"}</button>
    </fieldset>
  </form>;
}
