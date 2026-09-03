/**
 * MIM — Backend Response Voice
 * ─────────────────────────────────────────────────────────────────────────────
 * Mensajes de respuesta del backend con personalidad propia.
 * Ni genérico, ni corporativo — refleja que esto fue hecho a mano.
 *
 * Uso: import { mimMsg } from "@/lib/core/voice";
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Success Messages ──────────────────────────────────────────────────────────

export const mimMsg = {

  // Build / Compilation
  buildDone: (type: string, count: number) =>
    `✅ Build "${type}" lista — ${count} mods empaquetados. Probá el ZIP antes de compartir.`,
  buildNothingToCopy: () =>
    "⚠️ El builder no encontró nada que copiar. Revisá que haya mods en las carpetas correctas.",
  buildPathEmpty: () =>
    "❌ El nombre del proyecto quedó vacío después de limpiar caracteres ilegales. Sería incómodo crear una carpeta sin nombre.",

  // Classify / Move
  classifyDone: (moved: number, skipped: number) =>
    skipped > 0
      ? `📦 ${moved} archivo${moved !== 1 ? "s" : ""} clasificado${moved !== 1 ? "s" : ""}. ${skipped} saltado${skipped !== 1 ? "s" : ""} — ya estaban donde tenían que estar o no se encontraron.`
      : `📦 ${moved} archivo${moved !== 1 ? "s" : ""} clasificado${moved !== 1 ? "s" : ""} correctamente. Todo en su lugar.`,
  classifyMissingFields: () =>
    "❌ Faltan campos obligatorios: sourcePaths (o sourcePath), targetCategory, version, modloader. Sin eso no sé a dónde mover nada.",
  classifyBadCategory: (cat: string, sub: string) =>
    `❌ La categoría "${cat}" / "${sub}" no existe en el árbol de source de MIM. Revisar el enum de categorías en constants.ts.`,

  // Delete
  deleteDone: (deleted: number, failed: number) =>
    failed > 0
      ? `🗑️ ${deleted} archivo${deleted !== 1 ? "s" : ""} eliminado${deleted !== 1 ? "s" : ""}. ${failed} no se pudo${failed !== 1 ? "n" : ""} borrar — probablemente en uso o sin permisos.`
      : `🗑️ ${deleted} archivo${deleted !== 1 ? "s" : ""} eliminado${deleted !== 1 ? "s" : ""}. Limpio.`,
  deleteNoPath: () =>
    "❌ Necesito saber qué borrar. Enviá 'path' o 'paths'.",

  // Staging / Deploy to game
  stagingEmpty: () =>
    "📭 La bandeja de entrada está vacía. Sin archivos pendientes.",
  stagingDone: (moved: number, errors: string[]) =>
    errors.length > 0
      ? `⚡ ${moved} mod${moved !== 1 ? "s" : ""} instalado${moved !== 1 ? "s" : ""} en el juego. Algunos errores al mover — revisá los logs.`
      : `⚡ ${moved} mod${moved !== 1 ? "s" : ""} instalado${moved !== 1 ? "s" : ""} directamente en tu carpeta de mods. Podés abrir el juego.`,
  stagingNoMinecraft: () =>
    "❌ No se encontró la ruta de Minecraft. Configurala primero en Ajustes antes de instalar mods directamente al juego.",
  stagingInvalidAction: () =>
    "❌ Acción desconocida. Las acciones válidas son: 'deploy' y 'clear'.",

  // Settings
  settingsSaved: () =>
    "💾 Configuración guardada. Los cambios se aplican de inmediato.",
  settingsPathNotFound: () =>
    "❌ La ruta no existe en el sistema de archivos. Verificá que el disco esté conectado y la ruta sea correcta.",
  settingsMoved: () =>
    "📁 Archivos movidos a la nueva ubicación. Nada se perdió en el proceso.",
  settingsSamePath: () =>
    "🤷 Origen y destino son la misma ruta. No hice nada porque no hacía falta.",
  settingsPickerFailed: () =>
    "❌ El selector de carpetas falló. Puede ser un problema de permisos de Electron o que se cerró sin elegir nada.",

  // Scan / Validate
  scanDone: (file: string) =>
    `🔍 Escaneo completado para "${file}". Revisá el reporte para ver el detalle.`,
  scanMissingPath: () =>
    "❌ No se especificó ruta al archivo. Enviá 'filePath' en el body.",
  validateDone: () =>
    "✔️ Validación completada. Sin errores críticos detectados.",
  validateFailed: (issues: number) =>
    `⚠️ Validación completada con ${issues} problema${issues !== 1 ? "s" : ""}. Revisá el reporte detallado.`,

  // Security / Scanner
  securityClean: () =>
    "🛡️ Sin amenazas detectadas. El archivo parece seguro según el análisis estático y las firmas conocidas.",
  securityThreat: (name: string) =>
    `🚨 Amenaza confirmada: "${name}". Este archivo no debería estar en tu carpeta de mods.`,
  securityScanError: () =>
    "❌ El escáner falló durante el análisis. El archivo no fue verificado — tratalo como desconocido por precaución.",

  // Tweak / Options editor
  tweakSaved: () =>
    "💾 Ajustes guardados correctamente en el options.txt. Se aplicarán en el próximo inicio del juego.",
  tweakDraftSaved: () =>
    "📝 Borrador guardado localmente. Aún no se escribió en el options.txt.",
  tweakProfileInit: () =>
    "🆕 Perfil de ajustes inicializado desde los defaults de MIM.",
  tweakRestored: () =>
    "↩️ Backup original restaurado. El options.txt está como estaba antes de tocar nada.",
  tweakNoBackup: () =>
    "❌ No se encontró el backup original. Alguien lo borró o nunca se creó.",
  tweakSnapshotSaved: (id: string) =>
    `📸 Snapshot guardado con ID: ${id}. Podés restaurarlo cuando quieras.`,
  tweakSnapshotNotFound: () =>
    "❌ Snapshot no encontrado. Puede que ya fue eliminado o el ID no es válido.",
  tweakSnapshotApplied: (name: string) =>
    `✅ Snapshot "${name}" aplicado al juego. Se guardó un backup automático antes del cambio.`,
  tweakOrderFixed: () =>
    "🔧 Orden de resource packs corregido automáticamente según la configuración del proyecto.",
  tweakUnknownAction: () =>
    "❌ Acción no reconocida. Revisá el código — algo en el switch statement está roto o se llamó mal.",

  // Unclassify
  unclassifyDone: (file: string) =>
    `↩️ "${file}" devuelto a Downloads. Podés reclasificarlo cuando quieras.`,
  unclassifyFailed: () =>
    "❌ No se pudo devolver el archivo a Downloads. Revisá permisos o si el archivo sigue existiendo.",

  // Translation (web)
  translateDegraded: () =>
    "⚠️ El servicio de traducción está temporalmente saturado o bloqueado. Mostrando texto original en inglés.",
  translateRateLimited: () =>
    "🛑 Demasiadas peticiones de traducción seguidas. Esperá un minuto antes de seguir.",

  // Generic errors
  badRequest: (detail?: string) =>
    detail
      ? `❌ Bad request: ${detail}`
      : "❌ Bad request. El body llegó mal formado o le faltan campos.",
  notFound: (what?: string) =>
    what ? `❌ "${what}" no encontrado.` : "❌ No encontrado. Revisá que la ruta o el ID existan.",
  internalError: (context?: string) =>
    context
      ? `❌ Error interno en ${context}. Si se repite, revisá los logs del servidor.`
      : "❌ Error interno inesperado. Revisá los logs del servidor para más contexto.",
  noApiKey: (service: string) =>
    `🔑 API key de ${service} no configurada. Agregala en Ajustes → API Keys para activar esta función.`,
  upstreamError: (service: string, status: number) =>
    `🌐 ${service} respondió con error ${status}. Puede ser un problema temporal — intentá de nuevo en un momento.`,
};
