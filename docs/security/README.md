# 🛡️ Seguridad, Threat Model & Secretos

> **¿Qué es esta carpeta?**  
> Documenta las defensas y mitigaciones de seguridad de MIM: cómo protegemos a los usuarios de mods maliciosos (Fracturiser, stealers), cómo blindamos la API web pública y cómo custodiamos secretos y API keys.

---

## 🔒 Documentos de Seguridad

| Archivo | ¿De qué se encarga? |
| :--- | :--- |
| **[bytecode-scanner.md](./bytecode-scanner.md)** 🔍 | **Análisis Estático de JARs:** Inspección de clases Java sin ejecución para detectar IOCs, reflection sospechosa y firmas maliciosas. |
| **[threat-model.md](./threat-model.md)** 🎯 | **Modelo de Amenazas STRIDE:** Análisis formal de vectores de ataque mitigados, superficies expuestas y base de firmas (19 IOCs de Fracturiser/Necro). |
| **[secrets.md](./secrets.md)** 🔑 | **Gestión de Claves:** Persistencia cifrada en Electron mediante `safeStorage` del sistema operativo (Windows DPAPI) y aislamiento de tokens. |
| **[web-hardening.md](./web-hardening.md)** 🌐 | **Hardening Web:** Blindaje del perímetro edge en MIMweb (`withApiGuard`), rate limiting por IP, cabeceras de seguridad y RLS de Supabase. |
