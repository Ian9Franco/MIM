import { withApiGuard } from "@/lib/apiGuard";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getSettings } from "@/lib/core/settings";
import { assertPathSegment, resolveWithin, UnsafePathError } from "@/lib/security/safePaths";

function configPaths(project: unknown) {
  assertPathSegment(project);
  const settings = getSettings();
  return {
    base: project === "MIMU"
      ? resolveWithin(settings.minecraftPath, "config")
      : resolveWithin(settings.sourceBase, path.join("_projects", project, "config")),
    history: resolveWithin(settings.sourceBase, path.join(".mim-index", "history", "config", project)),
  };
}

function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Error al acceder a la configuración" },
    { status: error instanceof UnsafePathError ? 403 : 500 },
  );
}

export const GET = withApiGuard({}, async ({ request: req }) => {
  try {
    const { searchParams } = new URL(req.url);
    const project = searchParams.get("project");
    const file = searchParams.get("file");
    const folder = searchParams.get("folder") || "";
    const history = searchParams.get("history") === "true";
    const version = searchParams.get("version");
    if (!project) return NextResponse.json({ error: "Falta parámetro obligatorio: 'project'" }, { status: 400 });
    const roots = configPaths(project);
    const target = resolveWithin(roots.base, file || folder, !file);
    if (version) assertPathSegment(version);
    if (file && (history || version)) {
      const historyDir = resolveWithin(roots.history, file);
      if (history) {
        const files = fs.existsSync(historyDir) ? fs.readdirSync(historyDir).filter(f => f.endsWith(".txt")).sort().reverse() : [];
        return NextResponse.json({ history: files.map(f => f.slice(0, -4)) });
      }
      const versionPath = resolveWithin(historyDir, `${version}.txt`);
      if (!fs.existsSync(versionPath)) return NextResponse.json({ error: "La versión no existe" }, { status: 404 });
      return NextResponse.json({ content: fs.readFileSync(versionPath, "utf-8") });
    }
    if (file) {
      if (!fs.existsSync(target)) return NextResponse.json({ error: "El archivo no existe" }, { status: 404 });
      return NextResponse.json({ content: fs.readFileSync(target, "utf-8") });
    }
    if (!fs.existsSync(target)) return NextResponse.json({ files: [], message: "La carpeta no existe." });
    const files = fs.readdirSync(target).map(name => {
      const stats = fs.lstatSync(path.join(target, name));
      return { name, isDirectory: stats.isDirectory(), size: stats.size, mtime: stats.mtime.toISOString() };
    });
    return NextResponse.json({ files });
  } catch (error) { return failure(error); }
});

export const POST = withApiGuard({}, async ({ request: req }) => {
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  if (!body || typeof body.project !== "string" || typeof body.file !== "string" || !body.file || typeof body.content !== "string") {
    return NextResponse.json({ error: "Se requieren project, file y content de tipo texto" }, { status: 400 });
  }
  try {
    const { project, file, content } = body;
    const roots = configPaths(project);
    const target = resolveWithin(roots.base, file);
    const historyDir = resolveWithin(roots.history, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (fs.existsSync(target)) {
      // A failed snapshot must not silently discard the previous configuration.
      const oldContent = fs.readFileSync(target, "utf-8");
      fs.mkdirSync(historyDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\./g, "_");
      fs.writeFileSync(resolveWithin(historyDir, `${timestamp}.txt`), oldContent, "utf-8");
      const historyFiles = fs.readdirSync(historyDir).filter(f => f.endsWith(".txt")).sort();
      for (const old of historyFiles.slice(0, Math.max(0, historyFiles.length - 20))) {
        fs.unlinkSync(resolveWithin(historyDir, old));
      }
    }
    fs.writeFileSync(target, content, "utf-8");
    return NextResponse.json({ success: true });
  } catch (error) { return failure(error); }
});
