/**
 * SAGE Benchmark Corpus Generator
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates an annotated evaluation dataset of 120+ real-world representative
 * Minecraft crash reports across Fabric, Forge, NeoForge, and Vanilla environments.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require("fs");
const path = require("path");

const CATEGORIES = [
  "MISSING_DEPENDENCY",
  "VERSION_CONFLICT",
  "MIXIN_FAILURE",
  "JAVA_INCOMPATIBILITY",
  "MOD_CONFLICT",
  "CORRUPTED_WORLD",
  "OUT_OF_MEMORY",
  "UNKNOWN_RUNTIME"
];

const samples = [];
let idCounter = 1;

function addSample(category, loader, mcVer, expectedCulprit, rawLog) {
  samples.push({
    id: `CASE-${String(idCounter++).padStart(3, "0")}`,
    category,
    loader,
    minecraftVersion: mcVer,
    expectedCulprit: expectedCulprit ? expectedCulprit.toLowerCase() : undefined,
    rawLog
  });
}

// ── 1. MISSING_DEPENDENCY (20 samples) ─────────────────────────────────────────
const missingDepMods = [
  { mod: "create", dep: "flywheel", l: "fabric", v: "1.20.1" },
  { mod: "sodium", dep: "fabric-api", l: "fabric", v: "1.20.1" },
  { mod: "iris", dep: "sodium", l: "fabric", v: "1.20.1" },
  { mod: "cloth-config", dep: "fabric-api", l: "fabric", v: "1.19.2" },
  { mod: "modmenu", dep: "fabric-api", l: "fabric", v: "1.20.1" },
  { mod: "applied-energistics-2", dep: "cloth-config", l: "forge", v: "1.20.1" },
  { mod: "mekanism", dep: "mekanismgenerators", l: "forge", v: "1.20.1" },
  { mod: "botania", dep: "curios", l: "forge", v: "1.20.1" },
  { mod: "xaeros-minimap", dep: "fabric-api", l: "fabric", v: "1.20.2" },
  { mod: "jei", dep: "fabric-api", l: "fabric", v: "1.20.1" },
  { mod: "architectury-api", dep: "fabricloader", l: "fabric", v: "1.20.1" },
  { mod: "litematica", dep: "malilib", l: "fabric", v: "1.20.1" },
  { mod: "tweakeroo", dep: "malilib", l: "fabric", v: "1.20.1" },
  { mod: "itemscroller", dep: "malilib", l: "fabric", v: "1.20.1" },
  { mod: "techreborn", dep: "reborncore", l: "fabric", v: "1.20.1" },
  { mod: "immersive-engineering", dep: "forge", l: "forge", v: "1.18.2" },
  { mod: "refined-storage", dep: "cloth-config", l: "neoforge", v: "1.20.4" },
  { mod: "waystones", dep: "balm", l: "forge", v: "1.20.1" },
  { mod: "journeymap", dep: "fabric-api", l: "fabric", v: "1.20.1" },
  { mod: "appleskin", dep: "fabric-api", l: "fabric", v: "1.20.1" }
];

for (const d of missingDepMods) {
  if (d.l === "fabric") {
    addSample(
      "MISSING_DEPENDENCY",
      d.l,
      d.v,
      d.dep,
      `[main/FATAL] [FabricLoader/]: A critical error occurred\nnet.fabricmc.loader.impl.FormattedException: Some of your mods are incompatible with the game or each other!\nA potential solution has been determined, this may resolve your issue:\n\t - Install ${d.dep}, any version.\nMore details:\n\t - Mod '${d.mod}' requires any version of ${d.dep}, which is missing!\nMinecraft Version: ${d.v}\nFabric Loader: 0.15.11`
    );
  } else {
    addSample(
      "MISSING_DEPENDENCY",
      d.l,
      d.v,
      d.dep,
      `[main/FATAL] [neoforge/]: Missing or unsupported mandatory dependencies:\n\tMod ID: '${d.dep}', Requested by: '${d.mod}', Expected range: '[1.0,)', Actual: 'null'\nMinecraft Version: ${d.v}\nForge: 47.2.0`
    );
  }
}

// ── 2. VERSION_CONFLICT (15 samples) ──────────────────────────────────────────
const versionConflicts = [
  { mod: "sodium", required: "0.5.8", current: "0.5.3", l: "fabric", v: "1.20.1" },
  { mod: "fabric-api", required: "0.92.0", current: "0.85.0", l: "fabric", v: "1.20.1" },
  { mod: "cloth-config", required: "11.0.0", current: "10.0.0", l: "fabric", v: "1.20.1" },
  { mod: "iris", required: "1.6.4", current: "1.6.0", l: "fabric", v: "1.20.1" },
  { mod: "curios", required: "5.8.0", current: "5.4.0", l: "forge", v: "1.20.1" },
  { mod: "geckolib", required: "4.4.2", current: "4.2.0", l: "forge", v: "1.20.1" },
  { mod: "architectury", required: "9.2.14", current: "9.1.0", l: "fabric", v: "1.20.1" },
  { mod: "patchouli", required: "1.20.1-84", current: "1.20.1-70", l: "forge", v: "1.20.1" },
  { mod: "citadel", required: "2.5.4", current: "2.4.0", l: "forge", v: "1.20.1" },
  { mod: "malilib", required: "0.16.0", current: "0.15.0", l: "fabric", v: "1.20.1" },
  { mod: "balm", required: "7.2.0", current: "7.0.0", l: "forge", v: "1.20.1" },
  { mod: "puzzleslib", required: "8.1.0", current: "8.0.0", l: "forge", v: "1.20.1" },
  { mod: "bookshelf", required: "20.1.8", current: "20.0.0", l: "forge", v: "1.20.1" },
  { mod: "konkrete", required: "1.8.0", current: "1.6.0", l: "forge", v: "1.20.1" },
  { mod: "camerautils", required: "1.20.1-1.0.8", current: "1.20.1-1.0.0", l: "fabric", v: "1.20.1" }
];

for (const c of versionConflicts) {
  addSample(
    "VERSION_CONFLICT",
    c.l,
    c.v,
    c.mod,
    `[main/ERROR] [FabricLoader/]: Incompatible mod versions detected!\nMod requires version ${c.required} of ${c.mod}, but currently ${c.current} is installed.\nMinecraft Version: ${c.v}\nLoader: ${c.l}`
  );
}

// ── 3. MIXIN_FAILURE (20 samples) ─────────────────────────────────────────────
const mixinMods = [
  "sodium", "iris", "create", "botania", "starlight", "lithium", "ferritecore",
  "entityculling", "immediatelyfast", "indium", "embeddium", "oculus",
  "modernfix", "rubidium", "krypton", "canary", "radium", "connectivity",
  "dashloader", "cullleaves"
];

for (const mod of mixinMods) {
  addSample(
    "MIXIN_FAILURE",
    "fabric",
    "1.20.1",
    mod,
    `[main/CRITICAL] [MixinTransformer/]: org.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError: An unexpected critical error was encountered\n\tat org.spongepowered.asm.mixin.transformer.MixinProcessor.applyMixins(MixinProcessor.java:392)\n\tat org.spongepowered.asm.mixin.transformer.MixinTransformer.transformClass(MixinTransformer.java:250)\nCaused by: org.spongepowered.asm.mixin.injection.throwables.InjectionError: Critical injection failure: Callback method handler$zfa000$render in ${mod}.mixins.json:RenderMixin failed injection check\nMinecraft Version: 1.20.1\nFabric Loader: 0.15.11`
  );
}

// ── 4. JAVA_INCOMPATIBILITY (15 samples) ──────────────────────────────────────
const javaIncompats = [
  { classVer: "65.0", javaReq: "21", active: "17.0.8", mc: "1.20.4" },
  { classVer: "65.0", javaReq: "21", active: "17.0.10", mc: "1.20.6" },
  { classVer: "61.0", javaReq: "17", active: "11.0.12", mc: "1.18.2" },
  { classVer: "61.0", javaReq: "17", active: "1.8.0_351", mc: "1.18.1" },
  { classVer: "65.0", javaReq: "21", active: "17.0.2", mc: "1.21" },
  { classVer: "61.0", javaReq: "17", active: "1.8.0_292", mc: "1.19" },
  { classVer: "65.0", javaReq: "21", active: "11.0.2", mc: "1.20.4" },
  { classVer: "61.0", javaReq: "17", active: "1.8.0_202", mc: "1.19.2" },
  { classVer: "65.0", javaReq: "21", active: "17.0.5", mc: "1.20.5" },
  { classVer: "61.0", javaReq: "17", active: "11.0.18", mc: "1.18" },
  { classVer: "65.0", javaReq: "21", active: "17.0.1", mc: "1.21" },
  { classVer: "61.0", javaReq: "17", active: "1.8.0_181", mc: "1.17.1" },
  { classVer: "65.0", javaReq: "21", active: "17.0.9", mc: "1.20.6" },
  { classVer: "61.0", javaReq: "17", active: "11.0.15", mc: "1.19.4" },
  { classVer: "65.0", javaReq: "21", active: "17.0.6", mc: "1.20.4" }
];

for (const j of javaIncompats) {
  addSample(
    "JAVA_INCOMPATIBILITY",
    "fabric",
    j.mc,
    undefined,
    `[main/ERROR] [Main/]: java.lang.UnsupportedClassVersionError: net/minecraft/bundler/Main has been compiled by a more recent version of the Java Runtime (class file version ${j.classVer}), this version of the Java Runtime only recognizes class file versions up to 61.0\nJava Version: ${j.active}\nMinecraft Version: ${j.mc}`
  );
}

// ── 5. MOD_CONFLICT (15 samples) ──────────────────────────────────────────────
const duplicateMods = [
  "rubidium", "sodium", "embeddium", "oculus", "iris", "jei", "rei",
  "optifine", "create", "botania", "curios", "architectury", "cloth-config",
  "appleskin", "journeymap"
];

for (const m of duplicateMods) {
  addSample(
    "MOD_CONFLICT",
    "forge",
    "1.20.1",
    m,
    `[main/FATAL] [neoforge/]: Found duplicate mods:\n\tMod ID: '${m}' from mod files: ${m}-1.20.1-1.0.jar, ${m}-1.20.1-1.1.jar\nMinecraft Version: 1.20.1\nNeoForge: 47.1.0`
  );
}

// ── 6. CORRUPTED_WORLD (15 samples) ───────────────────────────────────────────
for (let i = 1; i <= 15; i++) {
  addSample(
    "CORRUPTED_WORLD",
    "vanilla",
    "1.20.1",
    undefined,
    `[Server thread/ERROR] [MinecraftServer/]: Encountered an unexpected exception com.mojang.datafixers\njava.util.zip.ZipException: Corrupted NBT tag in world/region/r.0.-1.mca\n\tat net.minecraft.world.level.chunk.storage.RegionFile.readChunk(RegionFile.java:142)\n\tat net.minecraft.server.MinecraftServer.loadLevel(MinecraftServer.java:312)\nMinecraft Version: 1.20.1`
  );
}

// ── 7. OUT_OF_MEMORY (15 samples) ─────────────────────────────────────────────
for (let i = 1; i <= 15; i++) {
  addSample(
    "OUT_OF_MEMORY",
    "fabric",
    "1.20.1",
    undefined,
    `[Render thread/FATAL] [Minecraft/]: Unreported exception thrown!\njava.lang.OutOfMemoryError: Java heap space\n\tat java.util.Arrays.copyOf(Arrays.java:3537)\n\tat net.minecraft.client.renderer.chunk.RenderChunkRegion.<init>(RenderChunkRegion.java:45)\nMinecraft Version: 1.20.1\nFabric Loader: 0.15.11`
  );
}

// ── 8. UNKNOWN_RUNTIME (10 samples) ───────────────────────────────────────────
for (let i = 1; i <= 10; i++) {
  addSample(
    "UNKNOWN_RUNTIME",
    "fabric",
    "1.20.1",
    undefined,
    `[main/INFO] [Minecraft/]: Setting user: Player_${i}\n[main/INFO] [Minecraft/]: Backend library initialized\n[main/INFO] [Minecraft/]: Stopping game with exit code 0\nMinecraft Version: 1.20.1`
  );
}

const outDir = path.join(__dirname, "datasets");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const targetPath = path.join(outDir, "crash-corpus.json");
fs.writeFileSync(targetPath, JSON.stringify(samples, null, 2), "utf-8");

console.log(`✅ Generated ${samples.length} benchmark crash samples at: ${targetPath}`);
console.log("Categories breakdown:");
for (const cat of CATEGORIES) {
  const count = samples.filter(s => s.category === cat).length;
  console.log(`  - ${cat}: ${count}`);
}
