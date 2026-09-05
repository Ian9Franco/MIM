import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getSettings } from "@/lib/core/settings";
import { withApiGuard } from "@/lib/apiGuard";
import {
  assertPathSegment,
  resolveWithin,
  UnsafePathError,
} from "@/lib/security/safePaths";

function getConfigRoots(project: string) {
  assertPathSegment(project);

  const settings = getSettings();
  const basePath = project === "MIMU"
    ? path.resolve(settings.minecraftPath, "config")
    : resolveWithin(path.join(settings.sourceBase, "_projects"), path.join(project, "config"));
  const historyProjectRoot = resolveWithin(
    path.join(settings.sourceBase, ".mim-index", "history", "config"),
    project
  );

  return { basePath, historyProjectRoot };
}

function pathErrorResponse(error: unknown) {
  if (error instanceof UnsafePathError) {
    return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
  }
  const message = error instanceof Error ? error.message : "Error al acceder a la configuración";
  return NextResponse.json({ error: message }, { status: 500 });
}

export const GET = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

    try {
      const { searchParams } = new URL(req.url);
      const project = searchParams.get("project");
      const fileToRead = searchParams.get("file");
      const folder = searchParams.get("folder") || "";
      const history = searchParams.get("history") === "true";
      const version = searchParams.get("version");

      if (!project) {
        return NextResponse.json({ error: "Falta parámetro obligatorio: 'project'" }, { status: 400 });
      }

      const { basePath, historyProjectRoot } = getConfigRoots(project);

      if (!fs.existsSync(basePath)) {
        return NextResponse.json({ files: [], message: "La carpeta config no existe." });
      }

      // Modo 1: Leer historial (lista de versiones)
      if (fileToRead && history) {
        const historyDir = resolveWithin(historyProjectRoot, fileToRead);
        if (fs.existsSync(historyDir)) {
          const files = fs.readdirSync(historyDir).sort().reverse(); // Más recientes primero
          return NextResponse.json({ history: files.map(f => f.replace(".txt", "")) });
        }
        return NextResponse.json({ history: [] });
      }

      // Modo 2: Leer una versión específica del historial
      if (fileToRead && version) {
        assertPathSegment(version);
        const historyDir = resolveWithin(historyProjectRoot, fileToRead);
        const versionPath = resolveWithin(historyDir, `${version}.txt`);
        if (!fs.existsSync(versionPath)) {
          return NextResponse.json({ error: "La versión no existe" }, { status: 404 });
        }
        try {
          const content = fs.readFileSync(versionPath, "utf-8");
          return NextResponse.json({ content });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Error al leer la versión";
          return NextResponse.json({ error: message }, { status: 500 });
        }
      }

      // Modo 3: Leer archivo actual
      if (fileToRead) {
        const resolvedPath = resolveWithin(basePath, fileToRead);
        if (!fs.existsSync(resolvedPath)) {
          return NextResponse.json({ error: "El archivo no existe" }, { status: 404 });
        }
        try {
          const content = fs.readFileSync(resolvedPath, "utf-8");
          return NextResponse.json({ content });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Error al leer el archivo";
          return NextResponse.json({ error: message }, { status: 500 });
        }
      }

      // Modo 4: Listar archivos
      const targetPath = resolveWithin(basePath, folder, true);
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
    } catch (error: unknown) {
      return pathErrorResponse(error);
    }
  }
);

export const POST = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

    try {
      const body = await req.json();
      const { project, file, content } = body;

      if (!project || !file || content === undefined) {
        return NextResponse.json({ error: "Faltan parámetros obligatorios: 'project', 'file' o 'content'" }, { status: 400 });
      }

      if (typeof project !== "string" || typeof file !== "string") {
        return NextResponse.json({ error: "Parámetros 'project' y 'file' inválidos" }, { status: 400 });
      }

      const { basePath, historyProjectRoot } = getConfigRoots(project);
      const resolvedPath = resolveWithin(basePath, file);

      // Asegurar que el directorio existe
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

      // Guardar en historial antes de pisar
      if (fs.existsSync(resolvedPath)) {
        try {
          const oldContent = fs.readFileSync(resolvedPath, "utf-8");
          const historyDir = resolveWithin(historyProjectRoot, file);
          fs.mkdirSync(historyDir, { recursive: true });

          const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\./g, "_");
          fs.writeFileSync(resolveWithin(historyDir, `${timestamp}.txt`), oldContent, "utf-8");

          // Limitar a los últimos 20 snapshots
          const historyFiles = fs.readdirSync(historyDir).sort();
          if (historyFiles.length > 20) {
            const toDelete = historyFiles.slice(0, historyFiles.length - 20);
            toDelete.forEach(f => fs.unlinkSync(resolveWithin(historyDir, f)));
          }
        } catch (err) {
          console.error("Error al guardar historial:", err);
        }
      }

      fs.writeFileSync(resolvedPath, content, "utf-8");
      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      return pathErrorResponse(error);
    }
  }
);
