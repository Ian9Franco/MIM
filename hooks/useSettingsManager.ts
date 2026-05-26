import { useState, useEffect } from "react";

export function useSettingsManager(onClose: () => void) {
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  
  const [sourceBase, setSourceBase] = useState("");
  const [buildsBase, setBuildsBase] = useState("");
  const [downloadsPath, setDownloadsPath] = useState("");
  const [minecraftPath, setMinecraftPath] = useState("");
  const [stagingPath, setStagingPath] = useState("");
  
  const [modrinthApiKey, setModrinthApiKey] = useState("");
  const [curseforgeApiKey, setCurseforgeApiKey] = useState("");
  const [virusTotalApiKey, setVirusTotalApiKey] = useState("");
  
  const [showModrinth, setShowModrinth] = useState(false);
  const [showCurseforge, setShowCurseforge] = useState(false);
  const [showVirusTotal, setShowVirusTotal] = useState(false);
  const [activeTab, setActiveTab] = useState<"paths" | "apiKeys" | "tools">("paths");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moveProgress, setMoveProgress] = useState("");

  const [canEdit, setCanEdit] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [pathValidation, setPathValidation] = useState<Record<string, boolean>>({});
  const [keyValidation, setKeyValidation] = useState<Record<string, boolean | null>>({
    curseforge: null,
    modrinth: null,
    virusTotal: null
  });
  const [isValidating, setIsValidating] = useState(false);
  const [isValidatingKeys, setIsValidatingKeys] = useState(false);
  const [showStagingWarning, setShowStagingWarning] = useState<{ pathName: string; stagingPath: string } | null>(null);
  const [showInvalidPathsWarning, setShowInvalidPathsWarning] = useState(false);
  const [pathPickWarning, setPathPickWarning] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar ajustes");
        return r.json();
      })
      .then((d) => {
        setOriginalSettings(d);
        setSourceBase(d.sourceBase || "");
        setBuildsBase(d.buildsBase || "");
        setDownloadsPath(d.downloadsPath || "");
        setMinecraftPath(d.minecraftPath || "");
        setStagingPath(d.stagingPath || "");
        setModrinthApiKey(d.modrinthApiKey || "");
        setCurseforgeApiKey(d.curseforgeApiKey || "");
        setVirusTotalApiKey(d.virusTotalApiKey || "");
        setLoading(false);
        
        validatePaths([
          d.sourceBase, d.buildsBase, d.downloadsPath, d.minecraftPath, d.stagingPath
        ]);
        validateKeys(d.curseforgeApiKey, d.modrinthApiKey, d.virusTotalApiKey);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const validateKeys = async (cf: string, mr: string, vt: string) => {
    if (!cf && !mr && !vt) {
      setKeyValidation({ curseforge: false, modrinth: true, virusTotal: true });
      return;
    }
    
    setIsValidatingKeys(true);
    try {
      const res = await fetch("/api/settings/validate-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curseforge: cf, modrinth: mr, virusTotal: vt })
      });
      if (res.ok) {
        const { results } = await res.json();
        setKeyValidation(results);
      }
    } catch (e) {
      console.error("Error validando keys", e);
    }
    setIsValidatingKeys(false);
  };

  const validatePaths = async (paths: string[]) => {
    setIsValidating(true);
    try {
      const res = await fetch("/api/settings/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: paths.filter(Boolean) })
      });
      if (res.ok) {
        const { results } = await res.json();
        setPathValidation(results);
        const hasInvalid = Object.values(results).some(v => v === false);
        if (hasInvalid) setCanEdit(true);
      }
    } catch (e) {
      console.error("Error validando rutas", e);
    }
    setIsValidating(false);
  };

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        validatePaths([sourceBase, buildsBase, downloadsPath, minecraftPath, stagingPath]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [sourceBase, buildsBase, downloadsPath, minecraftPath, stagingPath, loading]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        validateKeys(curseforgeApiKey, modrinthApiKey, virusTotalApiKey);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [curseforgeApiKey, modrinthApiKey, virusTotalApiKey, loading]);

  const handlePickFolder = async (setter: (p: string) => void, isMinecraft = false, currentPath = "") => {
    if (pathValidation[currentPath] === false) {
      const message = isMinecraft 
        ? "No se detectó la carpeta de Minecraft en tu sistema.\n\nPara que MIM pueda gestionar tus mods y analizar errores, necesitás tener el juego instalado. ¿Deseas buscar la carpeta manualmente de todas formas?"
        : "La carpeta configurada no existe actualmente en el disco.\n\n¿Deseas abrir el explorador para seleccionar una ubicación válida?";
        
      setPathPickWarning({
        message,
        onConfirm: () => {
          setPathPickWarning(null);
          executePick(setter, currentPath);
        }
      });
      return;
    }
    await executePick(setter, currentPath);
  };

  const executePick = async (setter: (p: string) => void, currentPath = "") => {
    try {
      const url = currentPath 
        ? `/api/settings/pick-folder?initialPath=${encodeURIComponent(currentPath)}` 
        : "/api/settings/pick-folder";
        
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.path) setter(data.path);
      }
    } catch (e) {
      console.error("No se pudo abrir el selector", e);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setSourceBase(originalSettings.sourceBase || "");
      setBuildsBase(originalSettings.buildsBase || "");
      setDownloadsPath(originalSettings.downloadsPath || "");
      setMinecraftPath(originalSettings.minecraftPath || "");
      setStagingPath(originalSettings.stagingPath || "");
      setModrinthApiKey(originalSettings.modrinthApiKey || "");
      setCurseforgeApiKey(originalSettings.curseforgeApiKey || "");
      setVirusTotalApiKey(originalSettings.virusTotalApiKey || "");
    }
    setCanEdit(false);
  };

  const checkHasChanges = () => {
    if (!originalSettings) return false;
    return (
      sourceBase !== originalSettings.sourceBase ||
      buildsBase !== originalSettings.buildsBase ||
      downloadsPath !== originalSettings.downloadsPath ||
      minecraftPath !== originalSettings.minecraftPath ||
      stagingPath !== originalSettings.stagingPath ||
      modrinthApiKey !== (originalSettings.modrinthApiKey || "") ||
      curseforgeApiKey !== (originalSettings.curseforgeApiKey || "") ||
      virusTotalApiKey !== (originalSettings.virusTotalApiKey || "")
    );
  };

  const handleCloseAttempt = () => {
    if (saving) return;
    const currentPaths = [sourceBase, buildsBase, downloadsPath, minecraftPath, stagingPath];
    const hasInvalid = currentPaths.some(p => pathValidation[p] === false);

    if (hasInvalid) {
      if (pathValidation[minecraftPath] === false) {
        setShowStagingWarning({ pathName: "Minecraft (.minecraft)", stagingPath: stagingPath });
      } else {
        setShowInvalidPathsWarning(true);
      }
      setCanEdit(true);
      return;
    }

    if (checkHasChanges()) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const changes = [];
    if (sourceBase !== originalSettings.sourceBase) changes.push({ name: "Source", old: originalSettings.sourceBase, new: sourceBase });
    if (buildsBase !== originalSettings.buildsBase) changes.push({ name: "Builds", old: originalSettings.buildsBase, new: buildsBase });
    if (downloadsPath !== originalSettings.downloadsPath) changes.push({ name: "Descargas", old: originalSettings.downloadsPath, new: downloadsPath });
    if (minecraftPath !== originalSettings.minecraftPath) changes.push({ name: "Minecraft", old: originalSettings.minecraftPath, new: minecraftPath });
    if (stagingPath !== originalSettings.stagingPath) changes.push({ name: "Staging", old: originalSettings.stagingPath, new: stagingPath });

    if (changes.length > 0) {
      const move = window.confirm(
        "Has cambiado las rutas de destino. ¿Deseas MUDAR los archivos existentes a las nuevas ubicaciones ahora mismo?\n\nSi eliges Cancelar, solo se guardarán las rutas sin mover tus archivos."
      );

      if (move) {
        for (const change of changes) {
          setMoveProgress(`Moviendo ${change.name}...`);
          await fetch("/api/settings/move-files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourcePath: change.old, targetPath: change.new })
          });
        }
      }
    }

    setMoveProgress("Guardando ajustes...");
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        sourceBase, buildsBase, downloadsPath, minecraftPath, stagingPath,
        modrinthApiKey, curseforgeApiKey, virusTotalApiKey,
        validated: true 
      })
    });
    
    setSaving(false);
    onClose();
    window.location.reload();
  };

  return {
    sourceBase, setSourceBase, buildsBase, setBuildsBase, downloadsPath, setDownloadsPath, 
    minecraftPath, setMinecraftPath, stagingPath, setStagingPath,
    modrinthApiKey, setModrinthApiKey, curseforgeApiKey, setCurseforgeApiKey, virusTotalApiKey, setVirusTotalApiKey,
    showModrinth, setShowModrinth, showCurseforge, setShowCurseforge, showVirusTotal, setShowVirusTotal,
    activeTab, setActiveTab, loading, saving, moveProgress, canEdit, setCanEdit,
    showConfirmClose, setShowConfirmClose, pathValidation, keyValidation, 
    isValidating, isValidatingKeys, showStagingWarning, setShowStagingWarning,
    showInvalidPathsWarning, setShowInvalidPathsWarning,
    pathPickWarning, setPathPickWarning, handlePickFolder, handleReset, handleCloseAttempt, handleSave
  };
}
