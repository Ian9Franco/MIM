/**
 * SAGE – Systematic Analyzer for Glitches & Exceptions
 * ─────────────────────────────────────────────────────────────────────────────
 * Analizador avanzado de logs y crash reports de Minecraft.
 * Traduce terminología técnica de Java/Minecraft a explicaciones en español sencillas,
 * detecta automáticamente mods sospechosos y ofrece soluciones paso a paso.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface SageActionableFix {
  type: "missing_dependency" | "incompatible_dependency_version" | "duplicate_mod" | "other";
  modId: string;
  dependencyId?: string;
  requiredVersion?: string;
  currentVersion?: string;
  suggestionLabel: string;
}

export interface SageAnalysisResult {
  success: boolean;
  title: string;
  exceptionType: string;
  category: "Memoria" | "Dependencias" | "Conflictos" | "Programación" | "Java/Sistema" | "Desconocido";
  severity: "critical" | "warning" | "info";
  confidence: number; // Porcentaje de confianza del diagnóstico heurístico
  suspectedMods: string[];
  explanation: string;
  solutions: string[];
  technicalSummary: string;
  gameVersion?: string;
  loader?: string;
  actionableFix?: SageActionableFix; // Sugerencia de arreglo con un clic
  actionableFixes?: SageActionableFix[]; // Lista de múltiples sugerencias de arreglo rápido
  rawStats: {
    linesParsed: number;
    hasStackTrace: boolean;
    hasModList: boolean;
  };
  isHybrid?: boolean;
  hybridRiskScore?: number;
  hybridStabilityRisk?: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  detectedFabricModulesCount?: number;
}

export function analyzeMinecraftLog(rawText: string): SageAnalysisResult {
  const result: SageAnalysisResult = {
    success: false,
    title: "Análisis Inconcluso",
    exceptionType: "UnknownException",
    category: "Desconocido",
    severity: "info",
    confidence: 0,
    suspectedMods: [],
    explanation: "No se encontraron patrones de error o excepciones conocidas en el log proporcionado. Asegúrate de pegar el reporte completo o la sección donde dice 'Exception' o 'FATAL'.",
    solutions: [
      "Asegúrate de pegar el archivo 'crash-report' completo o el archivo 'logs/latest.log'.",
      "Verifica si el juego se cierra al iniciar o en un mundo específico.",
      "Si el juego se congeló sin reportar un error, es posible que sea falta de memoria."
    ],
    technicalSummary: "",
    rawStats: {
      linesParsed: 0,
      hasStackTrace: false,
      hasModList: false,
    }
  };

  if (!rawText || rawText.trim().length === 0) {
    result.explanation = "El texto de entrada está vacío.";
    return result;
  }

  const isHybrid = rawText.includes("org.sinytra.connector") || 
                   rawText.includes("sinytra") || 
                   rawText.includes("org/sinytra/connector") || 
                   rawText.includes("Connector") || 
                   rawText.toLowerCase().includes("sinytra connector");

  const lines = rawText.split(/\r?\n/);
  result.rawStats.linesParsed = lines.length;

  // ── 1. Detectar versión de Minecraft y Loader ──────────────────────────────
  let detectedVersion = "";
  let detectedLoader = "";

  for (const line of lines) {
    // Detectar versión de Minecraft
    if (line.includes("Minecraft Version:")) {
      const match = line.match(/Minecraft Version:\s*([0-9.]+)/i);
      if (match) detectedVersion = match[1];
    } else if (line.includes("Minecraft version")) {
      const match = line.match(/Minecraft version\s*([0-9.]+)/i);
      if (match) detectedVersion = match[1];
    }

    // Detectar loader
    if (line.includes("Fabric Loader") || line.includes("net.fabricmc.loader")) {
      detectedLoader = "Fabric";
    } else if (line.includes("NeoForge") || line.includes("net.neoforged")) {
      detectedLoader = "NeoForge";
    } else if (line.includes("Minecraft Forge") || line.includes("net.minecraftforge")) {
      detectedLoader = "Forge";
    }

    if (line.includes("Mods:") || line.includes("Alist of mods") || line.includes("Fabric mods:")) {
      result.rawStats.hasModList = true;
    }
    if (line.match(/^\s*at\s+[a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)+/)) {
      result.rawStats.hasStackTrace = true;
    }
  }

  if (detectedVersion) result.gameVersion = detectedVersion;
  if (detectedLoader) result.loader = detectedLoader;

  // ── 2. Motores de Diagnóstico Estructurados (Secciones y Dependencias) ──────
  
  // A. Guerra de Dependencias (Analizar bloques de mods para detectar dependencias múltiples)
  const failureText = rawText;
  const actionableFixes: SageActionableFix[] = [];
  const suspectedModsSet = new Set<string>();

  const modBlocks = failureText.split(/--\s*MOD\s+/i);

  if (modBlocks.length > 1) {
    for (let i = 1; i < modBlocks.length; i++) {
      const block = modBlocks[i];
      const linesInBlock = block.split("\n");
      const blockModId = linesInBlock[0].trim().replace(/\s*--\s*$/, "");

      // Intentamos matchear la frase completa: "Mod [sourceMod] requires [dependency] [version]"
      const fullDepMatch = block.match(/Mod\s+([a-zA-Z0-9_-]+)\s+requires\s+([a-zA-Z0-9_-]+)\s+([\d.]+(?:\s+or\s+above)?)/i);
      
      let sourceMod = blockModId || "Un mod";
      let dependency = "";
      let requiredVer = "cualquiera";

      if (fullDepMatch) {
        sourceMod = fullDepMatch[1];
        dependency = fullDepMatch[2];
        requiredVer = fullDepMatch[3] || "cualquiera";
      } else {
        const fallbackDepMatch = block.match(/requires\s+([a-zA-Z0-9_-]+)\s+([\d.]+(?:\s+or\s+above)?)/i);
        if (fallbackDepMatch) {
          dependency = fallbackDepMatch[1];
          requiredVer = fallbackDepMatch[2] || "cualquiera";
        }
      }

      if (dependency) {
        const notInstalledMatch = block.toLowerCase().includes("not installed") || 
                                  block.toLowerCase().includes("is missing") ||
                                  block.toLowerCase().includes("missing dependency");

        if (notInstalledMatch) {
          suspectedModsSet.add(sourceMod);
          suspectedModsSet.add(dependency);
          
          if (!actionableFixes.some(f => f.dependencyId === dependency)) {
            actionableFixes.push({
              type: "missing_dependency",
              modId: sourceMod,
              dependencyId: dependency,
              requiredVersion: requiredVer,
              suggestionLabel: `Buscar e Instalar ${dependency}`
            });
          }
        } else {
          const installedVerMatch = block.match(/currently\s+([a-zA-Z0-9._-]+)\s+is\s+installed/i) ||
                                    block.match(/currently\s+([a-zA-Z0-9._-]+)\s+installed/i) ||
                                    block.match(/currently\s+is\s+installed\s+([a-zA-Z0-9._-]+)/i) ||
                                    block.match(/currently\s+([a-zA-Z0-9._-]+)/i);

          if (installedVerMatch) {
            const currentVer = installedVerMatch[1];
            suspectedModsSet.add(sourceMod);
            suspectedModsSet.add(dependency);

            if (!actionableFixes.some(f => f.dependencyId === dependency)) {
              actionableFixes.push({
                type: "incompatible_dependency_version",
                modId: sourceMod,
                dependencyId: dependency,
                requiredVersion: requiredVer,
                currentVersion: currentVer,
                suggestionLabel: `Actualizar ${dependency}`
              });
            }
          }
        }
      }
    }
  }

  // Si encontramos múltiples dependencias faltantes/incompatibles, generamos un reporte unificado estelar
  if (actionableFixes.length > 0) {
    const totalCount = actionableFixes.length;
    const isMultiple = totalCount > 1;

    result.success = true;
    result.title = isMultiple ? `Faltan ${totalCount} Dependencias Obligatorias` : "Falta Dependencia Crítica (Librería)";
    result.exceptionType = isMultiple ? "MultipleMissingDependenciesException" : "MissingDependencyException";
    result.category = "Dependencias";
    result.severity = "critical";
    result.confidence = 99; // Totalmente determinista
    result.suspectedMods = Array.from(suspectedModsSet);

    if (isMultiple) {
      const depNames = actionableFixes.map(f => `• ${f.dependencyId} (requerido por ${f.modId})`).join("\n");
      result.explanation = `Tu juego no puede iniciar porque te faltan ${totalCount} librerías obligatorias que tus mods necesitan para funcionar:\n\n${depNames}\n\nMinecraft requiere que todas estas dependencias estén en tu carpeta de mods.`;
      result.solutions = [
        "Haz clic en cada botón de Acción Rápida más abajo para buscarlos e instalarlos uno a uno desde el panel FOMO.",
        "Asegúrate de que correspondan a tu loader (Forge/Fabric) y versión de Minecraft."
      ];
    } else {
      const fix = actionableFixes[0];
      result.explanation = `El mod "${fix.modId}" requiere de la librería o API "${fix.dependencyId}" (versión mínima recomendada: ${fix.requiredVersion}) para poder cargar correctamente. Sin embargo, "${fix.dependencyId}" no se encuentra instalada en tu carpeta de mods.`;
      result.solutions = [
        `Busca e instala el mod librería "${fix.dependencyId}" para Minecraft ${detectedVersion || "su versión"} con el cargador ${detectedLoader || "su loader"}.`,
        "Puedes hacer clic en 'Buscar e Instalar' más abajo para automatizar la solución desde el panel FOMO al instante."
      ];
    }

    result.actionableFixes = actionableFixes;
    result.actionableFix = actionableFixes[0]; // compatible con UI simple

    return result;
  }

  // C. Archivos Duplicados / Conflictos de Mods (Incompatibilidades)
  // Ejemplo: "Found duplicate mods:\n\tMod ID: 'rubidium' from mod files: rubidium-mc1.20.1-0.7.1.jar, embeddium-0.3.31+mc1.20.1.jar"
  const duplicateBlockMatch = failureText.match(/Found\s+duplicate\s+mods?:?\s*[\r\n]*\s*Mod\s+ID:\s*'([^']+)'\s+from\s+mod\s+files:\s*([^\r\n]+)/i);

  const duplicateMatch = duplicateBlockMatch ||
                         failureText.match(/Duplicate\s+mod\s+id:\s*([a-zA-Z0-9_-]+)/i) ||
                         failureText.match(/Found\s+duplicate\s+mod:\s*([a-zA-Z0-9_-]+)/i) ||
                         failureText.match(/Duplicate\s+mods\s+detected/i);

  if (duplicateMatch) {
    let duplicateMod = "desconocido";
    let explanation = "Has colocado múltiples archivos .jar pertenecientes al mismo mod o con el mismo identificador dentro de tu carpeta de mods. Java no puede cargar versiones paralelas.";
    let solutions = [
      "Entra a la carpeta de mods y conserva un único archivo .jar de este mod, borrando las versiones antiguas o redundantes.",
      "Asegúrate de que no haya residuos de copias viejas tras realizar actualizaciones manuales."
    ];
    let suspectedMods = ["desconocido"];

    if (duplicateBlockMatch) {
      const modId = duplicateBlockMatch[1];
      const filesStr = duplicateBlockMatch[2];
      const jarFiles = filesStr.split(",").map(f => f.trim());
      duplicateMod = modId;
      suspectedMods = jarFiles.map(f => f.replace(/\.jar$/, ""));
      explanation = `El cargador de Minecraft detectó que tienes dos archivos .jar que implementan el mismo identificador de Mod ('${modId}'):\n\n` +
                    jarFiles.map(f => `• ${f}`).join("\n") +
                    `\n\nNo puedes tener ambos instalados al mismo tiempo ya que colisionan entre sí. Este error es sumamente común al migrar entre optimizadores paralelos (como Rubidium y Embeddium).`;
      solutions = [
        `Elimina uno de los dos archivos de tu carpeta de mods: conserva '${jarFiles[0]}' o '${jarFiles[1]}', pero nunca ambos.`,
        "Si has instalado un nuevo optimizador (como Embeddium), recuerda borrar el antiguo (como Rubidium) para evitar colisiones."
      ];
    } else {
      duplicateMod = duplicateMatch[1] || "desconocido";
      suspectedMods = [duplicateMod];
      explanation = `Has colocado múltiples archivos .jar pertenecientes al mismo mod ("${duplicateMod}") dentro de tu carpeta de mods. Java no puede cargar versiones paralelas de una misma librería.`;
    }

    result.success = true;
    result.title = "Conflicto por Mod Duplicado / Alternativo";
    result.exceptionType = "DuplicateModException";
    result.category = "Conflictos";
    result.severity = "critical";
    result.confidence = 99;
    result.explanation = explanation;
    result.suspectedMods = suspectedMods;
    result.solutions = solutions;
    result.actionableFix = {
      type: "duplicate_mod",
      modId: duplicateMod,
      suggestionLabel: `Resolver conflicto de ${duplicateMod}`
    };
    return result;
  }

  // ── 3. Buscar Excepciones y Patrones Críticos ──────────────────────────────

  // A. Out of Memory (Falta de Memoria)
  if (
    rawText.includes("java.lang.OutOfMemoryError") ||
    rawText.includes("OutOfMemory") ||
    rawText.includes("GC overhead limit exceeded") ||
    rawText.includes("Memory reserve")
  ) {
    result.success = true;
    result.title = "Falta de Memoria RAM Asignada";
    result.exceptionType = "OutOfMemoryError";
    result.category = "Memoria";
    result.severity = "critical";
    result.confidence = 99;
    result.explanation = "El juego se ha quedado sin memoria RAM disponible. Esto ocurre frecuentemente cuando se cargan muchos mods pesados o paquetes de texturas detallados sin configurar el Launcher correctamente.";
    result.solutions = [
      "Incrementa la memoria RAM asignada en los ajustes de tu launcher (MIM recomienda asignar entre 4GB y 6GB para la mayoría de modpacks modernos).",
      "Cierra aplicaciones pesadas en tu sistema (como Chrome, Discord, Spotify) antes de arrancar Minecraft.",
      "Instala mods de optimización de memoria (ej. FerriteCore, Radium/Krypton) para reducir el consumo.",
      "En MIM, puedes configurar los parámetros JVM desde la pestaña de Ajustes de MIM si usas builds integradas."
    ];
    result.technicalSummary = "Excepción java.lang.OutOfMemoryError detectada en el Heap de Java.";
    return result;
  }

  // B. Mixin Conflict / Inject Failure (Conflictos de código entre mods)
  if (
    rawText.includes("org.spongepowered.asm.mixin") ||
    rawText.includes("MixinApplyError") ||
    rawText.includes("mixin.transformer") ||
    rawText.includes("Critical injection failure") ||
    rawText.includes("Mixin config")
  ) {
    result.success = true;
    result.title = "Conflicto Crítico de Código (Guerra de Mixins)";
    result.exceptionType = "MixinApplyError / MixinTransformerError";
    result.category = "Conflictos";
    result.severity = "critical";
    result.confidence = 92;
    result.explanation = "Two or more mods are trying to modify the same internal Minecraft code in an incompatible way. The Mixin system failed to apply a patch, which cancelled the game startup.";
    
    // Attempt to extract the suspect mod
    const mixinMatch = rawText.match(/critical\s+injection\s+failure:\s+@[a-zA-Z0-9_$]+\(([^)]+)\)\s+from\s+([a-zA-Z0-9._-]+)/i) ||
                       rawText.match(/Mixin\s+([a-zA-Z0-9._-]+)\s+failed\s+to\s+apply/i);
    
    if (mixinMatch) {
      const suspected = mixinMatch[2] || mixinMatch[1];
      result.suspectedMods.push(suspected);
      result.explanation += ` El reporte de Mixin apunta específicamente hacia un componente relacionado con: "${suspected}".`;
    }

    // Buscar mods de render comunes que suelen causar esto
    if (rawText.toLowerCase().includes("sodium") || rawText.toLowerCase().includes("rubidium") || rawText.toLowerCase().includes("embeddium")) {
      result.suspectedMods.push("Sodium/Embeddium");
    }
    if (rawText.toLowerCase().includes("optifine")) {
      result.suspectedMods.push("OptiFine");
    }

    result.solutions = [
      result.suspectedMods.length > 0 
        ? `Desinstala o actualiza temporalmente los mods bajo sospecha: ${result.suspectedMods.join(", ")}.`
        : "Revisa los mods que hayas instalado o actualizado recientemente.",
      "Evita usar OptiFine junto con mods modernos de optimización como Sodium o Embeddium (esto causa el 90% de los crashes de Mixin).",
      "Actualiza el cargador de mods (Fabric/Forge/NeoForge) de tu proyecto de MIM.",
      "Asegúrate de que la API de Fabric (Fabric API) o NeoForge esté en la versión exacta recomendada para tu Minecraft."
    ];
    result.technicalSummary = "Fallo de inyección del transformador de SpongePowered Mixin. Conflicto directo en tiempo de carga de clases bytecode.";
    return result;
  }

  // C. ClassNotFoundException / NoClassDefFoundError (Falta Dependencia o API)
  if (
    rawText.includes("java.lang.ClassNotFoundException") ||
    rawText.includes("java.lang.NoClassDefFoundError") ||
    rawText.includes("Failed to load mod") ||
    rawText.includes("Missing library") ||
    rawText.includes("requires") && rawText.includes("missing")
  ) {
    result.success = true;
    result.title = "Falta Dependencia Requerida (Librería / API)";
    result.exceptionType = rawText.includes("ClassNotFoundException") ? "ClassNotFoundException" : "NoClassDefFoundError";
    result.category = "Dependencias";
    result.severity = "critical";
    result.confidence = 95;
    result.explanation = "Un mod intentó ejecutarse, pero requiere de una librería, API o mod secundario para funcionar que no está en la carpeta de mods.";

    // Buscar qué clase falta
    const classMatch = rawText.match(/(?:ClassNotFoundException|NoClassDefFoundError):\s*([a-zA-Z0-9_$./]+)/);
    let missingEntity = "";
    if (classMatch) {
      missingEntity = classMatch[1];
      result.technicalSummary = `Falta la clase: ${missingEntity}`;
    }

    // Identificar librerías comunes a partir de paquetes de Java
    let suspectedLibrary = "API Desconocida";
    if (missingEntity.includes("me/shedaniel/cloth/config") || missingEntity.includes("cloth.config")) {
      suspectedLibrary = "Cloth Config API";
      result.suspectedMods.push("cloth-config");
    } else if (missingEntity.includes("com/terraformersmc/modmenu") || missingEntity.includes("modmenu")) {
      suspectedLibrary = "Mod Menu";
      result.suspectedMods.push("modmenu");
    } else if (missingEntity.includes("architectury")) {
      suspectedLibrary = "Architectury API";
      result.suspectedMods.push("architectury-api");
    } else if (missingEntity.includes("geckolib") || missingEntity.includes("software/bernie/geckolib")) {
      suspectedLibrary = "Geckolib";
      result.suspectedMods.push("geckolib");
    } else if (missingEntity.includes("net/fabricmc/fabric/api") || missingEntity.includes("fabric-api")) {
      suspectedLibrary = "Fabric API";
      result.suspectedMods.push("fabric-api");
    } else if (missingEntity.includes("com/electronwill/nightconfig")) {
      suspectedLibrary = "NightConfig (Librería de Forge)";
    }

    result.explanation += missingEntity 
      ? ` Falta la clase interna "${missingEntity}", la cual suele pertenecer a la librería "${suspectedLibrary}".`
      : " No se pudo extraer automáticamente el nombre de la clase, pero se trata con seguridad de una dependencia faltante.";

    result.solutions = [
      `Busca e instala el mod/librería faltante: "${suspectedLibrary}". Puedes usar el panel FOMO de MIM para buscarlo directamente.`,
      "Si estás usando Fabric, asegúrate de tener instalado el mod 'Fabric API', que es obligatorio para casi todos los mods.",
      "Si estás usando Forge/NeoForge, asegúrate de que no borraste por error alguna librería básica requerida por los mods.",
      "Verifica los detalles del mod instalado en MIM para ver la sección de dependencias requeridas."
    ];
    return result;
  }

  // D. NoSuchMethodError / NoSuchFieldError (Incompatibilidad de Versiones / Mods obsoletos)
  if (
    rawText.includes("java.lang.NoSuchMethodError") ||
    rawText.includes("java.lang.NoSuchFieldError") ||
    rawText.includes("java.lang.AbstractMethodError")
  ) {
    result.success = true;
    result.title = "Incompatibilidad de Versión de Mod (Función Ausente)";
    result.exceptionType = rawText.includes("NoSuchMethodError") ? "NoSuchMethodError" : "NoSuchFieldError";
    result.category = "Conflictos";
    result.severity = "critical";
    result.confidence = 90;
    result.explanation = "Un mod intentó usar una función o campo que esperaba encontrar en el código de Minecraft o de otro mod, pero no existía. Esto ocurre casi siempre porque tienes una versión desactualizada o incompatible de una librería, o el mod está diseñado para otra sub-versión de Minecraft.";

    // Buscar método o campo ausente
    const methodMatch = rawText.match(/(?:NoSuchMethodError|NoSuchFieldError):\s*(.*)/);
    if (methodMatch) {
      result.technicalSummary = `Elemento no encontrado: ${methodMatch[1]}`;
    }

    // Buscar culpables típicos
    if (rawText.toLowerCase().includes("fabric") || rawText.toLowerCase().includes("fabric-api")) {
      result.suspectedMods.push("Fabric API / Loader");
    }

    result.solutions = [
      "Actualiza el mod principal que causó el error y todas sus librerías de soporte (Cloth Config, Architectury, Fabric API, etc.).",
      "Confirma que NO tengas mezclados mods de diferentes versiones de Minecraft (ej. un mod de la 1.20.2 en un proyecto de la 1.20.1).",
      "Si tienes instalada una versión Beta o Alpha de algún mod, prueba bajar a la última versión 'Release' estable.",
      "Usa la pestaña de 'Actualizaciones' en el Centro de Alertas de MIM para poner al día tus mods."
    ];
    return result;
  }

  // E. NullPointerException (Bug de Programación en un Mod)
  if (rawText.includes("java.lang.NullPointerException")) {
    result.success = true;
    result.title = "Fallo de Referencia Nula (Bug de Programación)";
    result.exceptionType = "NullPointerException";
    result.category = "Programación";
    result.severity = "critical";
    result.confidence = 85;
    result.explanation = "Un mod intentó leer o interactuar con un objeto que no está cargado o es inexistente (valor 'null'). Esto se debe por lo general a un fallo directo de programación o lógica en el código del mod.";

    // Analizar stack trace para sospechosos
    const stackLines = lines.filter(l => l.trim().startsWith("at "));
    const suspects = new Set<string>();
    
    for (const sLine of stackLines.slice(0, 5)) {
      const pkgMatch = sLine.match(/at\s+([a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)+)\./);
      if (pkgMatch) {
        const pkg = pkgMatch[1];
        // Filtrar paquetes internos de java o minecraft
        if (!pkg.startsWith("java.") && !pkg.startsWith("sun.") && !pkg.startsWith("net.minecraft.class") && !pkg.startsWith("net.minecraft.server")) {
          // Extraer la primera o segunda palabra como identificador de mod
          const parts = pkg.split(".");
          if (parts[0] === "com" || parts[0] === "org" || parts[0] === "net" || parts[0] === "me") {
            if (parts[1] && parts[2]) suspects.add(parts[2]);
          } else {
            if (parts[0]) suspects.add(parts[0]);
          }
        }
      }
    }

    if (suspects.size > 0) {
      result.suspectedMods = Array.from(suspects);
      result.explanation += ` El análisis del código apunta a que la excepción proviene de clases ligadas a: ${result.suspectedMods.map(s => `"${s}"`).join(", ")}.`;
    }

    result.solutions = [
      result.suspectedMods.length > 0
        ? `Intenta deshabilitar temporalmente el mod "${result.suspectedMods[0]}" para ver si el juego arranca sin él.`
        : "Revisa los mods instalados recientemente y deshabilítalos uno por uno hasta hallar el culpable.",
      "Busca si hay alguna actualización disponible para el mod sospechoso que solucione este bug.",
      "Reporta este crash-report en el GitHub o Discord del creador del mod para que puedan corregir la línea de código nula."
    ];
    result.technicalSummary = "Excepción java.lang.NullPointerException. Intento de desreferencia de puntero nulo en tiempo de ejecución.";
    return result;
  }

  // F. Mod Validation Error (NeoForge/Forge dependencias faltantes explícitas)
  if (rawText.includes("ModValidationError") || rawText.includes("identifyMissingMods")) {
    result.success = true;
    result.title = "Falta de Mod / Dependencia en Forge/NeoForge";
    result.exceptionType = "ModValidationError";
    result.category = "Dependencias";
    result.severity = "critical";
    result.confidence = 96;
    result.explanation = "El cargador de mods de Forge o NeoForge detectó antes de arrancar que uno de los mods que instalaste requiere otros componentes indispensables que no están presentes.";
    result.solutions = [
      "Lee las primeras líneas del log para identificar qué mods se listan como 'missing' o 'required'.",
      "Instala los mods que se te solicitan e inténtalo de nuevo.",
      "Utiliza el analizador de MIM para verificar las dependencias de los archivos descargados."
    ];
    result.technicalSummary = "Fallo de validación de mods de FML (Forge Mod Loader). Dependencias de metadatos no satisfechas.";
    return result;
  }

  // Sinytra Connector Bytecode/Transformation Error Heuristics
  if (
    rawText.includes("org.sinytra.connector.transformer") || 
    rawText.includes("org.sinytra.connector.locator") ||
    rawText.includes("org.sinytra.connector") && (rawText.includes("Transformer") || rawText.includes("patch"))
  ) {
    result.success = true;
    result.title = "Fallo en Traducción de Código (Sinytra Connector)";
    result.exceptionType = "SinytraTransformationException";
    result.category = "Conflictos";
    result.severity = "critical";
    result.confidence = 96;
    result.explanation = "Sinytra Connector no pudo traducir ni transformar el bytecode de uno de tus mods de Fabric para que funcione en Forge. Esto ocurre cuando un mod de Fabric utiliza técnicas de programación extremadamente específicas de Fabric que el traductor de bytecode aún no soporta de forma nativa.";
    result.solutions = [
      "Instala 'Connector Extras', que añade compatibilidad para APIs comunes de Fabric en entornos de Forge.",
      "Identifica cuál es el mod de Fabric más reciente que agregaste e intenta deshabilitarlo temporalmente.",
      "Asegúrate de que estás usando la versión recomendada del mod de Fabric para Minecraft 1.20.1.",
      "Prueba actualizar Sinytra Connector a su versión más reciente desde el panel de descargas de MIM."
    ];
    result.technicalSummary = "Fallo crítico durante la fase de transformación/mapeo de clases en Sinytra Connector (org.sinytra.connector.transformer).";
    return result;
  }

  // ── 3.B. Heurísticas del Connector Compatibility Engine ───────────────────
  if (isHybrid) {
    // Caso 1: Bloqueo por Watchdog / Carga de Recursos Híbridos (de synitra_Crash_test.txt)
    if (
      (rawText.includes("Server Watchdog") || rawText.includes("ServerHangWatchdog")) &&
      (rawText.includes("ZipFileSystem") || rawText.includes("IoSupplier") || rawText.includes("LanguageHook") || rawText.includes("connector_pre_launch"))
    ) {
      result.success = true;
      result.title = "Bloqueo por Carga de Idiomas/Recursos Híbridos";
      result.exceptionType = "ServerWatchdogStallException";
      result.category = "Conflictos";
      result.severity = "critical";
      result.confidence = 92;
      result.explanation = "El watchdog del servidor Minecraft detuvo el hilo principal porque tardó demasiado tiempo en iniciarse. Esto es un 'deadlock' o bloqueo de recursos sumamente común cuando mods de Fabric intentan inyectar cargadores de recursos nativos (como resource_loader) a través del cargador puente en Forge en la fase previa al lanzamiento.";
      result.solutions = [
        "Deshabilita temporalmente 'Connector Extras' de tus mods para validar si se elimina el bloqueo mutuo.",
        "Asegúrate de no tener instalados cargadores de assets masivos que intenten traducir idiomas de Minecraft en caliente.",
        "Edita la propiedad 'max-tick-time' a '-1' en el archivo server.properties si el juego corre en un entorno de servidor local para desactivar este apagado preventivo."
      ];
      result.technicalSummary = "Fase pre-lanzamiento detenida por Server Watchdog. Bloqueo en ZipFileSystem / IoSupplier (hilo bloqueado leyendo recursos traducidos).";
      return result;
    }

    // Caso 2: Falta de API de Fabric específica
    if (rawText.includes("ClassNotFoundException") && (rawText.includes("net/fabricmc/fabric/api") || rawText.includes("net.fabricmc.fabric.api"))) {
      result.success = true;
      result.title = "Falta Módulo de Fabric API en Forge";
      result.exceptionType = "ClassNotFoundException: net.fabricmc.fabric.api";
      result.category = "Dependencias";
      result.severity = "critical";
      result.confidence = 98;
      result.explanation = "Uno de tus mods de Fabric instalados en Forge requiere de un módulo interno específico de la API de Fabric que no se encuentra mapeado o instalado.";
      result.solutions = [
        "Instala o actualiza el mod 'Forgified Fabric API' en tu carpeta de mods, el cual actúa como el puente oficial de APIs.",
        "Instala 'Connector Extras' desde el panel de descargas FOMO de MIM para resolver dependencias avanzadas de Fabric."
      ];
      result.technicalSummary = "ClassNotFoundException lanzada por cargador híbrido de clases al no encontrar referencias de net.fabricmc.fabric.api.";
      return result;
    }

    // Caso 3: NoSuchMethod / NoSuchField en clase de Fabric
    if (
      (rawText.includes("NoSuchMethodError") || rawText.includes("NoSuchFieldError")) &&
      (rawText.includes("net/fabricmc") || rawText.includes("net.fabricmc") || rawText.includes("fabric-api"))
    ) {
      result.success = true;
      result.title = "Fallo de Enlace de Método (Incompatibilidad Fabric)";
      result.exceptionType = rawText.includes("NoSuchMethodError") ? "NoSuchMethodError" : "NoSuchFieldError";
      result.category = "Conflictos";
      result.severity = "critical";
      result.confidence = 90;
      result.explanation = "Un mod de Fabric intentó acceder a una función o campo nativo de Fabric que Sinytra Connector no pudo remapear en Forge. Esto suele ocurrir cuando tienes versiones cruzadas o incompatibles de los mods con la versión del loader puente.";
      result.solutions = [
        "Revisa si el mod de Fabric causante tiene una versión alternativa compilada de forma nativa para Forge (ej: usar Embeddium en vez de Sodium, o Canary en vez de Lithium).",
        "Prueba actualizar 'Sinytra Connector' a su última versión Beta estable para expandir la cobertura de métodos remapeados."
      ];
      result.technicalSummary = "Fallo crítico de enlace dinámico de métodos traducidos mediante Bytecode Bridge.";
      return result;
    }

    // Caso 4: Access Widener Apply Failure
    if (rawText.includes("Failed to apply access widener") || rawText.includes("AccessWidener") || rawText.includes("access_widener")) {
      result.success = true;
      result.title = "Fallo al Aplicar Access Widener";
      result.exceptionType = "AccessWidenerApplyException";
      result.category = "Conflictos";
      result.severity = "critical";
      result.confidence = 95;
      result.explanation = "Un mod de Fabric utiliza archivos Access Widener para saltarse la visibilidad de código (métodos privados de Minecraft) en Fabric. Sinytra Connector no logró aplicar estas alteraciones dinámicas de acceso en la estructura binaria de Forge.";
      result.solutions = [
        "Asegúrate de que la versión del mod de Fabric sea exactamente compatible con tu versión de Minecraft 1.20.1.",
        "Verifica si el autor ha publicado un fix para entornos híbridos o utiliza la alternativa nativa de Forge del mod."
      ];
      result.technicalSummary = "Fallo del inyector de acceso al reescribir descriptores de visibilidad del compilador.";
      return result;
    }
  }

  // G. Driver de Gráficos / LWJGL (Errores de OpenGL/Pantalla)
  if (
    rawText.includes("org.lwjgl.opengl") ||
    rawText.includes("GLFW error") ||
    rawText.includes("Pixel format not accelerated") ||
    rawText.includes("OpenGL") && rawText.includes("failed")
  ) {
    result.success = true;
    result.title = "Error de Renderizado Gráfico (OpenGL / Pantalla)";
    result.exceptionType = "GLFWException / OpenGLException";
    result.category = "Java/Sistema";
    result.severity = "critical";
    result.confidence = 94;
    result.explanation = "Minecraft no pudo inicializar la pantalla o el motor gráfico OpenGL. Esto se debe por lo general a controladores (drivers) de video obsoletos o a un conflicto directo con mods de sombreadores (shaders) o texturas de resolución muy alta.";
    result.solutions = [
      "Actualiza los controladores (drivers) de tu tarjeta de video (Nvidia, AMD o Intel) a la última versión disponible.",
      "Si tienes instalados Shaders o mods de rendimiento gráfico pesado (como Oculus o Rubidium), quítalos e intenta iniciar.",
      "Asegúrate de que Minecraft se esté ejecutando con tu tarjeta gráfica dedicada y no con los gráficos integrados del procesador.",
      "Reduce la escala de renderizado o resolución de pantalla en el launcher de Minecraft antes de abrirlo."
    ];
    result.technicalSummary = "Fallo de inicialización OpenGL GLFW. Formato de píxel no acelerado o driver sin soporte OpenGL moderno.";
    return result;
  }

  // ── 3. Fallback Genérico para Excepciones de Java ──────────────────────────
  const genericException = rawText.match(/(?:Exception|Error) in thread "[^"]*"\s+([a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)+)/);
  if (genericException) {
    const excName = genericException[1].split(".").pop() || "Exception";
    result.success = true;
    result.title = `Excepción de Java: ${excName}`;
    result.exceptionType = genericException[1];
    result.category = "Java/Sistema";
    result.severity = "warning";
    result.confidence = 75;
    result.explanation = `Se capturó un fallo inesperado de Java del tipo "${genericException[1]}". Esto indica un comportamiento anómalo que el cargador de mods no pudo controlar de forma nativa.`;
    result.solutions = [
      "Inspecciona la traza técnica inmediatamente posterior para rastrear qué mod causó el desborde.",
      "Prueba iniciar el juego desactivando los mods agregados más recientemente.",
      "Asegúrate de utilizar una versión oficial y recomendada de Java (Java 17 para Minecraft 1.18+, Java 21 para Minecraft 1.20.5+)."
    ];
    result.technicalSummary = `Se detectó la excepción de nivel de hilo: ${genericException[1]}`;
    return result;
  }

  // ── 4. Enriquecimiento para Sinytra Connector (Híbrido) ───────────────────
  if (isHybrid) {
    result.isHybrid = true;
    let hybridRiskScore = 30;
    
    // Contar módulos de Fabric
    const fabricPatterns = [
      "fabric-api", "fabric-rendering-v1", "fabric-resource-loader-v0", "fabric-screen-api-v1",
      "fabric-networking-api-v1", "fabric-lifecycle-events-v1", "fabric-item-api-v1", "fabric-message-api-v1",
      "forgified-fabric-api", "connector-extras", "fabric_rendering_v1", "fabric_resource_loader_v0",
      "fabric_screen_api_v1", "fabric_networking_api_v1", "fabric_lifecycle_events_v1", "fabric_item_api_v1"
    ];
    let fabricCount = 0;
    fabricPatterns.forEach(pattern => {
      if (rawText.toLowerCase().includes(pattern)) {
        fabricCount++;
      }
    });

    hybridRiskScore += Math.min(fabricCount * 5, 35);
    
    if (rawText.includes("MixinApplyError") || rawText.includes("MixinTransformerError") || rawText.includes("critical injection failure")) {
      hybridRiskScore += 20;
    }
    if (rawText.includes("Server Watchdog") || rawText.includes("ServerHangWatchdog") || rawText.includes("Thread: Server Watchdog")) {
      hybridRiskScore += 25;
    }
    if (rawText.includes("ClassNotFoundException") || rawText.includes("NoClassDefFoundError")) {
      hybridRiskScore += 20;
    }
    
    hybridRiskScore = Math.min(hybridRiskScore, 100);
    
    let hybridStabilityRisk: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" = "LOW";
    if (hybridRiskScore >= 86) hybridStabilityRisk = "VERY_HIGH";
    else if (hybridRiskScore >= 66) hybridStabilityRisk = "HIGH";
    else if (hybridRiskScore >= 36) hybridStabilityRisk = "MEDIUM";
    else hybridStabilityRisk = "LOW";

    result.hybridRiskScore = hybridRiskScore;
    result.hybridStabilityRisk = hybridStabilityRisk;
    result.detectedFabricModulesCount = fabricCount;

    if (result.success) {
      result.title = `[Sinytra Bridge] ${result.title}`;
      result.explanation = `[Entorno Híbrido Forge+Fabric] Detectamos que estás usando Sinytra Connector para ejecutar mods de Fabric en tu instancia de Forge (Riesgo de Inestabilidad: ${hybridStabilityRisk}).\n\n` + result.explanation;
      result.solutions = [
        "Asegúrate de tener instalados tanto 'Sinytra Connector' como su complemento 'Connector Extras' actualizados a sus últimas versiones.",
        "Dado que estás ejecutando un entorno traducido (Fabric -> Forge), algunos mods de Fabric muy complejos (como los que modifican shaders o renderizadores avanzados) podrían no ser compatibles y causar este crash.",
        ...result.solutions
      ];
    }
  }

  return result;
}
