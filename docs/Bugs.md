# Registro de Bugs y Problemas de Lógica - MIM

Este documento centraliza los comportamientos inesperados o fallos en la lógica de negocio detectados durante el desarrollo.

## 1. Visibilidad de Mods en Proyectos Nuevos (Aislamiento vs. Global)
- **Estado**: Resuelto (vía Transferencia Local)
- **Descripción**: Al crear un proyecto nuevo (ej: "test"), este aparecía vacío a pesar de que la carpeta global de la versión/loader (ej: `1.20.1/forge`) tuviera mods.
- **Causa**: El sistema de aislamiento busca estrictamente en `_projects/[nombre]/mods`. Al ser un proyecto nuevo, esa carpeta está vacía.
- **Solución Implementada**: Se añadió el sistema de **Transferencia Local / Importación**, permitiendo al usuario clonar mods desde la "Librería Global" hacia el proyecto de forma instantánea.

## 2. Falsos Positivos de Incompatibilidad (Versión/Loader)
- **Estado**: Parcialmente Resuelto (vía Excepción Lógica)
- **Descripción**: Algunos mods para **1.20.1 Forge/NeoForge** aparecían marcados como incompatibles entre sí.
- **Solución Implementada**: Se añadió una excepción específica para la versión **1.20.1** que trata Forge y NeoForge como compatibles en la lógica de validación de `ModCard` y `QuickCategorize`.
- **Pendiente**: Implementar un sistema de comparación SemVer para rangos (ej: `[1.21, 1.22)`) para evitar otros falsos positivos.

## 3. Persistencia de Caché de Metadatos
- **Estado**: Estable
- **Descripción**: Verificar si los cambios manuales en los archivos JAR se reflejan inmediatamente o si el `mod-cache.json` ignora actualizaciones de archivos con el mismo nombre pero distinto contenido (aunque se usa `mtimeMs` para mitigar esto).

## 4. Errores de Referencia y Declaración (Fixes Rápidos)
- **Estado**: Resuelto
- **Descripción**: Errores de `ConfirmModal is not defined` y `Cannot find name 'useRef'` en `app/page.tsx`.
- **Causa**: Falta de imports tras refactorizaciones de componentes y lógica de auto-clasificación.
- **Solución**: Se añadieron los imports correspondientes de React y de la carpeta de componentes UI.
