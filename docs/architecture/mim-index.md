# MIM Index — índice local único (`sinceramiento_01`)

> **Versión de plataforma:** 11.7.0  
> **Migración:** `sinceramiento_01`  
> **Estado:** Canónico a partir del primer arranque de v11.7.0

Este documento es la especificación del almacenamiento local de MIM: qué vive en el índice, qué es contenido del usuario, cómo se detectan raíces legacy y qué se borra al actualizar.

---

## 1. Diagnóstico (antes de v11.7.0)

MIM no tenía una sola raíz de datos. Settings, caches y metadatos se escribían en sitios distintos según el módulo:

| Raíz | Quién escribía | Problema |
| :--- | :--- | :--- |
| `getPortableDir()` → `%USERPROFILE%\.mim-index` o `D:\.MIM\source\.mim-index` | settings, staging, YouTube, player-rescue, Server Manager | Era la intención, pero no era exclusiva |
| `SOURCE_BASE/.mim-index` (`D:\.MIM\source` hardcoded) | collections, download-history, remote-cache, tweak | Independiente de Settings |
| `<cwd>/.mim-index` (repo) | SAGE `sage-cache.json`, semantic cache | Relativo al working directory |
| `<cwd>/lib/.mim-index` | VirusTotal `vt-cache.json` (path relativo a `lib/security`) | Path calculado con `__filename` |
| `sourceBase/.projects/<nombre>` | FOMO registry | El resto de la app usa `_projects/` |
| `staging/` y `player-rescue/` | `getSettings()` y GET de rescue | `mkdir` al leer, aunque estuvieran vacíos |

`SOURCE_BASE` en `lib/core/constants.ts` no leía Settings. Classify/library podían escribir en `D:\.MIM\source` mientras Tweak leía `settings.sourceBase`. Documentación aún mencionaba `D:\.mine\source` y un “vault” en `lib/.mim-index/vault` que **nunca existió en código**.

---

## 2. Contenido vs índice

Cuatro raíces de **contenido** (archivos del usuario / del juego). Siguen en Settings como hasta ahora:

| Campo | Función |
| :--- | :--- |
| `sourceBase` | Librería de mods y `_projects/<nombre>/` |
| `buildsBase` | Zips `alluser` / carpetas `allhost` |
| `minecraftPath` | Instalación del juego (MIMu) |
| `downloadsPath` | Descargas vigiladas por el watcher |

Una raíz de **índice** (estado de la app). First-class y configurable:

| Campo | Función |
| :--- | :--- |
| `mimIndexPath` | Único `.mim-index`: settings, secretos, caches, tweak, historial, staging por defecto |

Nunca se mezclan. Los JARs no entran al índice. El índice no vive dentro de `_projects`.

---

## 3. Layout canónico

Default seguro:

- Desktop empaquetado: `%USERPROFILE%\.mim-index` (Electron fija `MIM_PORTABLE_DIR`; no hay auto-switch a `D:`).
- Unpackaged / `next dev`: `MIM_PORTABLE_DIR` si existe; si no, `D:\.MIM\source\.mim-index` cuando esa carpeta source ya existe; si no, homedir.
- El valor persistido `mimIndexPath` en `mim-settings.json` gana sobre el bootstrap una vez leído.

```text
<mimIndexPath>/
  mim-settings.json
  mim-secrets.enc.json                 # solo Electron (safeStorage)
  .migrations/sinceramiento_01.json    # marker + reporte
  cache/
    sage-cache.json
    semantic-cache.json
    vt-cache.json
    remote-cache.json
    showcase_posts_v2_*.json           # YouTube (regenerable)
    fomo_modpack_dependencies_cache.json
  data/
    collections.json
    download-history.json
    whitelist.json
    showcase_channels.json
    showcase_usage.json
  tweak/
    snapshots/
    master_options.txt
    tweak_global_draft.json
  history/config/
  staging/                             # default; Settings puede overridear stagingPath
  player-rescue/                       # lazy: solo al escribir un .dat
  server-manager/
    snapshots/
    journal/
```

Contenido de proyecto:

```text
<sourceBase>/_projects/<nombre>/
  mods/{.essential,.local,.server}/<sub>/*.jar
  resourcepacks/  shaderpacks/  datapacks/  config/
  mim-project.json
  .fomo-registry.json
```

Reglas de creación:

- `mkdir` solo al **escribir** un archivo.
- Leer settings no crea `staging/` ni `player-rescue/`.
- Importar un route no crea el índice.

---

## 4. Detector (allowlist)

No hay scan recursivo del disco. Solo se inspeccionan rutas conocidas, y solo si **no** son el `mimIndexPath` canónico:

1. `%USERPROFILE%\.mim-index`
2. `D:\.MIM\source\.mim-index`
3. `settings.sourceBase/.mim-index`
4. `<cwd>/.mim-index`
5. `<cwd>/lib/.mim-index`
6. `<cwd>/mim-index` (sin punto)
7. `<cwd>/mim-settings.json` y `<cwd>/mim-collections.json`
8. `settings.sourceBase/.projects`
9. `staging/` y `player-rescue/` **vacíos** bajo cualquier índice legacy (y bajo el canónico, si quedaron vacíos)

Protegido (nunca `rm` de la raíz): `sourceBase`, `sourceBase/_projects`, `buildsBase`, `minecraftPath`, `downloadsPath`, el propio `mimIndexPath`.

---

## 5. Qué se copia y qué no

El canónico **gana**: si el destino ya tiene el archivo, no se pisa.

Se reubican (si el destino aún no los tiene):

- `mim-settings.json`, `mim-secrets.enc.json`
- `collections.json`, `download-history.json`, `whitelist.json`, canales/usage YouTube
- `tweak/` + `tweak_global_draft.json`, `history/config/`, `server-manager/`
- caches persistentes: `sage-cache.json`, `semantic-cache.json`, `vt-cache.json`, `remote-cache.json`
- `.fomo-registry.json` desde `.projects/<nombre>/` hacia `_projects/<nombre>/`

No se copian:

- caches YouTube/Bedrock vacíos o solo regenerables
- directorios vacíos
- `lib/.mim-index/vault` (nunca implementado)

Tras copiar, se eliminan las raíces allowlist que no son el índice canónico. Si `D:\.MIM\source` quedó **solo** con un `.mim-index` ya vaciado y **no** es `sourceBase`, se borra ese índice residual; no se borra un árbol de mods.

---

## 6. Marker

Ruta: `<mimIndexPath>/.migrations/sinceramiento_01.json`

```json
{
  "id": "sinceramiento_01",
  "ranAt": "2026-09-20T21:00:00.000Z",
  "dest": "C:\\Users\\…\\.mim-index",
  "migrated": [{ "from": "…", "to": "…" }],
  "deleted": ["…"],
  "skipped": [{ "path": "…", "reason": "canonical-wins" }]
}
```

Si el marker existe, la migración es no-op. `npm run sinceramiento -- --force` lo ignora.

---

## 7. Primera auto-update (v11.7.0)

`electron-updater` no ejecuta código hasta que el binario **nuevo** arranca.

1. MIM 11.6.0 (NSIS) consulta GitHub Releases.
2. El usuario instala 11.7.0 (`quitAndInstall`).
3. Electron `whenReady` resuelve el índice bootstrap (`MIM_PORTABLE_DIR`).
4. El proceso Next arranca; el primer `getSettings()` corre `sinceramiento_01` si no hay marker.
5. Portable y `next dev` usan el mismo hook: no dependen del updater.

El índice se puede cambiar después desde **Settings → Carpeta índice MIM**. El cambio mueve el árbol con `/api/settings/move-files`.

---

## 8. Código

| Módulo | Rol |
| :--- | :--- |
| `lib/core/mimIndex/layout.ts` | Layout cerrado y catálogo de reubicación |
| `lib/core/mimIndex/sinceramiento01.ts` | Detector, copia, borrado |
| `lib/core/mimIndex/runMigrations.ts` | Hook de boot + CLI |
| `lib/core/settings.ts` | `mimIndexPath`, `getMimIndexPath()`, sin mkdir de staging al leer |

`SOURCE_BASE` en `lib/core/constants.ts` es solo el default de plataforma. Las escrituras de contenido usan `getSourceBase()` (`settings.sourceBase`).
