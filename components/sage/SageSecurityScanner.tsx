import React from "react";
import { RefreshCw, ScanSearch, ShieldCheck, ShieldAlert, ShieldBan, ShieldX, Loader2 } from "lucide-react";

export function SageSecurityScanner({ 
  secLoading, secError, secScanning, secScanned, secScannable, secResults, onScan, onReset, onFetch 
}: any) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="p-4 rounded-2xl border flex items-center justify-between gap-4"
        style={{ background: "rgba(16,185,129,0.04)", borderColor: "rgba(16,185,129,0.15)" }}>
        <div>
          <p className="text-xs font-headline font-bold text-emerald-400">Scanner de Seguridad</p>
          <p className="text-[10px] text-foreground/40 mt-0.5 leading-relaxed">
            Análisis de bytecode + reputación VirusTotal para todos los archivos del proyecto.
          </p>
        </div>
        <button
          onClick={secScanned ? onReset : onScan}
          disabled={secScanning || secLoading || secScannable.length === 0}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-headline font-bold bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          {secScanning ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Escaneando...</> : 
           secScanned ? <><RefreshCw className="w-3.5 h-3.5" /> Re-escanear</> : 
           <><ScanSearch className="w-3.5 h-3.5" /> Escanear ({secScannable.length})</>}
        </button>
      </div>

      {secLoading && (
        <div className="py-8 flex flex-col items-center gap-3 text-foreground/40">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <p className="text-xs">Listando archivos del proyecto...</p>
        </div>
      )}
      
      {secError && <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400">⚠️ {secError}</div>}

      {secScanning && (
        <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center gap-4">
          <div className="relative">
            <ShieldCheck className="w-10 h-10 text-emerald-400/30" />
            <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin absolute inset-0 m-auto" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-emerald-300">Escaneando {secScannable.length} archivos...</p>
            <p className="text-[10px] text-foreground/40 mt-1">Analizando bytecode + consultando VirusTotal</p>
          </div>
        </div>
      )}

      {!secScanning && !secScanned && !secLoading && secScannable.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/30 mb-3">{secScannable.length} archivo(s) para escanear</p>
          {(["mod", "resourcepack", "shader", "datapack"] as const).map(assetType => {
            const group = secScannable.filter((s: any) => s.assetType === assetType);
            if (group.length === 0) return null;
            const labelMap = { mod: "Mods", resourcepack: "Resource Packs", shader: "Shaders", datapack: "Datapacks" };
            const colorMap = { mod: "indigo", resourcepack: "cyan", shader: "purple", datapack: "amber" };
            const color = colorMap[assetType];
            return (
              <div key={assetType} className={`p-3 rounded-xl border border-${color}-500/15 bg-${color}-500/5`}>
                <p className={`text-[9px] font-black uppercase tracking-widest text-${color}-400 mb-2`}>{labelMap[assetType]} ({group.length})</p>
                <div className="space-y-1">
                  {group.map((f: any) => (
                    <div key={f.filePath} className="text-[10px] text-foreground/50 font-mono truncate">{f.fileName}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!secScanning && secScanned && secResults.length > 0 && <ScanResults results={secResults} />}
    </div>
  );
}

function ScanResults({ results }: { results: any[] }) {
  const critical = results.filter(r => r.result.riskLevel === "critical");
  const suspicious = results.filter(r => r.result.riskLevel === "suspicious");
  const caution = results.filter(r => r.result.riskLevel === "caution");
  const clean = results.filter(r => r.result.riskLevel === "clean");
  
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-2">
        <SummaryCard label="Limpios" count={clean.length} color="emerald" icon={<ShieldCheck className="w-4 h-4" />} />
        <SummaryCard label="Precaución" count={caution.length} color="amber" icon={<ShieldAlert className="w-4 h-4" />} />
        <SummaryCard label="Sospechosos" count={suspicious.length} color="orange" icon={<ShieldBan className="w-4 h-4" />} />
        <SummaryCard label="Críticos" count={critical.length} color="red" icon={<ShieldX className="w-4 h-4" />} />
      </div>

      <div className="space-y-2">
        {[...critical, ...suspicious, ...caution, ...clean].map((entry: any) => (
          <ResultCard key={entry.filePath} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, count, color, icon }: any) {
  return (
    <div className={`p-2.5 rounded-xl border border-${color}-500/20 bg-${color}-500/8 text-center`}>
      <div className={`flex justify-center mb-1 text-${color}-400`}>{icon}</div>
      <div className={`text-lg font-black text-${color}-400`}>{count}</div>
      <div className="text-[8px] text-foreground/40 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function ResultCard({ entry }: any) {
  const { riskLevel, summary } = entry.result;
  const colors: any = {
    clean: { text: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/15" },
    caution: { text: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/15" },
    suspicious: { text: "text-orange-400", bg: "bg-orange-500/5", border: "border-orange-500/15" },
    critical: { text: "text-red-400", bg: "bg-red-500/5", border: "border-red-500/15" }
  };
  const theme = colors[riskLevel];

  return (
    <div className={`p-3 rounded-xl border ${theme.bg} ${theme.border}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold truncate">{entry.fileName}</p>
          <p className={`text-[10px] mt-0.5 opacity-70 ${theme.text}`}>{summary}</p>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${theme.border} ${theme.text}`}>
          {riskLevel}
        </span>
      </div>
    </div>
  );
}
