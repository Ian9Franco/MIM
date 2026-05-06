# Registro de Bugs y Problemas de Lógica - MIM

Este documento centraliza los comportamientos inesperados o fallos en la lógica de negocio detectados durante el desarrollo.

## 1. Visibilidad de Mods en Proyectos Nuevos (Aislamiento vs. Global)
- **Estado**: Resuelto (vía Transferencia Local)
- **Descripción**: Al crear un proyecto nuevo (ej: "test"), este aparecía vacío a pesar de que la carpeta global de la versión/loader (ej: `1.20.1/forge`) tuviera mods.
- **Causa**: El sistema de aislamiento busca estrictamente en `_projects/[nombre]/mods`. Al ser un proyecto nuevo, esa carpeta está vacía.
- **Solución Implementada**: Se añadió el sistema de **Transferencia Local / Importación**, permitiendo al usuario clonar mods desde la "Librería Global" hacia el proyecto de forma instantánea.

## 2. Falsos Positivos de Incompatibilidad (Versión/Loader)
- **Estado**: En Investigación
- **Descripción**: Algunos mods para **1.21.1 NeoForge** aparecen marcados como incompatibles (en rojo) a pesar de ser la versión correcta.
- **Observaciones**:
    - Ya ocurrió anteriormente con Forge y versiones como "1.20+" que no se reconocían para "1.20.1".
    - El escáner de metadatos (`mods.toml` / `neoforge.mods.toml`) podría estar leyendo mal los rangos de versión (ej: `[1.21, 1.22)`) o los IDs del loader.
    - Se necesita una lógica de comparación de versiones más robusta que soporte rangos de SemVer y no solo comparaciones exactas de strings.

## 3. Persistencia de Caché de Metadatos
- **Estado**: Estable
- **Descripción**: Verificar si los cambios manuales en los archivos JAR se reflejan inmediatamente o si el `mod-cache.json` ignora actualizaciones de archivos con el mismo nombre pero distinto contenido (aunque se usa `mtimeMs` para mitigar esto).
