import { NextRequest, NextResponse } from "next/server";
import { SOURCE_BASE, CATEGORIES, isValidLoader } from "@/lib/constants";
import { scanMod } from "@/lib/scanner";
import type { ModMeta } from "@/lib/scanner";
import { isLibrary, resolveDependencyScopes } from "@/lib/dependencyResolver";
import type { DependencyNode } from "@/lib/dependencyResolver";
import path from "path";
import fs from "fs";

interface ScannedModItem {
  path: string;
  fileName: string;
  category: string;
  sub: string;
  meta: ModMeta;
}

const UNKNOWN_META: ModMeta = {
  modId: "unknown",
  modName: "unknown",
  modVersion: "unknown",
  gameVersion: "unknown",
  loader: "unknown",
  projectType: "unknown",
  isCompatibleWithConnector: false,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const version = searchParams.get("version");
  const loader = searchParams.get("loader");
  const project = searchParams.get("project");

  if (!version) {
    return NextResponse.json(
      { error: "Missing required query param: version" },
      { status: 400 }
    );
  }

  if (!project && !loader) {
    return NextResponse.json(
      { error: "Missing required query param: loader (when project is not specified)" },
      { status: 400 }
    );
  }

  if (loader && !isValidLoader(loader)) {
    return NextResponse.json(
      { error: `Invalid loader "${loader}". Must be one of: forge, neoforge, fabric` },
      { status: 400 }
    );
  }

  const loaderPath = project
    ? path.join(SOURCE_BASE, "_projects", project, "mods")
    : path.join(SOURCE_BASE, version, loader!);

  if (!fs.existsSync(loaderPath)) {
    return NextResponse.json({ success: true, actions: [] });
  }

  // 1. Scan all active mods in the directory structure
  const scannedItems: ScannedModItem[] = [];

  for (const category of CATEGORIES) {
    const catPath = path.join(loaderPath, category);
    if (!fs.existsSync(catPath)) continue;

    for (const sub of fs.readdirSync(catPath)) {
      const subPath = path.join(catPath, sub);
      if (!fs.statSync(subPath).isDirectory()) continue;

      for (const file of fs.readdirSync(subPath)) {
        if (!file.endsWith(".jar")) continue;

        const filePath = path.join(subPath, file);
        let meta: ModMeta = UNKNOWN_META;
        try {
          meta = scanMod(filePath);
        } catch (e) {
          console.warn(`[/api/library/resolve-ownership] Failed to scan jar: ${filePath}`);
        }

        scannedItems.push({
          path: filePath,
          fileName: file,
          category,
          sub,
          meta,
        });
      }
    }
  }

  // 2. Build dependency graph map
  const nodes = new Map<string, DependencyNode>();
  const uniqueNodes = new Set<DependencyNode>();

  for (const item of scannedItems) {
    if (item.meta.modId === "unknown") continue;

    const declaredEnv = item.category === ".local" ? "local" : item.category === ".server" ? "server" : "essential";

    const node: DependencyNode = {
      path: item.path,
      modId: item.meta.modId,
      modName: item.meta.modName && item.meta.modName !== "unknown" ? item.meta.modName : path.basename(item.path, ".jar"),
      declaredEnv,
      dependencies: item.meta.dependencies || [],
      dependents: [],
    };

    uniqueNodes.add(node);
    nodes.set(node.modId.toLowerCase(), node);

    // Register provided aliases so dependent resolution can match them correctly
    if (item.meta.providedIds) {
      for (const provId of item.meta.providedIds) {
        nodes.set(provId.toLowerCase(), node);
      }
    }
  }

  // 3. Populate dependents links backwards
  for (const node of uniqueNodes) {
    for (const depId of node.dependencies) {
      const targetNode = nodes.get(depId.toLowerCase());
      if (targetNode && targetNode !== node) {
        if (!targetNode.dependents.includes(node.modId)) {
          targetNode.dependents.push(node.modId);
        }
      }
    }
  }

  // 4. Run the ownership propagation engine
  resolveDependencyScopes(nodes);

  // 5. Generate move recommendation actions
  const actions: any[] = [];

  for (const node of uniqueNodes) {
    if (!isLibrary(node)) continue;

    const resolved = node.resolvedScope;
    if (resolved && resolved !== node.declaredEnv) {
      let suggestedCategory = "";
      let reason = "";
      let severity = "info";

      // Build specific human-readable explanation depending on dependents
      const depNames = node.dependents
        .map(depId => nodes.get(depId.toLowerCase())?.modName || depId)
        .filter(Boolean);

      if (resolved === "local") {
        suggestedCategory = ".local\\librerias";
        reason = depNames.length > 0
          ? `Solo la requieren mods locales activos en tu perfil: ${depNames.join(", ")}.`
          : "No tiene ningún mod dependiente activo; se recomienda aislarla en cliente.";
        severity = "info";
      } else if (resolved === "server") {
        suggestedCategory = ".server\\librerias";
        reason = depNames.length > 0
          ? `Solo la requieren mods de servidor activos en tu perfil: ${depNames.join(", ")}.`
          : "No tiene ningún mod dependiente activo; se recomienda aislarla en servidor.";
        severity = "info";
      } else if (resolved === "essential") {
        suggestedCategory = ".essential\\librerias";
        reason = `Es requerida por una mezcla de entornos o por mods compartidos activos: ${depNames.join(", ")}.`;
        severity = "warning"; // Higher priority to fix broken shared isolation
      }

      actions.push({
        modId: node.modId,
        modName: node.modName,
        currentPath: node.path,
        suggestedCategory,
        reason,
        severity,
      });
    }
  }

  return NextResponse.json({ success: true, actions });
}
