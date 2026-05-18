import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getSettings } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const fileToRead = searchParams.get("file");

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

  // Modo 1: Leer archivo
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

  // Modo 2: Listar archivos
  try {
    const files = fs.readdirSync(basePath);
    const fileList = files.map(file => {
      const stats = fs.statSync(path.join(basePath, file));
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

    fs.writeFileSync(resolvedPath, content, "utf-8");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
