import { useState, useEffect } from "react";
import { FolderOpen, File, Save, RefreshCw, Clock, ChevronLeft, ChevronRight } from "lucide-react";

function highlightTOML(text: string) {
  return text.split("\n").map(line => {
    let escaped = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    if (escaped.trim().startsWith("#")) {
      return `<span class="text-muted/50">${escaped}</span>`;
    }
    if (escaped.trim().startsWith("[")) {
      return `<span class="text-amber-400 font-bold">${escaped}</span>`;
    }
    
    const parts = escaped.split("=");
    if (parts.length > 1) {
      const key = parts[0];
      let val = parts.slice(1).join("=");
      
      // Números primero para no pisar las clases de Tailwind que agreguemos después
      val = val.replace(/\b(\d+)\b/g, '<span class="text-purple-400">$1</span>');
      val = val.replace(/\b(true|false)\b/g, '<span class="text-rose-400">$1</span>');
      
      return `<span class="text-blue-400">${key}</span>=<span class="text-emerald-400">${val}</span>`;
    }
    
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="text-purple-400">$1</span>');
    escaped = escaped.replace(/\b(true|false)\b/g, '<span class="text-rose-400">$1</span>');
    
    return escaped;
  }).join("\n");
}

export function ConfigExplorer({ project }: { project: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [targetEnv, setTargetEnv] = useState<"common" | "user" | "host">("common");

  const fetchFiles = async (folderPath = currentPath) => {
    setLoading(true);
    const savedMode = typeof window !== "undefined" ? localStorage.getItem("mim_app_mode") : "MIMU";
    const projectParam = savedMode === "MIMU" ? "MIMU" : project;
    try {
      const res = await fetch(`/api/config/files?project=${projectParam}&folder=${folderPath}`);
      const data = await res.json();
      setFiles(data.files || []);
      setCurrentPath(folderPath);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchFileContent = async (file: string) => {
    setSelectedFile(file);
    if (file.startsWith(".user/")) setTargetEnv("user");
    else if (file.startsWith(".host/")) setTargetEnv("host");
    else setTargetEnv("common");
    
    const savedMode = typeof window !== "undefined" ? localStorage.getItem("mim_app_mode") : "MIMU";
    const projectParam = savedMode === "MIMU" ? "MIMU" : project;
    try {
      const res = await fetch(`/api/config/files?project=${projectParam}&file=${file}`);
      const data = await res.json();
      setFileContent(data.content || "");
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async (file: string) => {
    const savedMode = typeof window !== "undefined" ? localStorage.getItem("mim_app_mode") : "MIMU";
    const projectParam = savedMode === "MIMU" ? "MIMU" : project;
    try {
      const res = await fetch(`/api/config/files?project=${projectParam}&file=${file}&history=true`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVersion = async (file: string, version: string) => {
    const savedMode = typeof window !== "undefined" ? localStorage.getItem("mim_app_mode") : "MIMU";
    const projectParam = savedMode === "MIMU" ? "MIMU" : project;
    try {
      const res = await fetch(`/api/config/files?project=${projectParam}&file=${file}&version=${version}`);
      const data = await res.json();
      setFileContent(data.content || "");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setSaving(true);

    let fileToSave = selectedFile;
    fileToSave = fileToSave.replace(/^\.user\//, "").replace(/^\.host\//, "");
    
    if (targetEnv === "user") fileToSave = `.user/${fileToSave}`;
    else if (targetEnv === "host") fileToSave = `.host/${fileToSave}`;

    const savedMode = typeof window !== "undefined" ? localStorage.getItem("mim_app_mode") : "MIMU";
    const projectParam = savedMode === "MIMU" ? "MIMU" : project;
    try {
      const res = await fetch(`/api/config/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: projectParam,
          file: fileToSave,
          content: fileContent
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Archivo guardado correctamente." });
        setTimeout(() => setMessage(null), 3000);
        fetchFiles(currentPath);
        setSelectedFile(fileToSave);
      } else {
        setMessage({ type: "error", text: data.error || "Error al guardar." });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Error de conexión." });
    }
    setSaving(false);
  };

  useEffect(() => {
    fetchFiles("");
  }, [project]);

  const lineCount = fileContent.split("\n").length;

  return (
    <div className={`grid ${sidebarCollapsed ? "grid-cols-[60px_1fr]" : "grid-cols-[250px_1fr]"} gap-6 h-[500px] transition-all duration-300`}>
      {/* File List */}
      <div className={`bg-white/[0.02] border border-white/5 rounded-2xl p-4 custom-scrollbar flex flex-col transition-all duration-300 ${sidebarCollapsed ? "items-center" : ""}`}>
        <div className={`flex items-center justify-between mb-4 w-full ${sidebarCollapsed ? "flex-col gap-4" : ""}`}>
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowHistory(false)} 
                className={`text-xs font-black uppercase tracking-widest ${!showHistory ? "text-white" : "text-muted/60 hover:text-white"}`}
              >
                Archivos
              </button>
              <span className="text-muted/20">|</span>
              <button 
                onClick={() => { if (selectedFile) { fetchHistory(selectedFile); setShowHistory(true); } }} 
                className={`text-xs font-black uppercase tracking-widest ${showHistory ? "text-white" : "text-muted/60 hover:text-white"} ${!selectedFile ? "opacity-30 cursor-not-allowed" : ""}`}
                disabled={!selectedFile}
              >
                Historial
              </button>
            </div>
          ) : (
            <div className="text-[10px] font-black text-muted/40 uppercase [writing-mode:vertical-rl] mt-2">
              {showHistory ? "Historial" : "Archivos"}
            </div>
          )}
          
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
            className="text-muted/40 hover:text-white transition-colors p-1 hover:bg-white/[0.05] rounded-lg"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!sidebarCollapsed && !showHistory && (
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted/40 mb-4 overflow-x-auto">
            <button onClick={() => fetchFiles("")} className="hover:text-white transition-colors">CONFIG</button>
            {currentPath.split("/").filter(Boolean).map((part, idx, arr) => (
              <span key={idx} className="flex items-center gap-1">
                <span>/</span>
                <button 
                  onClick={() => fetchFiles(arr.slice(0, idx + 1).join("/"))} 
                  className="hover:text-white transition-colors"
                >
                  {part}
                </button>
              </span>
            ))}
          </div>
        )}
        
        {!sidebarCollapsed && (
          showHistory ? (
            <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1">
              {history.length === 0 ? (
                <p className="text-[10px] text-muted/40 uppercase tracking-widest text-center py-4">Sin historial</p>
              ) : (
                history.map(v => (
                  <button
                    key={v}
                    onClick={() => fetchVersion(selectedFile!, v)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium text-white/60 hover:bg-white/[0.03] hover:text-white transition-colors"
                  >
                    <Clock className="w-4 h-4 shrink-0 text-muted/40" />
                    <span className="truncate">{v.replace("T", " ").replace(/_/g, ":").split(".")[0]}</span>
                  </button>
                ))
              )}
            </div>
          ) : loading ? (
            <p className="text-[10px] text-muted/40 uppercase tracking-widest text-center py-4">Cargando...</p>
          ) : files.length === 0 ? (
            <p className="text-[10px] text-muted/40 uppercase tracking-widest text-center py-4">Sin archivos</p>
          ) : (
            <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1">
              {files.map(f => {
                const fullPath = currentPath ? `${currentPath}/${f.name}` : f.name;
                return (
                  <button
                    key={f.name}
                    onClick={() => f.isDirectory ? fetchFiles(fullPath) : fetchFileContent(fullPath)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors ${
                      selectedFile === fullPath ? "bg-primary/10 text-primary" : "text-white/60 hover:bg-white/[0.03] hover:text-white"
                    }`}
                  >
                    {f.isDirectory ? <FolderOpen className="w-4 h-4 shrink-0 text-amber-400" /> : <File className="w-4 h-4 shrink-0 text-blue-400" />}
                    <span className="truncate">{f.name}</span>
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Editor */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
        {selectedFile ? (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden mr-4 min-w-0">
                  <File className="w-4 h-4 text-primary shrink-0" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-white truncate">{selectedFile}</h4>
                </div>
                
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-50 shrink-0"
                >
                  {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Guardar
                </button>
              </div>

              {/* Target Selector */}
              <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg self-start">
                <button
                  onClick={() => setTargetEnv("common")}
                  className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-md transition-colors ${targetEnv === "common" ? "bg-primary text-white" : "text-muted/60 hover:text-white"}`}
                >
                  Común
                </button>
                <button
                  onClick={() => setTargetEnv("user")}
                  className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-md transition-colors ${targetEnv === "user" ? "bg-primary text-white" : "text-muted/60 hover:text-white"}`}
                >
                  User
                </button>
                <button
                  onClick={() => setTargetEnv("host")}
                  className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-md transition-colors ${targetEnv === "host" ? "bg-primary text-white" : "text-muted/60 hover:text-white"}`}
                >
                  Host
                </button>
              </div>
            </div>
            {message && (
              <div className={`text-[10px] font-bold uppercase p-2 rounded-lg ${message.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {message.text}
              </div>
            )}
            
            <div className="flex-1 flex bg-black/40 border border-white/5 rounded-xl overflow-hidden relative">
              <style>{`
                .code-editor-textarea::selection {
                  color: transparent !important;
                  background: rgba(255, 255, 255, 0.2) !important;
                }
              `}</style>

              {/* Line Numbers */}
              <div className="bg-white/[0.02] text-muted/30 text-[11px] font-mono p-4 pr-2 text-right select-none border-r border-white/5 z-10">
                {Array.from({ length: Math.max(1, lineCount) }).map((_, i) => (
                  <div key={i} className="leading-5">{i + 1}</div>
                ))}
              </div>
              
              <div className="relative flex-1 overflow-auto custom-scrollbar grid grid-cols-1 grid-rows-1">
                {/* Highlighted Code */}
                <pre 
                  className="col-start-1 row-start-1 p-4 pl-2 font-mono text-[11px] leading-5 text-white/80 pointer-events-none whitespace-pre"
                  dangerouslySetInnerHTML={{ __html: highlightTOML(fileContent) }}
                />
                
                {/* Textarea */}
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="col-start-1 row-start-1 p-4 pl-2 font-mono text-[11px] leading-5 !text-transparent caret-primary resize-none focus:outline-none whitespace-pre code-editor-textarea bg-transparent w-full h-full"
                  placeholder="Contenido del archivo..."
                  spellCheck="false"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted/20">
            <FolderOpen className="w-12 h-12 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Selecciona un archivo para editar</p>
          </div>
        )}
      </div>
    </div>
  );
}
