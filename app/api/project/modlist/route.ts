import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getSettings } from "@/lib/core/settings";
import { collectJars } from "@/lib/modding/builder";
import { withApiGuard } from "@/lib/apiGuard";

export const GET = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const version = searchParams.get("version");
  const loader = searchParams.get("loader") || "forge";

  if (!project || !version) {
    return NextResponse.json({ error: "Faltan parámetros: project y version" }, { status: 400 });
  }

  const globalSettings = getSettings();
  const projectName = project;
  
  const projectModsPath = path.join(globalSettings.sourceBase, "_projects", projectName, "mods");
  const loaderPath = fs.existsSync(projectModsPath)
    ? projectModsPath
    : path.join(globalSettings.sourceBase, version, loader);

  if (!fs.existsSync(loaderPath)) {
    return NextResponse.json({ error: "No se encontró la carpeta de mods" }, { status: 404 });
  }

  // Collect mods
  const userJars = collectJars(loaderPath, [".essential", ".local"]);
  const hostJars = collectJars(loaderPath, [".essential", ".server"]);

  // Group by category (parent directory)
  const groupByCategory = (jars: Map<string, string>) => {
    const groups = new Map<string, string[]>();
    for (const [file, srcPath] of jars) {
      const parentDir = path.basename(path.dirname(srcPath));
      if (!groups.has(parentDir)) groups.set(parentDir, []);
      groups.get(parentDir)!.push(file);
    }
    return groups;
  };

  const userGroups = groupByCategory(userJars);
  const hostGroups = groupByCategory(hostJars);

  // Generate HTML for groups
  const generateGroupsHtml = (groups: Map<string, string[]>, prefix: string) => {
    let html = "";
    groups.forEach((files, category) => {
      const id = `section-${prefix}-${category.replace(/\s+/g, "-")}`;
      html += `
        <div class="category-card">
            <div class="category-header" onclick="toggleId('${id}')">
                <span class="cat-icon">📦</span>
                <span>${category}</span>
                <span class="badge-sm">${files.length}</span>
            </div>
            <div class="category-body collapsed" id="${id}">
                ${files.map(f => `<div class="mod-item" title="${f}">${f.replace(".jar", "")}</div>`).join("")}
            </div>
        </div>
      `;
    });
    return html;
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modlist - ${projectName}</title>
    <link href="https://fonts.googleapis.com/css2?family=VT323&family=Outfit:wght@300;400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #1a0f05;
            --panel: #2a150a;
            --card: #3a2010;
            --accent: #d4a574;
            --accent-dark: #8B4513;
            --text: #e8dcc8;
            --muted: #a89f91;
            --border: #5c3d1a;
            --highlight: #ffdd00;
            --glass: rgba(0, 0, 0, 0.3);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background-color: var(--bg);
            color: var(--text);
            font-family: 'Outfit', sans-serif;
            padding: 2rem;
            scroll-behavior: smooth;
        }
        ::-webkit-scrollbar { width: 12px; }
        ::-webkit-scrollbar-track { background: var(--panel); border-left: 2px solid var(--border); }
        ::-webkit-scrollbar-thumb { background: var(--accent-dark); border: 2px solid var(--panel); }

        .header { text-align: center; margin-bottom: 3rem; position: relative; }
        .header h1 { font-family: 'VT323', monospace; font-size: 5rem; color: var(--highlight); text-shadow: 4px 4px 0px #000; letter-spacing: -2px; margin-bottom: 0.5rem; text-transform: uppercase; }
        .header p { color: var(--muted); font-size: 1.4rem; font-family: 'VT323', monospace; text-transform: uppercase; letter-spacing: 2px; }

        .stats-bar { display: flex; justify-content: center; gap: 1.5rem; margin-top: 1.5rem; flex-wrap: wrap; }
        .stat-pill { background: var(--panel); border: 4px solid var(--border); padding: 0.6rem 1.5rem; font-family: 'VT323', monospace; font-size: 1.2rem; display: flex; align-items: center; gap: 10px; box-shadow: 4px 4px 0px #000; transition: 0.2s; }
        .stat-pill b { color: var(--highlight); font-size: 1.5rem; }

        .grid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 1400px; margin: 0 auto; }
        .column-section { background: var(--glass); border: 4px solid var(--border); padding: 1.5rem; height: fit-content; box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); }
        .section-title { font-family: 'VT323', monospace; font-size: 2rem; text-transform: uppercase; color: var(--accent); margin-bottom: 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; text-shadow: 2px 2px 0px #000; }
        .badge-count { background: var(--accent-dark); color: #fff; padding: 2px 12px; font-size: 1.1rem; font-family: 'VT323', monospace; border: 2px solid #000; box-shadow: 2px 2px 0px #000; }

        .category-card { background: var(--card); border: 2px solid var(--border); margin-bottom: 0.8rem; overflow: hidden; transition: 0.2s; }
        .category-header { padding: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 10px; font-family: 'VT323', monospace; font-size: 1.4rem; }
        .category-header:hover { background: rgba(255, 255, 255, 0.05); color: var(--highlight); }
        .category-body { padding: 0.6rem; border-top: 2px solid var(--border); display: flex; flex-direction: column; gap: 4px; background: rgba(0, 0, 0, 0.2); }
        .category-body.collapsed { display: none; }
        .mod-item { padding: 0.4rem 0.6rem; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.85rem; color: var(--muted); border-left: 3px solid transparent; transition: 0.2s; font-family: 'JetBrains Mono', monospace; }
        .mod-item:hover { color: #fff; background: var(--panel); border-left-color: var(--accent); transform: translateX(5px); }
        .badge-sm { background: rgba(0,0,0,0.4); color: var(--accent); padding: 1px 6px; font-size: 0.9rem; border-radius: 4px; margin-left: auto; }

        @media (max-width: 900px) { .grid-layout { grid-template-columns: 1fr; } }
    </style>
    <script>
        function toggleId(id) { document.getElementById(id).classList.toggle('collapsed'); }
    </script>
</head>
<body>
    <div class="header">
        <h1>Modlist — ${projectName}</h1>
        <p>Generado automáticamente por MIM</p>
        <div class="stats-bar">
            <div class="stat-pill"><b>${userJars.size}</b> Client Mods</div>
            <div class="stat-pill"><b>${hostJars.size}</b> Server Mods</div>
        </div>
    </div>

    <div class="grid-layout">
        <div class="column-section">
            <h2 class="section-title">💻 Client-Side <span class="badge-count">${userJars.size}</span></h2>
            ${generateGroupsHtml(userGroups, "user")}
        </div>
        <div class="column-section">
            <h2 class="section-title">☁️ Server-Side <span class="badge-count">${hostJars.size}</span></h2>
            ${generateGroupsHtml(hostGroups, "host")}
        </div>
    </div>
</body>
</html>
  `;

  // Save to project directory
  const projectPath = path.join(globalSettings.sourceBase, "_projects", projectName);
  let savedPath = "";
  if (fs.existsSync(projectPath)) {
    savedPath = path.join(projectPath, "modlist.html");
    fs.writeFileSync(savedPath, htmlContent, "utf-8");
  }

  return NextResponse.json({ 
    success: true, 
    html: htmlContent,
    savedPath: savedPath || "No se pudo guardar (proyecto no encontrado en disco)"
  });

  }
);
