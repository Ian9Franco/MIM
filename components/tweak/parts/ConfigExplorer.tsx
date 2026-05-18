import { useState, useEffect } from "react";
import { FolderOpen, File, Save, RefreshCw } from "lucide-react";

export function ConfigExplorer({ project }: { project: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    const savedMode = typeof window !== "undefined" ? localStorage.getItem("mim_app_mode") : "MIMU";
    const projectParam = savedMode === "MIMU" ? "MIMU" : project;
    try {
      const res = await fetch(`/api/config/files?project=${projectParam}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchFileContent = async (file: string) => {
    setSelectedFile(file);
    setFileContent("");
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

  const handleSave = async () => {
    if (!selectedFile) return;
    setSaving(true);
    const savedMode = typeof window !== "undefined" ? localStorage.getItem("mim_app_mode") : "MIMU";
    const projectParam = savedMode === "MIMU" ? "MIMU" : project;
    try {
      const res = await fetch("/api/config/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectParam, file: selectedFile, content: fileContent })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Archivo guardado correctamente." });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: data.error || "Error al guardar." });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
    setSaving(false);
  };

  useEffect(() => {
    fetchFiles();
  }, [project]);

  return (
    <div className="grid grid-cols-[250px_1fr] gap-6 h-[500px]">
      {/* File List */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-muted/60">Archivos</h4>
          <button onClick={fetchFiles} className="text-muted/40 hover:text-white transition-colors">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        {loading ? (
          <p className="text-[10px] text-muted/40 uppercase tracking-widest text-center py-4">Cargando...</p>
        ) : files.length === 0 ? (
          <p className="text-[10px] text-muted/40 uppercase tracking-widest text-center py-4">Sin archivos</p>
        ) : (
          <div className="space-y-1">
            {files.map(f => (
              <button
                key={f.name}
                onClick={() => fetchFileContent(f.name)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors ${
                  selectedFile === f.name ? "bg-primary/10 text-primary" : "text-white/60 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                {f.isDirectory ? <FolderOpen className="w-4 h-4 shrink-0" /> : <File className="w-4 h-4 shrink-0" />}
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
        {selectedFile ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-black uppercase tracking-widest text-white">{selectedFile}</h4>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Guardar
              </button>
            </div>
            {message && (
              <div className={`text-[10px] font-bold uppercase p-2 rounded-lg ${message.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {message.text}
              </div>
            )}
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="flex-1 bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-[11px] text-white/80 resize-none focus:outline-none focus:border-primary/40 custom-scrollbar"
              placeholder="Contenido del archivo..."
            />
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
