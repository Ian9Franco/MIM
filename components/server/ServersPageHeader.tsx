import Link from "next/link";
import { ArrowLeft, Server, ShieldAlert, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { serverPanelClass, serverPanelStyle } from "./serverUi";

export function ServersPageHeader() {
  return (
    <>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white/5 px-3 py-2 text-xs font-medium text-[var(--color-muted)] transition-colors hover:border-primary/30 hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a proyectos
      </Link>

      <header className={`${serverPanelClass} space-y-4`} style={serverPanelStyle}>
        <SectionHeading
          icon={<Server className="w-4 h-4" />}
          title="MIM Server"
          sub="Compará y sincronizá mods del build AllHost contra tu servidor remoto por SFTP."
          accentColor="#10b981"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-label text-[9px] uppercase tracking-wider rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-400">
            En desarrollo
          </span>
          <span className="font-label text-[9px] uppercase tracking-wider rounded-lg border border-[var(--color-border)] bg-white/5 px-2.5 py-1 text-[var(--color-muted)]">
            Solo JAR en mods/
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            La auditoría es de solo lectura. Aplicar el plan escribe, reemplaza o quita JAR en el servidor.
          </p>
          <p className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            Configs, mundos y descarga automática de mods siguen pendientes. Las credenciales no se guardan.
          </p>
        </div>
      </header>
    </>
  );
}
