# 🧠 Motores de Dominio (Engines)

> **¿Qué es esta carpeta?**  
> Contiene las especificaciones técnicas y benchmarks de los **motores especializados de MIM**. Cada motor resuelve un problema complejo de modding con algoritmos deterministas y garantías formales.

---

## ⚙️ Catálogo de Motores

| Motor | Archivo | ¿Qué problema resuelve? |
| :--- | :--- | :--- |
| 🩺 **SAGE** | **[sage.md](./sage.md)** | **Diagnóstico de Crashes:** Analizador forense de logs de Minecraft (Forge, Fabric, NeoForge, Quilt). Identifica culpables, mixin conflicts y dependencias rotas sin alucinaciones. |
| 📊 **SAGE Eval** | **[sage-eval.md](./sage-eval.md)** | **Benchmark Cuantitativo:** Evaluación medida sobre dataset de 125 crashes reales (100% Macro F1, 84% Top-1, 0.05ms latencia). |
| 📦 **NBT Rescue** | **[nbt-rescue.md](./nbt-rescue.md)** | **Recuperación Binaria:** Parser NBT puro (v19133 gzip) para reparar inventarios corruptos con invariante de *Zero Data Loss* (`.mim_bak`). |
| 🛂 **Aduana** | **[aduana.md](./aduana.md)** | **Almacenamiento CAS & Deduplicación:** Content-Addressed Storage con hashing ultrarrápido (>2.0 GB/s) y speedup 8x de caché. |
| 🌟 **FOMO** | **[fomo.md](./fomo.md)** | **Catálogo & Media:** Motor de descubrimiento de mods, gestión de dependencias, drafts comunitarios y pipeline de YouTube/yt-dlp. |
