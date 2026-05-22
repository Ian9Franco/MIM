import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getSettings } from "@/lib/core/settings";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const fileToRead = searchParams.get("file");
  const folder = searchParams.get("folder") || "";
  const history = searchParams.get("history") === "true";
  const version = searchParams.get("version");

  if (!project) {
    return NextResponse.json({ error: "Falta parámetro obligatorio: 'project'" }, { status: 400 });
  }

  const globalSettings = getSettings();
  const isMimu = project === "MIMU";
  const basePath = isMimu 
    ? path.join(globalSettings.minecraftPath, "config") 
    : path.join(globalSettings.sourceBase, "_projects", project, "config");

  if (!fs.existsSync(basePath)) {
    return NextResponse.json({ files: [], message: "La carpeta config no existe." });
  }

  // Modo 1: Leer historial (lista de versiones)
  if (fileToRead && history) {
    const historyDir = path.join(globalSettings.sourceBase, ".mim-index", "history", "config", project, fileToRead);
    if (fs.existsSync(historyDir)) {
      const files = fs.readdirSync(historyDir).sort().reverse(); // Más recientes primero
      return NextResponse.json({ history: files.map(f => f.replace(".txt", "")) });
    }
    return NextResponse.json({ history: [] });
  }

  // Modo 2: Leer una versión específica del historial
  if (fileToRead && version) {
    const versionPath = path.join(globalSettings.sourceBase, ".mim-index", "history", "config", project, fileToRead, `${version}.txt`);
    if (!fs.existsSync(versionPath)) {
      return NextResponse.json({ error: "La versión no existe" }, { status: 404 });
    }
    try {
      const content = fs.readFileSync(versionPath, "utf-8");
      return NextResponse.json({ content });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Modo 3: Leer archivo actual
  if (fileToRead) {
    const resolvedPath = path.resolve(basePath, fileToRead);
    if (!resolvedPath.startsWith(path.resolve(basePath))) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: "El archivo no existe" }, { status: 404 });
    }
    try {
      const content = fs.readFileSync(resolvedPath, "utf-8");
      return NextResponse.json({ content });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Modo 4: Listar archivos
  try {
    const targetPath = path.resolve(basePath, folder);
    if (!targetPath.startsWith(path.resolve(basePath))) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }
    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ files: [], message: "La carpeta no existe." });
    }
    const files = fs.readdirSync(targetPath);
    const fileList = files.map(file => {
      const stats = fs.statSync(path.join(targetPath, file));
      return {
        name: file,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtime: stats.mtime.toISOString()
      };
    });
    return NextResponse.json({ files: fileList });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project, file, content } = body;

    if (!project || !file || content === undefined) {
      return NextResponse.json({ error: "Faltan parámetros obligatorios: 'project', 'file' o 'content'" }, { status: 400 });
    }

    const globalSettings = getSettings();
    const isMimu = project === "MIMU";
    const basePath = isMimu 
      ? path.join(globalSettings.minecraftPath, "config") 
      : path.join(globalSettings.sourceBase, "_projects", project, "config");

    const resolvedPath = path.resolve(basePath, file);
    if (!resolvedPath.startsWith(path.resolve(basePath))) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    // Asegurar que el directorio existe
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

    // Guardar en historial antes de pisar
    if (fs.existsSync(resolvedPath)) {
      try {
        const oldContent = fs.readFileSync(resolvedPath, "utf-8");
        const historyDir = path.join(globalSettings.sourceBase, ".mim-index", "history", "config", project, file);
        fs.mkdirSync(historyDir, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\./g, "_");
        fs.writeFileSync(path.join(historyDir, `${timestamp}.txt`), oldContent, "utf-8");
        
        // Limitar a los últimos 20 snapshots
        const historyFiles = fs.readdirSync(historyDir).sort();
        if (historyFiles.length > 20) {
          const toDelete = historyFiles.slice(0, historyFiles.length - 20);
          toDelete.forEach(f => fs.unlinkSync(path.join(historyDir, f)));
        }
      } catch (err) {
        console.error("Error al guardar historial:", err);
      }
    }

    fs.writeFileSync(resolvedPath, content, "utf-8");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
