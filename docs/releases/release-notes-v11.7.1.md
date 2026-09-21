# MIM v11.7.1 — Actualizador y dependencias de FOMO

**Fecha:** 2026-09-21  
**Estado:** Beta activa

## Cambios

- Corrige los nombres del instalador publicado para que coincidan con `latest.yml`. Evita el error 404 al descargar actualizaciones desde versiones anteriores.
- Valida nombres, tamaño, checksum SHA-512 y blockmap antes de publicar la release.
- Conserva el estado de descarga del actualizador al remontar la interfaz, muestra errores en el banner y permite reintentar.
- Agrega automáticamente las dependencias requeridas y transitivas al draft desde Modrinth y CurseForge, comprobando versión de Minecraft y loader antes de guardar.
- Permite abrir y buscar dependencias desde FOMO.
- Mejora la navegación de FOMO y evita que respuestas atrasadas reabran o cambien detalles de un proyecto.
- El diagnóstico del draft destaca la dependencia faltante y permite abrirla; los mods que la requieren aparecen como contexto.

## Prueba de actualización

Desde una instalación de **MIM Setup 11.7.0**, abrir MIM, pulsar **Descargar** en el banner y luego **Reiniciar e instalar**. La edición portable requiere actualización manual.

## Validación

Las pruebas de regresión cubren los nombres de assets, integridad del instalador, estado del actualizador y resolución de dependencias. El workflow verifica el instalador empaquetado antes de publicarlo. La actualización completa desde 11.7.0 queda pendiente de la prueba con la aplicación instalada.
