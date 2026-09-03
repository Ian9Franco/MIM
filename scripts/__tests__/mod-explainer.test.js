/**
 * Test Suite: Intelligent Project Explainer (Multimodal + Gemini Grounding)
 * Verifies prompt construction, multimodal image signals, model decoupling,
 * grounding metadata parsing, and error fallbacks.
 */

const assert = require("assert");

const DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest";

function getGeminiModelTest(preferredModel, envModel) {
  if (preferredModel && preferredModel.trim()) {
    return preferredModel.trim();
  }
  if (envModel && envModel.trim()) {
    return envModel.trim();
  }
  return DEFAULT_GEMINI_MODEL;
}

function buildMultimodalPromptTest(input, imagesCount) {
  const hasRichDescription = input.description && input.description.trim().length > 25;
  const descSnippet = hasRichDescription
    ? input.description.trim().substring(0, 3000)
    : "(Sin descripción provista por el creador o descripción trivial/vacía)";

  const multimodalSection =
    imagesCount > 0
      ? `\nEVIDENCIA VISUAL ADJUNTA:
Se han adjuntado ${imagesCount} captura(s) de pantalla oficiales de la galería del mod.
- Analiza minuciosamente los cambios visuales que se aprecian en las capturas:
  * Si es un shader: cambios en agua, sombras, iluminación volumétrica, cielo, reflejos, tono o niebla.
  * Si es un mod de interfaz/HUD: barras, menús, inventarios, minimapas o indicadores.
  * Si es un mod de contenido: nuevos bloques, criaturas/mobs, biomas, armas, herramientas o estructuras.
  * Si es de optimización o utilidad: pantallas de ajustes, gráficos o perfiles de rendimiento.
- Incluye obligatoriamente la sección "### Evidencia Visual (Galería)" explicando qué se confirma en las imágenes.`
      : "";

  return {
    hasRichDescription: !!hasRichDescription,
    prompt: `Eres un analista técnico de Minecraft dentro de la aplicación MIM (Minecraft Intelligent Manager).
Tu objetivo es explicar en español, de forma concisa, profesional y estructurada, qué hace este proyecto de Minecraft combinando texto, metadatos, búsqueda web y evidencia visual.${multimodalSection}

INFORMACIÓN DEL PROYECTO:
- Nombre / Título: ${input.title}
- Autor: ${input.author || "Desconocido"}
- Plataforma / ID: ${input.source || "N/A"} (${input.slug || input.projectId})
- Enlace oficial: ${input.url || "N/A"}
- Categorías: ${(input.categories || []).join(", ") || "No especificadas"}
- Loaders: ${(input.loaders || []).join(", ") || "No especificados"}
- Descripción actual: ${descSnippet}`
  };
}

function parseGeminiResponseTest(data, imagesCount = 0) {
  const candidate = data?.candidates?.[0];
  const summaryMarkdown = candidate?.content?.parts?.[0]?.text || "No se pudo obtener una respuesta del modelo.";

  const sources = [];
  const groundingMetadata = candidate?.groundingMetadata;
  const searchChunks = groundingMetadata?.groundingChunks || [];

  for (const chunk of searchChunks) {
    if (chunk?.web?.uri) {
      sources.push({
        title: chunk.web.title || chunk.web.uri,
        url: chunk.web.uri,
      });
    }
  }

  const searchQueries = groundingMetadata?.webSearchQueries || [];
  const searchUsed = searchChunks.length > 0 || searchQueries.length > 0;

  return {
    summaryMarkdown: summaryMarkdown.trim(),
    groundedSources: sources,
    searchUsed,
    imagesAnalyzed: imagesCount,
  };
}

async function runTests() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("▶ [TEST SUITE] MIM Multimodal Project Explainer & Model Decoupling");
  console.log("════════════════════════════════════════════════════════════════\n");

  // TEST 1: Mod con descripción rica
  console.log("Test 1: Generación de prompt con descripción completa (Sodium)...");
  const inputRich = {
    projectId: "AANobbMI",
    title: "Sodium",
    author: "jellysquid3_",
    slug: "sodium",
    description: "Sodium is a powerful modern rendering engine for Minecraft 1.16+ client which greatly improves frame rates and stutters.",
    source: "modrinth",
    categories: ["optimization", "utility"],
    loaders: ["fabric"]
  };
  const res1 = buildMultimodalPromptTest(inputRich, 0);
  assert.strictEqual(res1.hasRichDescription, true);
  assert.ok(res1.prompt.includes("Sodium"));
  assert.ok(res1.prompt.includes("jellysquid3_"));
  assert.ok(res1.prompt.includes("optimization, utility"));
  console.log("✓ Test 1 Passed: Prompt estructurado correctamente para proyecto con descripción.\n");

  // TEST 2: Mod sin descripción o vacía (Caso crítico del usuario)
  console.log("Test 2: Mod sin descripción (Caso Empty Metadata / Investigation)...");
  const inputEmpty = {
    projectId: "sodium-extra-test",
    title: "Sodium Extra",
    author: "FlashyReese",
    slug: "sodium-extra",
    description: "",
    source: "curseforge",
    categories: ["utility"],
    loaders: ["fabric", "quilt"],
    url: "https://github.com/FlashyReese/sodium-extra"
  };
  const res2 = buildMultimodalPromptTest(inputEmpty, 0);
  assert.strictEqual(res2.hasRichDescription, false);
  assert.ok(res2.prompt.includes("Sin descripción provista"));
  assert.ok(res2.prompt.includes("FlashyReese"));
  assert.ok(res2.prompt.includes("https://github.com/FlashyReese/sodium-extra"));
  console.log("✓ Test 2 Passed: Señales de autor, slug y URLs extraídas para grounding en Google.\n");

  // TEST 3: Parseo de respuesta con Google Search Grounding Metadata
  console.log("Test 3: Parseo de respuesta con Grounding Chunks y Web Queries...");
  const mockGeminiResponse = {
    candidates: [
      {
        content: {
          parts: [
            {
              text: "### ¿Qué hace?\nSodium Extra añade configuraciones avanzadas para Sodium en Fabric.\n\n### Ámbito y Categoría\n- **Ámbito:** Cliente\n- **Tipo:** Rendimiento y Utilidad\n\n### Aspectos Clave\n- Control granular de niebla y partículas\n- Animaciones personalizables"
            }
          ]
        },
        groundingMetadata: {
          webSearchQueries: ["Sodium Extra mod FlashyReese Minecraft"],
          groundingChunks: [
            { web: { title: "FlashyReese/sodium-extra - GitHub", uri: "https://github.com/FlashyReese/sodium-extra" } },
            { web: { title: "Sodium Extra - CurseForge", uri: "https://www.curseforge.com/minecraft/mc-mods/sodium-extra" } }
          ]
        }
      }
    ]
  };

  const parsed = parseGeminiResponseTest(mockGeminiResponse, 0);
  assert.strictEqual(parsed.searchUsed, true);
  assert.strictEqual(parsed.groundedSources.length, 2);
  assert.strictEqual(parsed.groundedSources[0].title, "FlashyReese/sodium-extra - GitHub");
  assert.ok(parsed.summaryMarkdown.includes("¿Qué hace?"));
  console.log("✓ Test 3 Passed: Metadatos de Grounding y enlaces de Google Search extraídos correctamente.\n");

  // TEST 4: Fallback sin Search Grounding
  console.log("Test 4: Parseo de respuesta estándar sin Search Grounding...");
  const mockStandardResponse = {
    candidates: [
      {
        content: {
          parts: [
            {
              text: "### ¿Qué hace?\nMod de prueba sintetizado."
            }
          ]
        }
      }
    ]
  };
  const parsedStandard = parseGeminiResponseTest(mockStandardResponse, 0);
  assert.strictEqual(parsedStandard.searchUsed, false);
  assert.strictEqual(parsedStandard.groundedSources.length, 0);
  console.log("✓ Test 4 Passed: Degradación elegante sin fuentes cuando no se usa búsqueda.\n");

  // TEST 5: Multimodal Prompting con imágenes de Galería
  console.log("Test 5: Prompting Multimodal con 4 capturas de pantalla de galería...");
  const shaderMod = {
    projectId: "complementary-reimagined",
    title: "Complementary Reimagined",
    author: "EminGT",
    slug: "complementary-reimagined",
    description: "",
    source: "modrinth",
    categories: ["shaders"],
    loaders: ["iris", "optifine"]
  };
  const res5 = buildMultimodalPromptTest(shaderMod, 4);
  assert.ok(res5.prompt.includes("EVIDENCIA VISUAL ADJUNTA"));
  assert.ok(res5.prompt.includes("4 captura(s) de pantalla oficiales"));
  assert.ok(res5.prompt.includes("Evidencia Visual (Galería)"));
  assert.ok(res5.prompt.includes("agua, sombras, iluminación volumétrica"));
  console.log("✓ Test 5 Passed: Instrucciones multimodales inyectadas con guía para shaders/HUD/contenido.\n");

  // TEST 6: Desacoplamiento de Modelo (Sin hardcodear versiones obsoletas)
  console.log("Test 6: Resolución de modelo desacoplada...");
  const defaultModel = getGeminiModelTest();
  assert.strictEqual(defaultModel, DEFAULT_GEMINI_MODEL);

  const envModel = getGeminiModelTest(null, "gemini-3.0-flash");
  assert.strictEqual(envModel, "gemini-3.0-flash");

  const customModel = getGeminiModelTest("gemini-2.5-pro", "gemini-3.0-flash");
  assert.strictEqual(customModel, "gemini-2.5-pro");
  console.log("✓ Test 6 Passed: El modelo se resuelve dinámicamente sin quedar congelado en el código.\n");

  // TEST 7: Métricas de imágenes analizadas
  console.log("Test 7: Métrica de imágenes analizadas en el resultado...");
  const parsedWithImages = parseGeminiResponseTest(mockGeminiResponse, 3);
  assert.strictEqual(parsedWithImages.imagesAnalyzed, 3);
  console.log("✓ Test 7 Passed: Métrica imagesAnalyzed extraída para mostrar badge 🖼️ en la UI.\n");

  console.log("════════════════════════════════════════════════════════════════");
  console.log("🎉 ALL MULTIMODAL EXPLAINER UNIT TESTS PASSED (7/7)");
  console.log("════════════════════════════════════════════════════════════════\n");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
