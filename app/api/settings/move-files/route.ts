import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Función recursiva para mover directorios
function moveDirectorySync(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      moveDirectorySync(srcPath, destPath);
    } else {
      // Mover el archivo (sobreescribe si existe)
      fs.copyFileSync(srcPath, destPath);
      fs.unlinkSync(srcPath);
    }
  }
  // Eliminar el directorio original vacío
  try {
    fs.rmdirSync(src);
  } catch (e) {
    console.warn(`No se pudo eliminar el directorio fuente: ${src}`, e);
  }
}

export async function POST(req: Request) {
  try {
    const { sourcePath, targetPath } = await req.json();

    if (!sourcePath || !targetPath) {
      return NextResponse.json({ error: "Rutas inválidas" }, { status: 400 });
    }

    if (sourcePath === targetPath) {
      return NextResponse.json({ success: true, message: "Misma ruta, no se hizo nada" });
    }

    // Validar que existan
    if (!fs.existsSync(sourcePath)) {
      return NextResponse.json({ error: "La ruta de origen no existe" }, { status: 404 });
    }

    // Mover recursivamente
    moveDirectorySync(sourcePath, targetPath);

    return NextResponse.json({ success: true, message: "Archivos movidos correctamente" });
  } catch (error: any) {
    console.error("Error moviendo archivos:", error);
    return NextResponse.json({ error: error.message || "Error al mover archivos" }, { status: 500 });
  }
}
