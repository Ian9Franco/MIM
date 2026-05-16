const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");

/**
 * Script de depuración forense para metadatos de Mods.
 * Uso: node debug-mod.js <ruta-al-jar>
 */

const jarPath = process.argv[2] || path.join(__dirname, "JAR", "KoopasCritters_1.20.1Forge_V0.5.jar");

if (!fs.existsSync(jarPath)) {
    console.log(JSON.stringify({ error: "File not found", path: jarPath }));
    process.exit(1);
}

const report = {
    fileName: path.basename(jarPath),
    fullPath: jarPath,
    metadataFiles: [],
    contents: {},
    mimDeduction: {
        loader: "unknown",
        gameVersion: "unknown",
        reason: ""
    }
};

try {
    const zip = new AdmZip(jarPath);
    const entries = zip.getEntries();

    entries.forEach(e => {
        if (e.entryName.startsWith("META-INF/") && (e.entryName.endsWith(".toml") || e.entryName.endsWith(".json"))) {
            report.metadataFiles.push(e.entryName);
        }
    });

    const configs = [
        "META-INF/neoforge.mods.toml",
        "META-INF/mods.toml",
        "fabric.mod.json",
        "quilt.mod.json",
        "mcmod.info"
    ];

    configs.forEach(configFile => {
        const entry = entries.find(e => e.entryName === configFile);
        if (entry) {
            report.contents[configFile] = zip.readAsText(entry);
        }
    });

    // Simular lógica de detección de MIM
    const neoforgeEntry = entries.find(e => e.entryName === "META-INF/neoforge.mods.toml");
    const forgeEntry = entries.find(e => e.entryName === "META-INF/mods.toml");

    if (neoforgeEntry) {
        report.mimDeduction.loader = "neoforge";
        report.mimDeduction.reason = "Priority: found neoforge.mods.toml";
    } else if (forgeEntry) {
        report.mimDeduction.loader = "forge";
        report.mimDeduction.reason = "Found mods.toml";
    }

    const content = (neoforgeEntry || forgeEntry)?.getData().toString("utf8");
    if (content) {
        const sections = content.split(/\[\[dependencies/i);
        const deps = [];
        
        sections.forEach((section, i) => {
            if (i === 0) return;
            const modIdMatch = section.match(/modId\s*=\s*"([^"]+)"/);
            const rangeMatch = section.match(/versionRange\s*=\s*"([^"]+)"/);
            const modId = modIdMatch ? modIdMatch[1] : "unknown";
            const range = rangeMatch ? rangeMatch[1] : "none";
            
            const mcVersionPattern = /1\.(1[6-9]|2\d)(?:\.\d+)?/g;
            const matches = [...range.matchAll(mcVersionPattern)].map(m => m[0]);
            
            deps.push({ modId, range, detectedMcVersions: matches });
            
            if (modId === "minecraft" && matches.length > 0 && report.mimDeduction.gameVersion === "unknown") {
                report.mimDeduction.gameVersion = matches[0];
            }
        });
        report.dependencies = deps;
    }

    console.log(JSON.stringify(report, null, 2));

} catch (err) {
    console.log(JSON.stringify({ error: err.message }));
}
