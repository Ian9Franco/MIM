/**
 * /api/tweak — GET / POST
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { getSettings } from "@/lib/core/settings";
import { mimMsg } from "@/lib/core/voice";
import { Keybind, SnapshotMetadata } from "./lib/types";
import { 
  formatKeyName, parseCategoryFromId, extractModSource, detectKeybindConflicts, groupKeybindsForUI 
} from "./lib/KeybindManager";
import { analyzePackOrder, autoFixPackOrder } from "./lib/PackIntelligence";
import { analyzeKeybindIntelligence } from "./lib/KeybindIntelligence";
import { calculateModpackHash, getModCount } from "./lib/SnapshotSystem";
import { getRecommendations } from "./lib/RecommendationEngine";
import { readProjectConfig, saveProjectConfig } from "@/lib/modding/projectSubcategories";
import { withApiGuard } from "@/lib/apiGuard";

export const GET = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  try {
    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get("projectName");
    const version = searchParams.get("version") || "1.20.1";
    const ramParam = searchParams.get("ram");
    const gpuParam = searchParams.get("gpu") || "dedicated";
    const loader = searchParams.get("loader") || "forge";

    // projectName is now optional for standalone Tweak mode

    const { sourceBase, minecraftPath } = getSettings();
    const projectDir = projectName ? path.join(sourceBase, "_projects", projectName) : null;

    // Tweak is now INDEPENDENT of the project. It always operates on the global minecraftPath.
    const realMinecraftPath = minecraftPath;
    const optionsPath = path.join(realMinecraftPath, "options.txt");
    const resourcePacksDir = path.join(realMinecraftPath, "resourcepacks");
 
    // Installed mods detection (Scan ONLY global minecraftPath)
    const installedMods = new Set<string>();
    const modsDir = path.join(minecraftPath, "mods");
    
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

    const resData: any = { optionsExists: false, keybinds: [], resourcePacks: { active: [], available: [] }, snapshots: [], recommendations: [], minecraftPathUsed: realMinecraftPath, settings: {} };

    if (fs.existsSync(optionsPath)) {
      resData.optionsExists = true;
      const stats = fs.statSync(optionsPath);
      resData.lastModified = stats.mtime.toISOString();
      const lines = fs.readFileSync(optionsPath, "utf-8").split(/\r?\n/);
      const kbs: Keybind[] = [];
      let activePacks: string[] = [];
      const settingsMap: Record<string, string> = {};

      // Settings keys we want to surface to the UI
      const TRACKED_SETTINGS = new Set([
        "renderDistance", "fov", "gamma", "enableVsync", "entityShadows",
        "mipmapLevels", "guiScale", "particles", "fullscreen", "lang",
        "soundCategory_master", "maxFps", "graphicsMode",
      ]);

      for (const line of lines) {
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) continue;
        const k = line.slice(0, colonIdx).trim();
        const v = line.slice(colonIdx + 1).trim();
        if (!k) continue;
        if (k.startsWith("key_")) {
          kbs.push({ id: k, name: k.replace("key_", ""), key: v, category: parseCategoryFromId(k), modSource: extractModSource(k) });
        } else if (k === "resourcePacks") {
          try { 
            activePacks = JSON.parse(v); 
          } catch (err) { 
            console.warn("[/api/tweak] Malformed resourcePacks in options.txt:", err); 
          }
        } else if (TRACKED_SETTINGS.has(k)) {
          settingsMap[k] = v;
        }
      }

      resData.keybinds = kbs;
      const conflicts = detectKeybindConflicts(kbs);
      resData.keybindConflicts = conflicts;
      resData.keybindSuggestions = analyzeKeybindIntelligence(conflicts);
      resData.keybindsGrouped = groupKeybindsForUI(kbs);
      resData.settings = settingsMap;
      
      // Scan for available resource packs
      const availablePacksSet = new Set<string>();
      if (fs.existsSync(resourcePacksDir)) {
        try {
          const files = fs.readdirSync(resourcePacksDir);
          for (const file of files) {
            if (file.endsWith(".zip") || fs.statSync(path.join(resourcePacksDir, file)).isDirectory()) {
              availablePacksSet.add(`file/${file}`);
            }
          }
        } catch (e) { console.error("Error scanning resourcepacks:", e); }
      }
      
      const availablePacks = Array.from(availablePacksSet);
      const packAnalysis = analyzePackOrder(activePacks, installedMods);
      resData.resourcePacks = { 
        active: activePacks, 
        available: availablePacks.filter(p => !activePacks.includes(p)),
        ...packAnalysis 
      };
    }

    // Detect installations from official launcher (Scanning versions folder)
    const versionsDir = path.join(os.homedir(), "AppData", "Roaming", ".minecraft", "versions");
    const launcherProfilesPath = path.join(os.homedir(), "AppData", "Roaming", ".minecraft", "launcher_profiles.json");
    const installations: any[] = [];
    
    let profilesMap: Record<string, any> = {};
    if (fs.existsSync(launcherProfilesPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(launcherProfilesPath, "utf-8"));
        profilesMap = data.profiles || {};
      } catch (err) {
        console.warn("[/api/tweak] Could not read launcher_profiles.json:", err);
      }
    }

    if (fs.existsSync(versionsDir)) {
      try {
        const folders = fs.readdirSync(versionsDir);
        const grouped: Record<string, string[]> = {};
        
        for (const folder of folders) {
          const stats = fs.statSync(path.join(versionsDir, folder));
          if (!stats.isDirectory()) continue;
          
          const match = folder.match(/^(\d+\.\d+(?:\.\d+)?)/);
          const baseVersion = match ? match[1] : folder;
          
          if (!grouped[baseVersion]) grouped[baseVersion] = [];
          grouped[baseVersion].push(folder);
        }
        
        for (const [baseVersion, variants] of Object.entries(grouped)) {
          const modded = variants.filter(v => 
            v.toLowerCase().includes("forge") || 
            v.toLowerCase().includes("fabric") || 
            v.toLowerCase().includes("quilt") || 
            v.toLowerCase().includes("neoforge")
          );
          
          // If there are modded variants, we hide the clean base version
          const selectedVariants = modded.length > 0 ? modded : variants;
          
          for (const variant of selectedVariants) {
            let jvmArgs: string | null = null;
            let profileName = variant;
            
            // Try to match with a profile to get its custom name and JVM args
            for (const profile of Object.values(profilesMap)) {
              if (profile.lastVersionId === variant) {
                jvmArgs = profile.javaArgs || null;
                profileName = profile.name || variant;
                break;
              }
            }
            
            installations.push({
              id: variant,
              name: profileName,
              lastVersionId: variant,
              jvmArgs: jvmArgs
            });
          }
        }
      } catch (e) {
        console.error("Error reading versions:", e);
      }
    }
    resData.installations = installations;

    // Hardware & Recommendations
    const totalRamGB = Math.round(os.totalmem() / 1073741824);
    const cpuCores = os.cpus().length;
    
    let detectedGpu = "Auto-detected";
    try {
      const gpuInfo = execSync("wmic path win32_VideoController get name", { encoding: "utf-8" });
      const lines = gpuInfo.split("\n").map((l: string) => l.trim()).filter((l: string) => l && l !== "Name");
      if (lines.length > 0) {
        detectedGpu = lines[0];
      }
    } catch (e) {
      console.error("Failed to detect GPU:", e);
    }

    const hardware = { 
      totalRamGB, cpuCores, gpu: detectedGpu,
      hardwareProfile: totalRamGB >= 16 ? "high" : totalRamGB >= 8 ? "mid" : "low"
    };
    
    // Count mods in the REAL .minecraft/mods folder
    const globalModsDir = path.join(minecraftPath, "mods");
    let globalModCount = 0;
    if (fs.existsSync(globalModsDir)) {
      globalModCount = fs.readdirSync(globalModsDir).filter(f => f.endsWith(".jar")).length;
    }
    
    // JVM Args recommendation based on real hardware + real mod count
    const recommendedRamGB = Math.min(
      Math.floor(totalRamGB * 0.6),  // 60% of total RAM
      totalRamGB >= 32 ? 12 : totalRamGB >= 16 ? 8 : totalRamGB >= 8 ? 6 : 4
    );
    const gcThreads = Math.max(2, Math.min(Math.floor(cpuCores / 2), 8));
    const heavyMods = globalModCount > 200;
    
    const jvmArgs = [
      `-Xmx${recommendedRamGB}G`,
      `-Xms${Math.max(2, Math.floor(recommendedRamGB / 2))}G`,
      `-XX:+UseG1GC`,
      `-XX:+ParallelRefProcEnabled`,
      `-XX:MaxGCPauseMillis=200`,
      `-XX:+UnlockExperimentalVMOptions`,
      `-XX:+DisableExplicitGC`,
      `-XX:G1NewSizePercent=${heavyMods ? 30 : 40}`,
      `-XX:G1MaxNewSizePercent=${heavyMods ? 50 : 60}`,
      `-XX:G1HeapRegionSize=16M`,
      `-XX:G1ReservePercent=15`,
      `-XX:G1HeapWastePercent=5`,
      `-XX:G1MixedGCCountTarget=4`,
      `-XX:InitiatingHeapOccupancyPercent=20`,
      `-XX:G1MixedGCLiveThresholdPercent=90`,
      `-XX:G1RSetUpdatingPauseTimePercent=5`,
      `-XX:SurvivorRatio=32`,
      `-XX:MaxTenuringThreshold=1`,
      `-XX:ParallelGCThreads=${gcThreads}`,
    ].join(" ");
    
    resData.totalRamGB = totalRamGB;
    resData.cpuCores = cpuCores;
    resData.hardwareProfile = hardware.hardwareProfile;
    resData.jvmArgs = jvmArgs;
    resData.gpu = hardware.gpu;
    resData.globalModCount = globalModCount;
    resData.modCount = globalModCount; // alias used by OverviewTab
    resData.recommendations = getRecommendations(loader, version, installedMods, hardware, globalModCount, ramParam ? parseInt(ramParam) : 4);
    
    // Snapshots — read from global .mim-index/tweak/snapshots
    const globalSnapshotDir = path.join(sourceBase, ".mim-index", "tweak", "snapshots");
    if (fs.existsSync(globalSnapshotDir)) {
      resData.snapshots = fs.readdirSync(globalSnapshotDir)
          .filter(f => f.endsWith(".json"))
          .map(f => {
            try { return JSON.parse(fs.readFileSync(path.join(globalSnapshotDir, f), "utf-8")); }
            catch { return null; }
          })
          .filter(Boolean)
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // Load Draft (Always global now)
    const globalDraftPath = path.join(sourceBase, ".mim-index", "tweak_global_draft.json");
    if (fs.existsSync(globalDraftPath)) {
      try { 
        resData.draft = JSON.parse(fs.readFileSync(globalDraftPath, "utf-8")); 
      } catch (err) {
        console.warn("[/api/tweak] Failed to parse global tweak draft:", err);
      }
    }

    return NextResponse.json(resData);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  }
);

export const POST = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  try {
    const body = await req.json();
    const { action, projectName, keybinds, resourcePacks, settings, activePacks } = body;
    const { sourceBase, minecraftPath } = getSettings();
    
    if (action === "analyze-packs") {
      const installedMods = new Set<string>();
      const modsDir = path.join(minecraftPath, "mods");
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
      
      const analysis = analyzePackOrder(activePacks, installedMods);
      return NextResponse.json(analysis);
    }
    const projectDir = projectName ? path.join(sourceBase, "_projects", projectName) : null;
    
    // Tweak is now INDEPENDENT of the project.
    const realMinecraftPath = minecraftPath;
    const optionsPath = path.join(realMinecraftPath, "options.txt");
    const resourcePacksDir = path.join(realMinecraftPath, "resourcepacks");
    
    // Internal MIM storage for backups and global data
    const internalTweakDir = path.join(sourceBase, ".mim-index", "tweak");
    if (!fs.existsSync(internalTweakDir)) fs.mkdirSync(internalTweakDir, { recursive: true });

    if (action === "save") {
      const masterBackupPath = path.join(internalTweakDir, "master_options.txt");
      
      // Safety: Backup original to MIM internal storage if it's the first time we touch it
      if (fs.existsSync(optionsPath)) {
        if (!fs.existsSync(masterBackupPath)) {
          fs.copyFileSync(optionsPath, masterBackupPath);
        }
        
        // AUTO-SNAPSHOT (Rescue): Save current state before overwriting
        const rescueDir = path.join(sourceBase, ".mim-index", "tweak", "snapshots");
        if (!fs.existsSync(rescueDir)) fs.mkdirSync(rescueDir, { recursive: true });
        const rescueId = `rescue-${Date.now()}`;
        const currentContent = fs.readFileSync(optionsPath, "utf-8");
        fs.writeFileSync(path.join(rescueDir, `${rescueId}.json`), JSON.stringify({
          id: rescueId,
          timestamp: new Date().toISOString(),
          profileName: `Perfil Guardado ${new Date().toLocaleTimeString()}`,
          rawOptions: currentContent
        }, null, 2));

        // Cleanup old rescue snapshots (Keep only the last 10)
        try {
          const files = fs.readdirSync(rescueDir);
          const rescueFiles = files.filter(f => f.startsWith("rescue-") && f.endsWith(".json"));
          if (rescueFiles.length > 10) {
            rescueFiles.sort((a, b) => {
              const timeA = parseInt(a.replace("rescue-", "").replace(".json", ""));
              const timeB = parseInt(b.replace("rescue-", "").replace(".json", ""));
              return timeA - timeB;
            });
            const toDelete = rescueFiles.slice(0, rescueFiles.length - 10);
            toDelete.forEach(f => fs.unlinkSync(path.join(rescueDir, f)));
          }
        } catch (err) {
          console.error("Failed to cleanup old rescue snapshots:", err);
        }
      }
      
      if (!fs.existsSync(optionsPath)) {
        fs.writeFileSync(optionsPath, ""); // Create if missing
      }
      
      const content = fs.readFileSync(optionsPath, "utf-8").split(/\r?\n/);
      
      if (keybinds) {
        // Use global draft for locked keys if available, otherwise no locks
        const globalDraftPath = path.join(sourceBase, ".mim-index", "tweak_global_draft.json");
        let lockedKeys = new Set<string>();
        if (fs.existsSync(globalDraftPath)) {
          try { 
            const draft = JSON.parse(fs.readFileSync(globalDraftPath, "utf-8"));
            lockedKeys = new Set(draft.lockedKeys || []);
          } catch (err) {
            console.warn("[/api/tweak] Failed to load locked keys from draft:", err);
          }
        }
        
        keybinds.forEach((kb: any) => {
          if (lockedKeys.has(kb.id)) return; // Skip if locked
          
          const index = content.findIndex(line => line.startsWith(`${kb.id}:`));
          if (index !== -1) content[index] = `${kb.id}:${kb.key}`;
          else content.push(`${kb.id}:${kb.key}`);
        });
      }

      // Update Resource Packs — FORCE SAVE WITHOUT FILTERING
      // SAGE allows administrator to arrange packs in ANY order regardless of compatibility.
      // No version checking, pack_format validation, or incompatibility filtering is applied.
      // The exact order specified by the user is written directly to options.txt.
      if (resourcePacks) {
        const index = content.findIndex(line => line.startsWith("resourcePacks:"));
        const packsJson = JSON.stringify(resourcePacks);
        if (index !== -1) content[index] = `resourcePacks:${packsJson}`;
        else content.push(`resourcePacks:${packsJson}`);

        // Hack to force Minecraft to accept "incompatible" packs without deactivating them:
        // We inject the exact same list into incompatibleResourcePacks
        const incompIndex = content.findIndex(line => line.startsWith("incompatibleResourcePacks:"));
        if (incompIndex !== -1) content[incompIndex] = `incompatibleResourcePacks:${packsJson}`;
        else content.push(`incompatibleResourcePacks:${packsJson}`);
      }

      // Update specific settings from recommendations
      if (settings) {
        Object.entries(settings).forEach(([k, v]) => {
          const index = content.findIndex(line => line.startsWith(`${k}:`));
          if (index !== -1) content[index] = `${k}:${v}`;
          else content.push(`${k}:${v}`);
        });
      }

      fs.writeFileSync(optionsPath, content.filter(l => l.trim()).join("\n"));
      
      // Clear draft once saved to game
      const globalDraftPath = path.join(sourceBase, ".mim-index", "tweak_global_draft.json");
      if (fs.existsSync(globalDraftPath)) fs.unlinkSync(globalDraftPath);

      return NextResponse.json({ success: true, message: mimMsg.tweakSaved() });
    }

    if (action === "save-draft") {
      const draft = {
        resourcePacks: body.resourcePacks,
        keybinds: body.keybinds,
        updatedAt: new Date().toISOString()
      };

      const globalDraftPath = path.join(sourceBase, ".mim-index", "tweak_global_draft.json");
      fs.writeFileSync(globalDraftPath, JSON.stringify(draft, null, 2));
      return NextResponse.json({ success: true, message: mimMsg.tweakDraftSaved() });
    }

    if (action === "initialize") {
      // Initialize always points to global minecraftPath now
      fs.writeFileSync(optionsPath, "lang:en_us\nguiScale:0\nresourcePacks:[]\nincompatibleResourcePacks:[]\n");
      return NextResponse.json({ success: true, message: mimMsg.tweakProfileInit() });
    }

    if (action === "restore-backup") {
      const backupPath = `${optionsPath}.mim_bak`;
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, optionsPath);
        return NextResponse.json({ success: true, message: mimMsg.tweakRestored() });
      }
      return NextResponse.json({ error: mimMsg.tweakNoBackup() }, { status: 404 });
    }

    if (action === "sync-resourcepacks") {
      // Scan real .minecraft/resourcepacks and return the full list
      const available: string[] = [];
      if (!fs.existsSync(resourcePacksDir)) {
        fs.mkdirSync(resourcePacksDir, { recursive: true });
      } else {
        for (const file of fs.readdirSync(resourcePacksDir)) {
          const fullPath = path.join(resourcePacksDir, file);
          if (file.endsWith(".zip") || fs.statSync(fullPath).isDirectory()) {
            available.push(`file/${file}`);
          }
        }
      }

      // Also read active packs from options.txt so the UI knows which are on/off
      let activePacks: string[] = [];
      if (fs.existsSync(optionsPath)) {
        for (const line of fs.readFileSync(optionsPath, "utf-8").split(/\r?\n/)) {
          if (line.startsWith("resourcePacks:")) {
            try { 
              activePacks = JSON.parse(line.slice("resourcePacks:".length)); 
            } catch (err) {
              console.warn("[/api/tweak] Malformed active resourcePacks line:", err);
            }
          }
        }
      }
      const packAnalysis = analyzePackOrder(activePacks); // No mods context here
      return NextResponse.json({
        success: true,
        available,
        active: activePacks,
        ...packAnalysis,
        message: `${available.length} packs encontrados en .minecraft/resourcepacks`
      });
    }

    if (action === "create-snapshot") {
      // Read CURRENT options.txt to capture real state
      const currentKeybinds: Array<{id: string; key: string}> = [];
      let currentPacks: string[] = [];
      let currentServers: string = "";

      const serversPath = path.join(realMinecraftPath, "servers.dat");
      if (fs.existsSync(serversPath)) {
        currentServers = fs.readFileSync(serversPath, "base64"); // Store as base64 to handle binary data
      }

      if (fs.existsSync(optionsPath)) {
        for (const line of fs.readFileSync(optionsPath, "utf-8").split(/\r?\n/)) {
          const [k, ...rest] = line.trim().split(":");
          const v = rest.join(":");
          if (!k || !v) continue;
          if (k.startsWith("key_")) currentKeybinds.push({ id: k, key: v });
          if (k === "resourcePacks") {
            try { 
              currentPacks = JSON.parse(v); 
            } catch (err) {
              console.warn("[/api/tweak] Failed to parse resourcePacks during snapshot creation:", err);
            }
          }
        }
      }

      const snapshotId = `snap-${Date.now()}`;
      const snapshotDir = path.join(sourceBase, ".mim-index", "tweak", "snapshots");
      if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });

      const globalModsDir = path.join(minecraftPath, "mods");
      const globalModCount = fs.existsSync(globalModsDir) 
        ? fs.readdirSync(globalModsDir).filter(f => f.endsWith(".jar")).length
        : 0;

      const snapshot = {
        id: snapshotId,
        timestamp: new Date().toISOString(),
        profileName: body.profileName || `Snapshot ${new Date().toLocaleDateString()}`,
        minecraftVersion: body.version,
        loader: body.loader,
        keybinds: currentKeybinds,
        resourcePackStack: currentPacks,
        serversData: currentServers,
        modsInstalled: globalModCount,
        modpackHash: "", // Global hash is not tracked currently
        keybindCount: currentKeybinds.length,
      };

      fs.writeFileSync(
        path.join(snapshotDir, `${snapshotId}.json`),
        JSON.stringify(snapshot, null, 2)
      );
      return NextResponse.json({ success: true, id: snapshotId, snapshot });
    }

    if (action === "apply-snapshot") {
      const { snapshotId } = body;
      const snapshotDir = path.join(sourceBase, ".mim-index", "tweak", "snapshots");
      const snapshotFile = path.join(snapshotDir, `${snapshotId}.json`);

      if (!fs.existsSync(snapshotFile)) {
        return NextResponse.json({ error: mimMsg.tweakSnapshotNotFound() }, { status: 404 });
      }

      const snap = JSON.parse(fs.readFileSync(snapshotFile, "utf-8"));

      // Backup original options.txt before first modification
      const backupPath = `${optionsPath}.mim_bak`;
      if (fs.existsSync(optionsPath) && !fs.existsSync(backupPath)) {
        fs.copyFileSync(optionsPath, backupPath);
      }

      // Build merged options.txt: read existing → apply snapshot keybinds + packs
      const lines: string[] = fs.existsSync(optionsPath)
        ? fs.readFileSync(optionsPath, "utf-8").split(/\r?\n/).filter(l => l.trim())
        : ["lang:en_us", "guiScale:0"];

      // Apply keybinds from snapshot
      for (const kb of (snap.keybinds || [])) {
        const idx = lines.findIndex(l => l.startsWith(`${kb.id}:`));
        if (idx !== -1) lines[idx] = `${kb.id}:${kb.key}`;
        else lines.push(`${kb.id}:${kb.key}`);
      }

      // Apply resource pack order from snapshot
      if (snap.resourcePackStack?.length) {
        const rpIdx = lines.findIndex(l => l.startsWith("resourcePacks:"));
        const packsLine = `resourcePacks:${JSON.stringify(snap.resourcePackStack)}`;
        if (rpIdx !== -1) lines[rpIdx] = packsLine;
        else lines.push(packsLine);
        
        const incompIdx = lines.findIndex(l => l.startsWith("incompatibleResourcePacks:"));
        const incompLine = `incompatibleResourcePacks:${JSON.stringify(snap.resourcePackStack)}`;
        if (incompIdx !== -1) lines[incompIdx] = incompLine;
        else lines.push(incompLine);
      }

      // Apply servers.dat if present in snapshot
      if (snap.serversData) {
        const serversPath = path.join(realMinecraftPath, "servers.dat");
        fs.writeFileSync(serversPath, Buffer.from(snap.serversData, "base64"));
      }

      fs.writeFileSync(optionsPath, lines.join("\n") + "\n");
      return NextResponse.json({ success: true, message: mimMsg.tweakSnapshotApplied(snap.profileName) });
    }

    if (action === "restore-backup") {
      const backupPath = `${optionsPath}.mim_bak`;
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, optionsPath);
        return NextResponse.json({ success: true, message: mimMsg.tweakRestored() });
      }
      return NextResponse.json({ error: mimMsg.tweakNoBackup() }, { status: 404 });
    }

    if (action === "autofix-packs") {
      const content = fs.existsSync(optionsPath)
        ? fs.readFileSync(optionsPath, "utf-8").split(/\r?\n/)
        : [];
      const newContent = content.map(line => {
        if (line.startsWith("resourcePacks:")) {
          try {
            const current = JSON.parse(line.slice("resourcePacks:".length));
            return `resourcePacks:${JSON.stringify(autoFixPackOrder(current))}`;
          } catch { return line; }
        }
        if (line.startsWith("incompatibleResourcePacks:")) {
          try {
            const current = JSON.parse(line.slice("incompatibleResourcePacks:".length));
            return `incompatibleResourcePacks:${JSON.stringify(autoFixPackOrder(current))}`;
          } catch { return line; }
        }
        return line;
      });
      fs.writeFileSync(optionsPath, newContent.filter(l => l.trim()).join("\n"));
      return NextResponse.json({ success: true, message: mimMsg.tweakOrderFixed() });
    }

    return NextResponse.json({ error: mimMsg.tweakUnknownAction() }, { status: 400 });
  } catch (e) {
    console.error("[/api/tweak] Unhandled error:", e);
    return NextResponse.json({ error: mimMsg.internalError("/api/tweak") }, { status: 500 });
  }

  }
);


