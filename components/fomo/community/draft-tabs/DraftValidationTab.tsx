import React, { useState, useMemo, useEffect } from "react";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Server, Monitor, Layers, Activity, ShieldCheck, HelpCircle } from "lucide-react";
import { supabase } from "@/lib/core/supabaseClient";

interface ValidationResult {
  id: string;
  type: "critical" | "warning" | "success";
  title: string;
  description: string;
  affectedItems?: any[];
  icon: any;
}

export function DraftValidationTab({
  draftId,
  isModern,
  draft,
  draftItems,
}: {
  draftId: string;
  isModern: boolean;
  draft: any;
  draftItems: any[];
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);

  // Text utilities based on theme
  const txt = isModern ? "text-foreground" : "text-white";
  const txtSub = isModern ? "text-muted-foreground" : "text-white/60";
  const bgCard = isModern ? "bg-card border-border" : "bg-white/[0.02] border-white/10";
  const bgWarning = isModern ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-amber-500/10 border-amber-500/20 text-amber-400";
  const bgError = isModern ? "bg-red-500/10 border-red-500/20 text-red-600" : "bg-red-500/10 border-red-500/20 text-red-400";
  const bgSuccess = isModern ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";

  const runLocalScan = () => {
    setIsScanning(true);
    
    const runScan = async () => {
      const newResults: ValidationResult[] = [];

      // 1. Check for duplicates (same project_id)
      const projectCounts: Record<string, any[]> = {};
      draftItems.forEach(item => {
        if (!item.project_id) return;
        if (!projectCounts[item.project_id]) projectCounts[item.project_id] = [];
        projectCounts[item.project_id].push(item);
      });

      const duplicates = Object.values(projectCounts).filter(arr => arr.length > 1);
      if (duplicates.length > 0) {
        newResults.push({
          id: "duplicates",
          type: "critical",
          title: "Mods Duplicados Detectados",
          description: "Se encontraron múltiples versiones del mismo proyecto. Esto causará crasheos seguros.",
          affectedItems: duplicates.flat(),
          icon: Layers
        });
      }

      // 2. Client/Server Mismatch
      const wrongSideItems = draftItems.filter(item => {
        // Shaders and Textures should ONLY be client
        if ((item.content_type === "shader" || item.content_type === "resourcepack") && item.side !== "client") {
          return true;
        }
        
        // Known client-only mods
        const name = (item.mod_name || item.project_id || "").toLowerCase();
        const isClientOnlyMod = name.includes("minimap") || name.includes("hud") || name.includes("iris") || name.includes("oculus") || name.includes("sodium") || name.includes("rubidium");
        
        if (isClientOnlyMod && item.side !== "client") {
          return true;
        }
        return false;
      });

      if (wrongSideItems.length > 0) {
        newResults.push({
          id: "wrong_side",
          type: "warning",
          title: "Configuración Lógica de Lados Incorrecta",
          description: "Algunos elementos (como Shaders, Texturas o Mods visuales) deberían estar marcados como 'Client' para no romper los servidores.",
          affectedItems: wrongSideItems,
          icon: Monitor
        });
      }

      // 3. Orphan items (uncategorized)
      const orphans = draftItems.filter(item => item.content_type === "mod" && (!item.category || item.category === "other"));
      if (orphans.length > 0) {
        newResults.push({
          id: "orphans",
          type: "warning",
          title: "Mods sin Categorizar",
          description: `Hay ${orphans.length} mod(s) marcados como "Otros / Sin Asignar". Se recomienda categorizarlos para mantener orden en la librería.`,
          affectedItems: orphans,
          icon: HelpCircle
        });
      }

      // 3.5 Local Dependency Checks (Instant)
      const draftProjectIds = new Set(draftItems.map(i => String(i.project_id)));
      const localMissingDeps = new Map<string, { missingProject: string, requiredBy: any[] }>();

      draftItems.forEach(item => {
        if (item.dependencies && Array.isArray(item.dependencies) && item.dependencies.length > 0) {
          item.dependencies.forEach((dep: any) => {
            const depId = String(dep.project_id);
            if (dep.dependency_type === "required" && dep.project_id) {
              if (!draftProjectIds.has(depId)) {
                if (!localMissingDeps.has(depId)) {
                  localMissingDeps.set(depId, { missingProject: depId, requiredBy: [] });
                }
                const reqArray = localMissingDeps.get(depId)!.requiredBy;
                if (!reqArray.some(x => x.id === item.id)) reqArray.push(item);
              }
            }
            if (dep.dependency_type === "incompatible" && dep.project_id) {
              if (draftProjectIds.has(depId)) {
                const incompatibleItem = draftItems.find(i => String(i.project_id) === depId);
                // Prevent duplicate incompatible logs
                if (!newResults.some(r => r.id === `incompatible_${item.id}_${depId}` || r.id === `incompatible_${incompatibleItem?.id}_${item.id}`)) {
                  newResults.push({
                    id: `incompatible_${item.id}_${depId}`,
                    type: "critical",
                    title: "Conflicto de Mods (Incompatibilidad Local)",
                    description: `El mod es explícitamente incompatible con [${depId}]. Debes eliminar uno.`,
                    affectedItems: [item, incompatibleItem].filter(Boolean),
                    icon: XCircle
                  });
                }
              }
            }
          });
        }
      });

      if (localMissingDeps.size > 0) {
        Array.from(localMissingDeps.values()).forEach(missing => {
          newResults.push({
            id: `missing_${missing.missingProject}`,
            type: "critical",
            title: "Dependencia Requerida Faltante",
            description: `Falta instalar el mod [${missing.missingProject}]. Es requerido por los siguientes mods:`,
            affectedItems: missing.requiredBy,
            icon: Server
          });
        });
      }

      // --- DEEP API ANALYSIS (MODRINTH - ONLY FOR OLD ITEMS WITHOUT DEPS) ---
      try {
        // Detect Modrinth items that DO NOT have dependencies cached locally yet
        const modrinthItems = draftItems.filter(i => 
          i.project_id && (!i.dependencies || i.dependencies.length === 0) && (i.source === "modrinth" || (typeof i.project_id === "string" && i.project_id.length === 8))
        );
        
        if (modrinthItems.length > 0) {
          const fetchedVersions: any[] = [];
          const missingDependencies = new Map<string, { missingProject: string, requiredBy: any[] }>();
          const draftProjectIds = new Set(draftItems.map(i => String(i.project_id)));

          // 1. Fetch items WITH version_id in bulk
          const itemsWithVersion = modrinthItems.filter(i => i.version_id);
          if (itemsWithVersion.length > 0) {
            const versionIds = itemsWithVersion.map(i => i.version_id);
            const chunkSize = 50;
            
            for (let i = 0; i < versionIds.length; i += chunkSize) {
              const chunk = versionIds.slice(i, i + chunkSize);
              const query = encodeURIComponent(JSON.stringify(chunk));
              const res = await fetch(`https://api.modrinth.com/v2/versions?ids=${query}`);
              if (res.ok) {
                const data = await res.json();
                fetchedVersions.push(...data);
              }
            }
          }

          // 2. Fetch items WITHOUT version_id (fetch their latest version for context)
          const itemsWithoutVersion = modrinthItems.filter(i => !i.version_id);
          if (itemsWithoutVersion.length > 0) {
            await Promise.all(itemsWithoutVersion.map(async (item) => {
              try {
                // Fetch versions for this project (we just take the first one to check deps)
                const res = await fetch(`https://api.modrinth.com/v2/project/${item.project_id}/version`);
                if (res.ok) {
                  const data = await res.json();
                  if (data && data.length > 0) {
                    fetchedVersions.push(data[0]); // inject the latest version
                  }
                }
              } catch (e) {
                console.error("Failed to fetch version for", item.project_id);
              }
            }));
          }

          fetchedVersions.forEach(v => {
            if (!v.dependencies) return;
            
            // Match fetched version back to a draft item (by version_id or project_id)
            const sourceItem = modrinthItems.find(i => i.version_id === v.id || i.project_id === v.project_id);
            if (!sourceItem) return;

            v.dependencies.forEach((dep: any) => {
              const depId = String(dep.project_id);
              // Check for missing required dependencies
              if (dep.dependency_type === "required" && dep.project_id) {
                if (!draftProjectIds.has(depId)) {
                  if (!missingDependencies.has(depId)) {
                    missingDependencies.set(depId, { missingProject: depId, requiredBy: [] });
                  }
                  // Avoid pushing duplicates
                  const reqArray = missingDependencies.get(depId)!.requiredBy;
                  if (!reqArray.some(x => x.id === sourceItem.id)) {
                    reqArray.push(sourceItem);
                  }
                }
              }

              // Check for explicit incompatibilities
              if (dep.dependency_type === "incompatible" && dep.project_id) {
                if (draftProjectIds.has(depId)) {
                  const incompatibleItem = draftItems.find(i => String(i.project_id) === depId);
                  newResults.push({
                    id: `incompatible_${sourceItem.id}_${depId}`,
                    type: "critical",
                    title: "Conflicto de Mods (Incompatibilidad)",
                    description: `El mod es explícitamente incompatible con [${depId}]. Debes eliminar uno de los dos.`,
                    affectedItems: [sourceItem, incompatibleItem].filter(Boolean),
                    icon: XCircle
                  });
                }
              }
            });
          });

          if (missingDependencies.size > 0) {
            Array.from(missingDependencies.values()).forEach(missing => {
              newResults.push({
                id: `missing_${missing.missingProject}`,
                type: "critical",
                title: "Dependencia Requerida Faltante",
                description: `Falta instalar el mod [${missing.missingProject}]. Es requerido por los siguientes mods:`,
                affectedItems: missing.requiredBy,
                icon: Server
              });
            });
          }
        }
      } catch (err) {
        console.error("Error en Análisis Profundo de Modrinth", err);
        newResults.push({
          id: "api_error",
          type: "warning",
          title: "Fallo al conectar con Modrinth",
          description: "No se pudieron verificar dependencias externas por un problema de red.",
          icon: AlertTriangle
        });
      }

      // 4. Success state if everything is fine (or close to it)
      if (newResults.length === 0) {
        newResults.push({
          id: "perfect",
          type: "success",
          title: "Draft en Excelentes Condiciones",
          description: "No se detectaron problemas locales ni faltan dependencias conocidas en Modrinth.",
          icon: ShieldCheck
        });
      }

      setResults(newResults);
      setHasScanned(true);
      setIsScanning(false);
    };

    runScan();
  };

  const criticalCount = results.filter(r => r.type === "critical").length;
  const warningCount = results.filter(r => r.type === "warning").length;
  
  const healthScore = hasScanned 
    ? Math.max(0, 100 - (criticalCount * 30) - (warningCount * 10))
    : null;

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 ${isModern ? "bg-gradient-to-r from-muted/50 to-background border-border" : "bg-gradient-to-r from-white/[0.02] to-transparent border-white/10"}`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
            !hasScanned ? "bg-blue-500/20 text-blue-500" 
            : healthScore! < 50 ? "bg-red-500/20 text-red-500" 
            : healthScore! < 90 ? "bg-amber-500/20 text-amber-500" 
            : "bg-emerald-500/20 text-emerald-500"
          }`}>
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h2 className={`text-xl font-black ${txt}`}>Centro de Diagnóstico</h2>
            <p className={`text-sm mt-1 ${txtSub} max-w-md`}>
              Analiza tu modpack en busca de duplicados, conflictos de versiones y mala configuración de cliente/servidor.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {hasScanned && (
            <div className="text-center mb-1">
              <span className={`text-3xl font-black ${
                healthScore! < 50 ? (isModern ? "text-red-600" : "text-red-400")
                : healthScore! < 90 ? (isModern ? "text-amber-600" : "text-amber-400")
                : (isModern ? "text-emerald-600" : "text-emerald-400")
              }`}>
                {healthScore}/100
              </span>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${txtSub}`}>Salud del Draft</p>
            </div>
          )}
          <button
            onClick={runLocalScan}
            disabled={isScanning}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-md ${
              isScanning 
                ? "bg-primary/50 text-white cursor-not-allowed" 
                : "bg-primary text-white hover:bg-primary/90 hover:scale-[1.02]"
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
            {isScanning ? "Analizando..." : hasScanned ? "Re-escanear" : "Ejecutar Diagnóstico"}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-6">
        {!hasScanned && !isScanning && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-12">
            <ShieldCheck className={`w-16 h-16 mb-4 ${txtSub}`} />
            <p className={`text-lg font-bold ${txt}`}>Listo para analizar</p>
            <p className={`text-sm ${txtSub}`}>Haz clic en &quot;Ejecutar Diagnóstico&quot; para comenzar.</p>
          </div>
        )}

        {isScanning && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <RefreshCw className="w-10 h-10 mb-4 animate-spin text-primary" />
            <p className={`text-lg font-bold ${txt}`}>Analizando dependencias y lados...</p>
          </div>
        )}

        {hasScanned && !isScanning && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {results.map(result => {
              const Icon = result.icon;
              const isCritical = result.type === "critical";
              const isWarning = result.type === "warning";
              const isSuccess = result.type === "success";

              const colorClass = isCritical ? bgError : isWarning ? bgWarning : bgSuccess;

              return (
                <div key={result.id} className={`p-4 md:p-5 rounded-2xl border flex flex-col gap-3 ${bgCard}`}>
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${colorClass}`}>
                      {isCritical ? <XCircle className="w-5 h-5" /> : isWarning ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className={`text-base font-bold flex items-center gap-2 ${txt}`}>
                        {result.title}
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${colorClass}`}>
                          {result.type}
                        </span>
                      </h4>
                      <p className={`text-sm mt-1 ${txtSub}`}>{result.description}</p>
                    </div>
                  </div>

                  {result.affectedItems && result.affectedItems.length > 0 && (
                    <div className={`mt-2 p-3 rounded-xl border flex flex-wrap gap-2 ${isModern ? "bg-muted/30 border-border" : "bg-black/20 border-white/10"}`}>
                      {result.affectedItems.map((item, idx) => (
                        <div key={idx} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${isModern ? "bg-background border-border text-foreground" : "bg-white/5 border-white/10 text-white"}`}>
                          {item.icon_url ? (
                            <img src={item.icon_url} alt="" className="w-3.5 h-3.5 rounded-md" />
                          ) : (
                            <Icon className="w-3 h-3 text-primary" />
                          )}
                          <span className="truncate max-w-[120px]">{item.mod_name || item.project_id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        )}
      </div>
    </div>
  );
}
