import React, { useState, useEffect } from "react";
import { User, Heart, Loader2, CheckCircle2, ChevronRight, FileUp, Trash2, AlertCircle, Upload } from "lucide-react";
import { NbtTreeViewer } from "./rescue/NbtTreeViewer";
import { InventoryManager } from "./rescue/InventoryManager";
import { RescueActions } from "./rescue/RescueActions";
import { TagType, NBTTag } from "@/lib/modding/nbt";

interface PlayerFile {
  fileName: string;
  filePath: string;
  isHost: boolean;
  worldName: string;
  isBackup?: boolean;
  coordinates?: [number, number, number];
  inventoryCount?: number;
  dimension?: string;
  error?: string;
}

export function SagePlayerRescue({ 
  players, loadingPlayers, selectedPlayer, setSelectedPlayer, rescuingPlayer, rescueLogs, rescueSuccess, onRescue 
}: any) {
  const [parsedData, setParsedData] = useState<any>(null);
  const [loadingParse, setLoadingParse] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"nbt" | "inventory" | "actions">("nbt");
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [saveLogs, setSaveLogs] = useState<string[]>([]);
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<{ username: string; uuid: string; avatarUrl: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedWorld, setSelectedWorld] = useState<string | null>(null);

  const worlds = Array.from(new Set(players.map((p: PlayerFile) => p.worldName)));

  // Parse the selected player file
  const handleParseFile = async (player: PlayerFile) => {
    if (!player.filePath) return;
    
    setLoadingParse(true);
    setParsingError(null);
    setParsedData(null);
    setSaveLogs([]);

    try {
      const response = await fetch(
        `/api/sage/player-rescue/parse?filePath=${encodeURIComponent(player.filePath)}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to parse file");
      }

      const data = await response.json();
      setParsedData(data);
    } catch (err: any) {
      setParsingError(err.message);
      setParsedData(null);
    } finally {
      setLoadingParse(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingParse(true);
    setParsingError(null);
    setParsedData(null);
    setSaveLogs([]);

    try {
      // In Tauri or Electron, the file object contains the real absolute path
      const realPath = (file as any).path;

      if (realPath) {
        // Trigger parsing by setting selected player directly using the real path
        setSelectedPlayer({
          fileName: file.name,
          filePath: realPath,
          isHost: false,
          worldName: "Archivos Externos"
        });
        return;
      }

      // Fallback for normal browser mode: Upload the file to a temp location
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/sage/player-rescue/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.error || "Failed to upload file");
      }

      const { filePath } = await uploadRes.json();

      // Trigger parsing by setting selected player
      setSelectedPlayer({
        fileName: file.name,
        filePath: filePath,
        isHost: false,
        worldName: "Archivos Externos"
      });

    } catch (err: any) {
      setParsingError(err.message);
      setLoadingParse(false);
    } finally {
      // Reset input
      if (fileInput) {
        fileInput.value = "";
      }
    }
  };

  // Save modified NBT
  const handleSave = async (modifiedNBT: NBTTag) => {
    if (!parsedData?.filePath) return;

    setSaving(true);
    setSaveLogs([]);

    try {
      const response = await fetch("/api/sage/player-rescue/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: parsedData.filePath,
          nbtData: modifiedNBT,
          createBackup: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save file");
      }

      const data = await response.json();
      setSaveLogs(data.logs || []);
    } catch (err: any) {
      setSaveLogs([`✗ Error: ${err.message}`]);
    } finally {
      setSaving(false);
    }
  };

  // Purge backup files
  const handlePurgeBackups = async () => {
    if (!parsedData?.filePath) return;

    setPurging(true);
    setSaveLogs([]);

    try {
      const response = await fetch(
        `/api/sage/player-rescue/purge-backups?filePath=${encodeURIComponent(parsedData.filePath)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to purge backups");
      }

      const data = await response.json();
      setSaveLogs(data.logs || []);

      // Re-parse to update backup list
      if (selectedPlayer) {
        handleParseFile(selectedPlayer);
      }
    } catch (err: any) {
      setSaveLogs([`✗ Error: ${err.message}`]);
    } finally {
      setPurging(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const response = await fetch("/api/sage/profile");
        if (!response.ok) return;
        const data = await response.json();
        if (active && data?.success) {
          setProfile(data.profile);
        }
      } catch {
        // ignore profile failures for now
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    fetchProfile();

    return () => {
      active = false;
    };
  }, []);

  // Auto-parse when selected player changes
  useEffect(() => {
    if (selectedPlayer) {
      handleParseFile(selectedPlayer);
    } else {
      setParsedData(null);
    }
  }, [selectedPlayer]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
        <Heart className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-headline font-bold text-amber-400">Rescate de Jugador Avanzado</p>
          <p className="text-xs text-white/50 mt-1 leading-relaxed">
            Editor NBT integrado. Modifica coordenadas, dimensiones e inventario. Lee datos directamente de archivos .dat con soporte para rutas externas.
          </p>
        </div>
      </div>

      {profile ? (
        <div className="p-4 rounded-2xl border border-white/10 bg-slate-950/40 flex items-center gap-4">
          <img
            src={`https://minotar.net/avatar/${profile.username}/64`}
            alt={`Avatar de ${profile.username}`}
            className="w-12 h-12 rounded-full border border-white/10"
          />
          <div>
            <p className="text-sm font-bold text-white">Hola, {profile.username}</p>
            <p className="text-xs text-white/50 mt-1">UUID: {profile.uuid}</p>
          </div>
        </div>
      ) : profileLoading ? (
        <div className="p-4 rounded-2xl border border-white/10 bg-slate-950/20 text-sm text-white/60">
          Cargando perfil de Minecraft...
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Player Selection */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/30">
            {selectedWorld ? `Jugadores en ${selectedWorld}` : `Seleccionar Mundo (${worlds.length})`}
          </h3>
          
          {/* File Upload */}
          <button
            onClick={() => fileInput?.click()}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white/90 font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importar Archivo Externo
          </button>
          <input
            ref={setFileInput}
            type="file"
            accept=".dat"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {loadingPlayers && (
              <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-30">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest">Buscando datos...</span>
              </div>
            )}
            
            {!loadingPlayers && !selectedWorld && worlds.map((world: any) => (
              <button
                key={world}
                onClick={() => setSelectedWorld(world)}
                className="w-full flex items-center justify-between p-4 rounded-xl border transition-all bg-white/2 border-white/5 text-foreground/40 hover:bg-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <p className="text-[14px] font-bold">{world}</p>
                    <p className="text-[11px] opacity-40 mt-1">
                      {players.filter((p: PlayerFile) => p.worldName === world).length} archivos
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-30" />
              </button>
            ))}

            {!loadingPlayers && selectedWorld && (
              <>
                <button
                  onClick={() => { setSelectedWorld(null); setSelectedPlayer(null); }}
                  className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-4"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Volver a Mundos
                </button>
                {players.filter((p: PlayerFile) => p.worldName === selectedWorld).map((p: any) => (
                  <button
                    key={p.filePath}
                    onClick={() => setSelectedPlayer(p)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                      selectedPlayer?.fileName === p.fileName 
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-lg shadow-amber-500/10" 
                        : "bg-white/2 border-white/5 text-foreground/40 hover:bg-white/5"
                    }`}
                    disabled={!!p.isBackup}
                  >
                    <div className="flex items-center gap-4">
                      <User className="w-5 h-5 opacity-70" />
                      <div className="text-left">
                        <p className="text-[14px] font-bold">{p.isHost ? "📊 Host/World Data" : (p.displayName || p.fileName)}</p>
                        <p className="text-[11px] opacity-40 mt-1">{p.fileName}</p>
                        {p.coordinates && (
                          <p className="text-[10px] opacity-30 mt-1">
                            📍 {Math.round(p.coordinates[0])}, {Math.round(p.coordinates[1])}, {Math.round(p.coordinates[2])}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-30" />
                  </button>
                ))}
              </>
            )}

            {!loadingPlayers && worlds.length === 0 && (
              <div className="py-10 text-center text-white/20 italic text-sm">No se encontraron mundos o jugadores.</div>
            )}
          </div>
        </div>

        {/* Right Panel: Editor */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedPlayer ? (
            <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl opacity-20">
              <Heart className="w-12 h-12 mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">Selecciona un jugador para comenzar</p>
            </div>
          ) : loadingParse ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Analizando datos NBT...</p>
            </div>
          ) : parsingError ? (
            <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400">Error de Análisis</p>
                <p className="text-xs text-red-300/70 mt-1">{parsingError}</p>
              </div>
            </div>
          ) : parsedData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="text-sm font-bold text-amber-200">[{parsedData.worldName}] - {parsedData.displayName || parsedData.fileName}</p>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/40 mt-1">{parsedData.username ? `Nombre de usuario detectado` : `Solo UUID`}</p>
                </div>
                <div className="text-right text-[11px] text-white/40">
                  <p>{parsedData.worldName}</p>
                  <p className="mt-1">{parsedData.fileName}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-white/5">
                {[
                  { id: "nbt", label: "📦 Árbol NBT", icon: "?" },
                  { id: "inventory", label: "🎒 Inventario", icon: "?" },
                  { id: "actions", label: "⚡ Acciones", icon: "?" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
                      activeTab === tab.id
                        ? "border-amber-400 text-amber-400"
                        : "border-transparent text-white/40 hover:text-white/60"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div>
                {activeTab === "nbt" && (
                  <NbtTreeViewer
                    nbtRoot={parsedData.nbt}
                    onModify={(modified) => setParsedData({ ...parsedData, nbt: modified })}
                  />
                )}

                {activeTab === "inventory" && (() => {
                  const rootCompound = parsedData.nbt.value as Record<string, NBTTag>;
                  let playerCompound = null;
                  
                  // level.dat structure: root -> Data (Compound) -> Player (Compound)
                  if (rootCompound["Data"]?.type === TagType.Compound) {
                    const dataCompound = rootCompound["Data"].value as Record<string, NBTTag>;
                    if (dataCompound["Player"]?.type === TagType.Compound) {
                      playerCompound = dataCompound["Player"].value as Record<string, NBTTag>;
                    }
                  }
                  
                  // UUID.dat structure: root is the Player compound itself
                  if (!playerCompound) {
                    playerCompound = rootCompound;
                  }
                  
                  return (
                    <InventoryManager
                      playerCompound={playerCompound}
                      onInventoryModify={(newInventory) => {
                        const modified = JSON.parse(JSON.stringify(parsedData.nbt));
                        const modRoot = modified.value as Record<string, NBTTag>;
                        
                        if (modRoot["Data"]?.type === TagType.Compound) {
                          const dataComp = modRoot["Data"].value as Record<string, NBTTag>;
                          if (dataComp["Player"]?.type === TagType.Compound) {
                            const playerComp = dataComp["Player"].value as Record<string, NBTTag>;
                            playerComp["Inventory"] = newInventory;
                          }
                        } else {
                          modRoot["Inventory"] = newInventory;
                        }
                        
                        setParsedData({ ...parsedData, nbt: modified });
                      }}
                    />
                  );
                })()}

                {activeTab === "actions" && (
                  <RescueActions
                    filePath={parsedData.filePath}
                    worldName={parsedData.worldName}
                    playerData={parsedData.playerData}
                    backupFiles={parsedData.backupFiles}
                    nbtRoot={parsedData.nbt}
                    onSave={handleSave}
                    onPurgeBackups={handlePurgeBackups}
                    saving={saving}
                    purging={purging}
                  />
                )}
              </div>

              {/* Warnings */}
              {parsedData.warnings?.length > 0 && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                  {parsedData.warnings.map((warn: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-amber-400 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Save Logs */}
              {saveLogs.length > 0 && (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    Resultado de la Operación
                  </div>
                  <div className="text-[11px] space-y-1 font-mono text-emerald-300/80">
                    {saveLogs.map((log, i) => (
                      <p key={i}>&gt; {log}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
