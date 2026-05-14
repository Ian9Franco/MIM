/**
 * /api/tweak — GET / POST
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { getSettings } from "@/lib/settings";
import { Keybind, SnapshotMetadata } from "./lib/types";
import { 
  formatKeyName, parseCategoryFromId, extractModSource, detectKeybindConflicts, groupKeybindsForUI 
} from "./lib/KeybindManager";
import { analyzePackOrder, autoFixPackOrder } from "./lib/PackIntelligence";
import { calculateModpackHash, getModCount } from "./lib/SnapshotSystem";
import { getRecommendations } from "./lib/RecommendationEngine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get("projectName");
    const version = searchParams.get("version") || "1.20.1";
    const ramParam = searchParams.get("ram");
    const gpuParam = searchParams.get("gpu") || "dedicated";
    const loader = searchParams.get("loader") || "forge";

    if (!projectName) return NextResponse.json({ error: "Missing projectName" }, { status: 400 });

    const { sourceBase, minecraftPath } = getSettings();
    const projectDir = path.join(sourceBase, "_projects", projectName);
    const optionsPath = path.join(projectDir, "options.txt");

    // Installed mods detection
    const installedMods = new Set<string>();
    const modsDir = path.join(projectDir, "mods");
    if (fs.existsSync(modsDir)) {
      const subs = fs.readdirSync(modsDir);
      for (const sub of subs) {
        const subPath = path.join(modsDir, sub);
        if (fs.statSync(subPath).isDirectory()) {
          fs.readdirSync(subPath).forEach(f => installedMods.add(f.replace(/-[\d\.]+.*\.jar$/, "").toLowerCase()));
        } else if (sub.endsWith(".jar")) {
          installedMods.add(sub.replace(/-[\d\.]+.*\.jar$/, "").toLowerCase());
        }
      }
    }

    const resData: any = { optionsExists: false, keybinds: [], resourcePacks: { active: [], available: [] }, snapshots: [], recommendations: [] };

    if (fs.existsSync(optionsPath)) {
      resData.optionsExists = true;
      const lines = fs.readFileSync(optionsPath, "utf-8").split(/\r?\n/);
      const kbs: Keybind[] = [];
      let activePacks: string[] = [];

      for (const line of lines) {
        const [k, v] = line.trim().split(":");
        if (!k || !v) continue;
        if (k.startsWith("key_")) {
          kbs.push({ id: k, name: k.replace("key_", ""), key: v, category: parseCategoryFromId(k), modSource: extractModSource(k) });
        } else if (k === "resourcePacks") {
          try { activePacks = JSON.parse(v); } catch {}
        }
      }

      resData.keybinds = kbs;
      resData.keybindConflicts = detectKeybindConflicts(kbs);
      resData.keybindsGrouped = groupKeybindsForUI(kbs);
      const packAnalysis = analyzePackOrder(activePacks);
      resData.resourcePacks = { active: activePacks, ...packAnalysis };
    }

    // Hardware & Recommendations
    const totalRamGB = Math.round(os.totalmem() / 1073741824);
    const hardware = { totalRamGB, cpuCores: os.cpus().length, hardwareProfile: totalRamGB > 8 ? "high" : "low" };
    resData.recommendations = getRecommendations(loader, version, installedMods, hardware, getModCount(projectDir), ramParam ? parseInt(ramParam) : 8);
    
    // Snapshots
    if (fs.existsSync(projectDir)) {
      resData.snapshots = fs.readdirSync(projectDir)
        .filter(f => f.startsWith("mim_snapshot_") && f.endsWith(".json"))
        .map(f => JSON.parse(fs.readFileSync(path.join(projectDir, f), "utf-8")));
    }

    return NextResponse.json(resData);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectName } = body;
    const { sourceBase } = getSettings();
    const projectDir = path.join(sourceBase, "_projects", projectName);

    if (action === "create-snapshot") {
      const id = `snap-${Date.now()}`;
      const meta: SnapshotMetadata = { id, timestamp: new Date().toISOString(), profileName: body.profileName || "Manual", minecraftVersion: body.version, loader: body.loader, modpackHash: calculateModpackHash(projectDir), modsInstalled: getModCount(projectDir), keybindCount: 0, resourcePackStack: [] };
      fs.writeFileSync(path.join(projectDir, `mim_snapshot_${id}.json`), JSON.stringify(meta, null, 2));
      return NextResponse.json({ success: true, id });
    }

    if (action === "autofix-packs") {
      const optionsPath = path.join(projectDir, "options.txt");
      const content = fs.readFileSync(optionsPath, "utf-8").split(/\r?\n/);
      const newContent = content.map(line => {
        if (line.startsWith("resourcePacks:")) {
          try {
            const current = JSON.parse(line.split(":")[1]);
            return `resourcePacks:${JSON.stringify(autoFixPackOrder(current))}`;
          } catch { return line; }
        }
        return line;
      });
      fs.writeFileSync(optionsPath, newContent.join("\n"));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
