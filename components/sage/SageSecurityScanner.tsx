import React, { useState } from "react";
import { RefreshCw, ScanSearch, ShieldCheck, ShieldAlert, ShieldBan, ShieldX, Loader2, ChevronDown, ChevronUp, ExternalLink, Eye } from "lucide-react";

// ── Type helpers ──────────────────────────────────────────────────────────────

const LEVEL_CONFIG = {
  clean:      { label: "Limpio",      text: "text-emerald-400", bg: "rgba(16,185,129,0.08)",   border: "rgba(16,185,129,0.2)",  icon: ShieldCheck },
  caution:    { label: "Precaución",  text: "text-amber-400",   bg: "rgba(245,158,11,0.08)",   border: "rgba(245,158,11,0.2)",  icon: ShieldAlert },
  suspicious: { label: "Sospechoso", text: "text-orange-400",  bg: "rgba(249,115,22,0.08)",   border: "rgba(249,115,22,0.2)",  icon: ShieldBan },
  critical:   { label: "Crítico",    text: "text-red-400",     bg: "rgba(239,68,68,0.08)",    border: "rgba(239,68,68,0.2)",   icon: ShieldX },
} as const;

// ── Main component ─────────────────────────────────────────────────────────────

export function SageSecurityScanner({
  secLoading, secError, secScanning, secScanned,
  secScannable, secResults, onScan, onReset
}: any) {
  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header card ── */}
      <div className="p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background: "rgba(16,185,129,0.04)", borderColor: "rgba(16,185,129,0.2)" }}>
        <div>
          <p className="text-sm font-black text-emerald-400 tracking-wide">🛡️ SAGE — Scanner de Seguridad</p>
          <p className="text-xs text-white/50 mt-1 leading-relaxed">
            Análisis de bytecode · Detección de obfuscación · Reputación VirusTotal
          </p>
          {secScannable.length > 0 && !secScanned && (
            <p className="text-xs text-white/30 mt-1">{secScannable.length} archivos detectados y listos para analizar</p>
          )}
        </div>
        <button
          onClick={secScanned ? onReset : onScan}
          disabled={secScanning || secLoading || secScannable.length === 0}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          {secScanning ? <><RefreshCw className="w-4 h-4 animate-spin" /> Escaneando...</>
           : secScanned ? <><RefreshCw className="w-4 h-4" /> Re-escanear</>
           : <><ScanSearch className="w-4 h-4" /> Escanear ({secScannable.length})</>}
        </button>
      </div>

      {/* ── States ── */}
      {secLoading && (
        <div className="py-10 flex flex-col items-center gap-3 text-white/40">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          <p className="text-sm">Indexando archivos del proyecto...</p>
        </div>
      )}

      {secError && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400 flex items-center gap-2">
          ⚠️ {secError}
        </div>
      )}

      {secScanning && <ScanningAnimation count={secScannable.length} />}

      {/* ── Pre-scan file listing ── */}
      {!secScanning && !secScanned && !secLoading && secScannable.length > 0 && (
        <PreScanListing files={secScannable} />
      )}

      {/* ── Results ── */}
      {!secScanning && secScanned && secResults.length > 0 && (
        <ScanResults results={secResults} />
      )}

      {/* ── No files state ── */}
      {!secLoading && !secScanning && secScannable.length === 0 && (
        <div className="py-12 text-center text-white/30">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No hay archivos escaneables en este proyecto</p>
          <p className="text-xs mt-1 opacity-60">Descarga mods, texturas o shaders para analizarlos</p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScanningAnimation({ count }: { count: number }) {
  return (
    <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center gap-4">
      <div className="relative w-16 h-16">
        <ShieldCheck className="w-16 h-16 text-emerald-400/20" />
        <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin absolute inset-0 m-auto" />
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-emerald-300">Escaneando {count} archivos...</p>
        <p className="text-xs text-white/40 mt-1.5">Analizando bytecode · Consultando VirusTotal</p>
        <p className="text-xs text-white/20 mt-1">Esto puede tardar unos segundos dependiendo del tamaño</p>
      </div>
    </div>
  );
}

function PreScanListing({ files }: { files: any[] }) {
  const typeMap = {
    mod:          { label: "Mods",          color: "#818cf8" },
    resourcepack: { label: "Resource Packs", color: "#22d3ee" },
    shader:       { label: "Shaders",        color: "#c084fc" },
    datapack:     { label: "Datapacks",      color: "#fbbf24" },
    zip:          { label: "Otros",          color: "#94a3b8" },
  } as Record<string, { label: string; color: string }>;

  const groups = (["mod","resourcepack","shader","datapack","zip"] as const).map(type => ({
    type,
    files: files.filter((f: any) => f.assetType === type),
    ...( typeMap[type] || { label: type, color: "#94a3b8" })
  })).filter(g => g.files.length > 0);

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-white/30">{files.length} archivo(s) para escanear</p>
      {groups.map(g => (
        <div key={g.type} className="p-4 rounded-xl border" style={{ borderColor: g.color + "30", background: g.color + "08" }}>
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: g.color }}>{g.label} ({g.files.length})</p>
          <div className="space-y-1">
            {g.files.map((f: any) => (
              <div key={f.filePath} className="text-xs text-white/50 font-mono truncate">{f.fileName}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScanResults({ results }: { results: any[] }) {
  const critical   = results.filter(r => r.result.riskLevel === "critical");
  const suspicious = results.filter(r => r.result.riskLevel === "suspicious");
  const caution    = results.filter(r => r.result.riskLevel === "caution");
  const clean      = results.filter(r => r.result.riskLevel === "clean");

  return (
    <div className="space-y-5">
      {/* Summary grid */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard label="Limpios"     count={clean.length}     level="clean"      />
        <SummaryCard label="Precaución"  count={caution.length}   level="caution"    />
        <SummaryCard label="Sospechoso"  count={suspicious.length} level="suspicious" />
        <SummaryCard label="Críticos"    count={critical.length}  level="critical"   />
      </div>

      {/* Sorted results — worst first */}
      <div className="space-y-2.5">
        {[...critical, ...suspicious, ...caution, ...clean].map((entry: any) => (
          <ResultCard key={entry.filePath} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, count, level }: { label: string; count: number; level: keyof typeof LEVEL_CONFIG }) {
  const cfg = LEVEL_CONFIG[level];
  const Icon = cfg.icon;
  return (
    <div className="p-3 rounded-xl border text-center" style={{ background: cfg.bg, borderColor: cfg.border }}>
      <Icon className={`w-5 h-5 mx-auto mb-1.5 ${cfg.text}`} />
      <div className={`text-xl font-black ${cfg.text}`}>{count}</div>
      <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function ResultCard({ entry }: { entry: any }) {
  const [expanded, setExpanded] = useState(false);
  const { riskLevel, riskScore, virusTotal, findings, sha256, summary } = entry.result;
  const cfg = LEVEL_CONFIG[riskLevel as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG.clean;
  const Icon = cfg.icon;
  const hasFatal = findings?.some((f: any) => f.severity === "critical");

  return (
    <div className="rounded-xl border overflow-hidden transition-all duration-200"
      style={{ background: cfg.bg, borderColor: cfg.border }}>

      {/* ── Main row ── */}
      <div className="flex items-center gap-3 p-4">
        <Icon className={`w-5 h-5 shrink-0 ${cfg.text}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate text-white/90">{entry.fileName}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-white/40">{summary}</span>
            {virusTotal && (
              <span className={`text-xs font-bold ${virusTotal.maliciousCount > 0 ? "text-red-400" : "text-emerald-400"}`}>
                · VT: {virusTotal.maliciousCount}/{virusTotal.totalEngineCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${cfg.text}`}
            style={{ borderColor: cfg.border, background: cfg.bg }}>
            {riskScore}/100
          </span>
          {virusTotal?.detailsUrl && (
            <a href={virusTotal.detailsUrl} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors" title="Ver en VirusTotal">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {findings?.length > 0 && (
            <button onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded findings ── */}
      {expanded && findings?.length > 0 && (
        <div className="border-t px-4 pb-4 pt-3 space-y-2 animate-in slide-in-from-top-1"
          style={{ borderColor: cfg.border }}>
          <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-2">Detecciones ({findings.length})</p>
          {findings.map((f: any, i: number) => (
            <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-black/20">
              <span className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded mt-0.5 ${
                f.severity === "critical" ? "bg-red-500/20 text-red-400" :
                f.severity === "high" ? "bg-orange-500/20 text-orange-400" :
                f.severity === "medium" ? "bg-amber-500/20 text-amber-400" :
                "bg-white/10 text-white/40"
              }`}>{f.severity}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/80">{f.description}</p>
                {f.details?.length > 0 && (
                  <p className="text-[10px] text-white/30 font-mono mt-0.5 truncate">{f.details[0]}{f.details.length > 1 ? ` +${f.details.length - 1}` : ""}</p>
                )}
              </div>
            </div>
          ))}
          {sha256 && (
            <p className="text-[10px] font-mono text-white/20 mt-2 break-all">SHA-256: {sha256}</p>
          )}
        </div>
      )}
    </div>
  );
}
