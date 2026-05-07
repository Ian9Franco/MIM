/**
 * /api/project/logs — GET, DELETE
 * ─────────────────────────────────────────────────────────────────────────────
 * Recupera el listado de archivos de logs y crash reports de un proyecto,
 * lee el contenido de uno de ellos para su análisis con SAGE,
 * o elimina archivos de logs/crashes por solicitud del usuario.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { SOURCE_BASE } from "@/lib/constants";
import path from "path";
import fs from "fs";
import os from "os";

// Helper to resolve global .minecraft path depending on OS
function getGlobalMcPath(): string {
  const homeDir = os.homedir();
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(homeDir, "AppData", "Roaming"), ".minecraft");
  } else if (process.platform === "darwin") {
    return path.join(homeDir, "Library", "Application Support", "minecraft");
  } else {
    return path.join(homeDir, ".minecraft");
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const version = searchParams.get("version");
  const fileToRead = searchParams.get("file"); // Ej. "latest.log" o "crash-reports/crash-2026-05-06_12.30.00-client.txt"

  if (!project || !version) {
    return NextResponse.json(
      { error: "Faltan parámetros obligatorios: 'project' y 'version'" },
      { status: 400 }
    );
  }

  const projectPath = path.join(SOURCE_BASE, version, "_projects", project);
  const projectPathExists = fs.existsSync(projectPath);
  const globalMcPath = getGlobalMcPath();

  // ── MODO 1: Leer el contenido de un archivo específico ───────────────────────
  if (fileToRead) {
    const isGlobal = fileToRead.startsWith("global:");
    const relativePath = isGlobal ? fileToRead.substring(7) : fileToRead;
    const basePath = isGlobal ? globalMcPath : projectPath;

    // Si es local y el proyecto no existe físicamente, no se puede leer
    if (!isGlobal && !projectPathExists) {
      return NextResponse.json({ error: "El proyecto especificado no tiene archivos locales en el disco." }, { status: 404 });
    }

    // Seguridad: Evitar Directory Traversal resolviendo el path y verificando que esté dentro del directorio base
    const resolvedPath = path.resolve(basePath, relativePath);
    if (!resolvedPath.startsWith(path.resolve(basePath))) {
      return NextResponse.json({ error: "Acceso no autorizado: Intento de directory traversal detectado." }, { status: 403 });
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: `El archivo ${relativePath} no existe.` }, { status: 404 });
    }

    try {
      const stats = fs.statSync(resolvedPath);
      // Limitar tamaño de lectura por seguridad (máx 5MB)
      if (stats.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "El archivo es demasiado grande para ser procesado (máximo 5MB)." }, { status: 400 });
      }

      const content = fs.readFileSync(resolvedPath, "utf-8");
      return NextResponse.json({
        fileName: path.basename(resolvedPath),
        path: fileToRead, // conservamos el prefijo si es global
        content,
        size: stats.size,
        updatedAt: stats.mtime.toISOString(),
      });
    } catch (err: any) {
      return NextResponse.json({ error: `Error al leer el archivo: ${err.message}` }, { status: 500 });
    }
  }

  // ── MODO 2: Listar archivos disponibles (latest.log + crash-reports) ─────────
  const files: Array<{ name: string; path: string; size: number; mtime: string; type: "log" | "crash" }> = [];

  // 1. Escanear logs del proyecto local (latest.log)
  if (projectPathExists) {
    const logsDir = path.join(projectPath, "logs");
    if (fs.existsSync(logsDir)) {
      try {
        const latestLogPath = path.join(logsDir, "latest.log");
        if (fs.existsSync(latestLogPath)) {
          const stats = fs.statSync(latestLogPath);
          files.push({
            name: "latest.log (Instancia del Proyecto)",
            path: "logs/latest.log",
            size: stats.size,
            mtime: stats.mtime.toISOString(),
            type: "log",
          });
        }
      } catch (e) {
        console.warn("No se pudo leer el directorio de logs del proyecto:", e);
      }
    }

    // 2. Escanear crash-reports del proyecto local
    const crashReportsDir = path.join(projectPath, "crash-reports");
    if (fs.existsSync(crashReportsDir)) {
      try {
        const crashFiles = fs.readdirSync(crashReportsDir);
        for (const file of crashFiles) {
          if (file.endsWith(".txt")) {
            const filePath = path.join(crashReportsDir, file);
            const stats = fs.statSync(filePath);
            files.push({
              name: `${file} (Instancia del Proyecto)`,
              path: `crash-reports/${file}`,
              size: stats.size,
              mtime: stats.mtime.toISOString(),
              type: "crash",
            });
          }
        }
      } catch (e) {
        console.warn("No se pudo leer el directorio de crash-reports del proyecto:", e);
      }
    }
  }

  // 3. Escanear logs globales del sistema (.minecraft)
  const globalLogsDir = path.join(globalMcPath, "logs");
  if (fs.existsSync(globalLogsDir)) {
    try {
      const latestLogPath = path.join(globalLogsDir, "latest.log");
      if (fs.existsSync(latestLogPath)) {
        const stats = fs.statSync(latestLogPath);
        files.push({
          name: "latest.log (Global .minecraft)",
          path: "global:logs/latest.log",
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          type: "log",
        });
      }
    } catch (e) {
      console.warn("No se pudo leer el directorio de logs global:", e);
    }
  }

  // 4. Escanear crash-reports globales del sistema (.minecraft)
  const globalCrashReportsDir = path.join(globalMcPath, "crash-reports");
  if (fs.existsSync(globalCrashReportsDir)) {
    try {
      const crashFiles = fs.readdirSync(globalCrashReportsDir);
      for (const file of crashFiles) {
        if (file.endsWith(".txt")) {
          const filePath = path.join(globalCrashReportsDir, file);
          const stats = fs.statSync(filePath);
          files.push({
            name: `${file} (Global .minecraft)`,
            path: `global:crash-reports/${file}`,
            size: stats.size,
            mtime: stats.mtime.toISOString(),
            type: "crash",
          });
        }
      }
    } catch (e) {
      console.warn("No se pudo leer el directorio de crash-reports global:", e);
    }
  }

  // Ordenar de más reciente a más antiguo
  files.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

  return NextResponse.json({ files });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const version = searchParams.get("version");
  const fileToDelete = searchParams.get("file");

  if (!project || !version || !fileToDelete) {
    return NextResponse.json(
      { error: "Faltan parámetros obligatorios: 'project', 'version' y 'file'" },
      { status: 400 }
    );
  }

  const projectPath = path.join(SOURCE_BASE, version, "_projects", project);
  const globalMcPath = getGlobalMcPath();

  const isGlobal = fileToDelete.startsWith("global:");
  const relativePath = isGlobal ? fileToDelete.substring(7) : fileToDelete;
  const basePath = isGlobal ? globalMcPath : projectPath;

  // Evitar directory traversal
  const resolvedPath = path.resolve(basePath, relativePath);
  if (!resolvedPath.startsWith(path.resolve(basePath))) {
    return NextResponse.json({ error: "Acceso no autorizado: Intento de directory traversal detectado." }, { status: 403 });
  }

  // Asegurarnos de que sea un archivo de logs o crash-reports por seguridad
  const isLogOrCrash = relativePath.startsWith("logs/") || relativePath.startsWith("crash-reports/");
  if (!isLogOrCrash) {
    return NextResponse.json({ error: "Acceso denegado: Solo se pueden eliminar archivos de logs o crash-reports." }, { status: 400 });
  }

  if (!fs.existsSync(resolvedPath)) {
    return NextResponse.json({ error: "El archivo no existe." }, { status: 404 });
  }

  try {
    fs.unlinkSync(resolvedPath);
    return NextResponse.json({ success: true, message: "Archivo eliminado correctamente." });
  } catch (err: any) {
    return NextResponse.json({ error: `Error al eliminar el archivo: ${err.message}` }, { status: 500 });
  }
}
