import AdmZip from "adm-zip";

export interface MixinConfig {
  package: string;
  mixins?: string[];
  client?: string[];
  server?: string[];
}

/**
 * Escanea un JAR en busca de configuraciones de Mixins y extrae las clases objetivo.
 */
export async function extractMixinTargets(zip: AdmZip): Promise<string[]> {
  const targets = new Set<string>();
  const entries = zip.getEntries();

  // 1. Buscar archivos que parezcan configuraciones de Mixin
  const mixinFiles = entries.filter(entry => 
    entry.entryName.endsWith(".mixins.json") || 
    (entry.entryName.includes("mixins.") && entry.entryName.endsWith(".json"))
  );

  for (const entry of mixinFiles) {
    try {
      const content = zip.readAsText(entry);
      const config: MixinConfig = JSON.parse(content);
      
      if (config.package) {
        const pkg = config.package.endsWith(".") ? config.package : config.package + ".";
        
        // Agregar mixins generales
        if (Array.isArray(config.mixins)) {
          config.mixins.forEach(m => targets.add(pkg + m));
        }
        
        // Agregar mixins de cliente
        if (Array.isArray(config.client)) {
          config.client.forEach(m => targets.add(pkg + m));
        }
        
        // Agregar mixins de servidor
        if (Array.isArray(config.server)) {
          config.server.forEach(m => targets.add(pkg + m));
        }
      }
    } catch (e) {
      // Ignorar archivos malformados
    }
  }

  // 2. También buscar referencias en fabric.mod.json si existe
  const fabricEntry = zip.getEntry("fabric.mod.json");
  if (fabricEntry) {
    try {
      const content = zip.readAsText(fabricEntry);
      const json = JSON.parse(content);
      if (Array.isArray(json.mixins)) {
        for (const mixinRef of json.mixins) {
          const mixinPath = typeof mixinRef === "string" ? mixinRef : mixinRef.config;
          if (mixinPath) {
            const entry = zip.getEntry(mixinPath);
            if (entry) {
              const mixinContent = zip.readAsText(entry);
              const config: MixinConfig = JSON.parse(mixinContent);
              if (config.package) {
                const pkg = config.package.endsWith(".") ? config.package : config.package + ".";
                if (Array.isArray(config.mixins)) config.mixins.forEach(m => targets.add(pkg + m));
                if (Array.isArray(config.client)) config.client.forEach(m => targets.add(pkg + m));
                if (Array.isArray(config.server)) config.server.forEach(m => targets.add(pkg + m));
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  return Array.from(targets);
}
