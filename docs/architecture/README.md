# 🏛️ Arquitectura & Límites del Sistema

> **¿Qué es esta carpeta?**  
> Explica la ingeniería profunda de MIM: cómo interactúan los procesos de Electron y Next.js, cómo viajan los datos entre componentes y motores, y qué reglas de importación mantienen el código limpio.

---

## 🧭 Mapa de Arquitectura

| Archivo | Contenido |
| :--- | :--- |
| **[overview.md](./overview.md)** 🗺️ | **Topología y Motores:** Vista panorámica de los 7 dominios desacoplados en `lib/` y el bus reactivo (`MimEventMap`). |
| **[mim-core.md](./mim-core.md)** 📘 | **Manual Maestro de MIM:** Especificación integral de ciclo de vida, carpetas, frontend, backend y standalone. |
| **[boundaries.md](./boundaries.md)** 🛡️ | **Fronteras de Código:** Reglas de importación unidireccional forzadas por CI (`lint:architecture`). |
| **[api-catalog.md](./api-catalog.md)** 🔌 | **Catálogo de Endpoints:** Referencia de rutas HTTP en `app/api/` con sus métodos, parámetros y respuestas. |
| **[distributed-sync.md](./distributed-sync.md)** 🔄 | **Sistemas Distribuidos:** Modelo Offline-First, sincronización Last-Write-Wins (LWW) y Supabase. |
| **[server-manager.md](./server-manager.md)** 🖥️ | **Server Manager Foundation:** Contratos SFTP, preflight, snapshots inmutables y reconciliación remota. |
| **[server-audit.md](./server-audit.md)** 🔍 | **Auditoría de Servidores:** Guía paso a paso del protocolo de escaneo SFTP de solo lectura. |
| **[systems-summary.md](./systems-summary.md)** 📊 | **Ficha Ejecutiva:** Latencias, consumo de memoria y métricas de rendimiento por subsistema. |
| **[monorepo-inventory.md](./monorepo-inventory.md)** 📦 | **Inventario del Monorepo:** Análisis de grafo de dependencias y desacoplamiento de packages. |
