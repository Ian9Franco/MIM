# Sistema de Detección y Actualización de Mods vía Modrinth en MIM

Este documento define la estrategia para que Minecraft Intelligent Manager (MIM) pueda detectar automáticamente si un mod instalado tiene una versión más nueva disponible en Modrinth y permitir su actualización desde la interfaz.

La idea no es simplemente “buscar mods”, sino convertir MIM en el manager que mira tu carpeta `/mods`, te juzga silenciosamente por seguir usando versiones jurásicas, y te ofrece arreglarlo.

## 1. Objetivo
Permitir que MIM:
- Lea los `.jar` instalados de un proyecto.
- Identifique el mod real y su versión actual.
- Compare esa versión contra la última disponible en Modrinth.
- Determine si existe una actualización.
- Permita actualizar individualmente o en lote.

Esto debe funcionar sin depender del nombre manual del archivo (`sodium-fabric-1.20.1.jar`), porque confiar en nombres de archivos es como confiar en promesas de recruiter: mala idea. La fuente real debe ser el metadata interno del `.jar`.

## 2. Cómo Identificar un Mod Correctamente
### Problema
El nombre del archivo no siempre coincide con:
- El nombre del proyecto.
- El slug de Modrinth.
- La versión real instalada.

Ejemplo: `sodium-fabric-mc1.20.1-0.5.3.jar`. Eso no garantiza nada. Necesitamos leer el `.jar`.

## 3. Lectura Interna del JAR
Un `.jar` es básicamente un ZIP con ego. Dentro encontraremos archivos como:
- **Fabric:** `fabric.mod.json`
- **Forge / NeoForge:** `META-INF/mods.toml`
- **Quilt:** `quilt.mod.json`

## 4. Información que Debemos Extraer
Campos importantes:
- `mod id`
- `nombre del mod`
- `versión instalada`
- `loader`
- `dependencia opcional`
- `author` (si ayuda al matching)

**Ejemplo Fabric:** `{ "id": "sodium", "version": "0.5.3", "name": "Sodium" }`. Esto ya vale más que 40 nombres de archivo.

## 5. Problema Real: Modrinth no trabaja por mod_id
Y acá aparece el villano elegante. Modrinth usa `project_id` y `slug`, pero no expone búsqueda directa por `mod_id`. Entonces necesitamos una capa de resolución.

## 6. Sistema de Matching Inteligente
### Paso 1 — Buscar por nombre
Usamos `GET /search` con:
- Nombre del mod.
- Loader.
- Game version.

Ejemplo: `query=Sodium&facets=[["categories:fabric"],["versions:1.20.1"]]`

### Paso 2 — Validar coincidencia
No confiar en el primer resultado. Comparar:
- `title`
- `slug`
- `description`
- `categories`
- `author`
- Compatibilidad de loader.

Idealmente score interno: `matchScore = 0 → 100`.
Si `score > 85` → auto-match.
Si `score bajo` → pedir confirmación manual.
Porque instalar el mod equivocado es speedrun hacia romper el pack.

## 7. Guardar Relación Permanente
Una vez identificado (`localMod → modrinthProject`), guardar en base local:
```json
{
  "localPath": ".../mods/sodium.jar",
  "modId": "sodium",
  "installedVersion": "0.5.3",
  "projectId": "AANobbMI",
  "slug": "sodium",
  "lastChecked": "2026-05-03"
}
```
Esto evita repetir búsquedas futuras y evita que el backend se convierta en un hámster asmático.

## 8. Detección de Updates
Endpoint clave: `GET /project/{id}/version`
Filtrado por:
- `loader`
- `game_version`

Ejemplo: `/project/AANobbMI/version` con `{ "loaders": ["fabric"], "game_versions": ["1.20.1"] }`.

## 9. Comparación de Versiones
Comparar `installedVersion` vs `latestVersion`.
**No hacer:** `"10" > "2"` porque eso es crimen.
**Usar:** Semver parser + fallback inteligente si el mod usa versiones raras.
Ejemplo: `0.5.3 < 0.5.8` → update available.

## 10. UI de Estado
Cada mod debería mostrar su estado posible:
- **Updated** 🟢
- **Update Available** 🟡
- **Unknown Match** ⚪
- **Deprecated**
- **Unsupported Source** 🔴
- **Manual Check Required**

Sin drama, pero con claridad.

## 11. Sistema de Update
Botón `Update Mod` o `Update All`.
Flujo:
1. Obtener latest version.
2. Descargar `.jar`.
3. Mover a `/Downloads`.
4. El watcher detecta nuevo archivo.
5. Reemplazo controlado.
6. Backup opcional del anterior.

Nada de “rezá y reemplazá”. Somos civilizados.

## 12. Endpoint Backend Necesario
Nuevo endpoint: `/api/modrinth/check-update`
Responsabilidad:
- Recibir metadata local.
- Resolver project.
- Consultar versiones.
- Responder estado.

Respuesta:
```json
{
  "hasUpdate": true,
  "installedVersion": "0.5.3",
  "latestVersion": "0.5.8",
  "downloadUrl": "...",
  "projectId": "AANobbMI"
}
```

## 13. Cache Inteligente
No consultar Modrinth cada 3 segundos como un desesperado emocional.
Cache sugerido: 12h / 24h por mod. Con invalidación manual: `Check Updates Now`.

## 14. Casos Especiales
Mods fuera de Modrinth (CurseForge only, GitHub releases, mods privados).
Estado: `Unsupported Source`. No inventamos magia. Todavía.

## 15. Próximos Pasos
- [ ] Implementar parser de `.jar`.
- [ ] Extraer metadata interna.
- [ ] Crear sistema de matching con Modrinth.
- [ ] Persistir relación local → `project_id`.
- [ ] Implementar check de updates.
- [ ] Crear UI de estado.
- [ ] Implementar Update One / Update All.
- [ ] Agregar sistema de backup.
- [ ] Cache + invalidación manual.

---

### Resumen Ejecutivo
La lógica correcta no es buscar nombre archivo. La lógica correcta es:
**leer mod real** → **identificar proyecto** → **persistir relación** → **comparar versiones** → **actualizar inteligentemente**.

Porque si vas a hacer un mod manager serio, hacelo bien. No como esos launchers que parecen hechos por una papa con ansiedad.