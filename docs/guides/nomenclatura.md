# Nomenclatura de MIM — Secciones y motores

> Glosario canónico de los nombres de secciones visibles en MIM Desktop y de los motores de dominio.  
> Última actualización: 2026-09-16

---

## Siglas con expansión explícita

| Nombre | Expansión | Qué hace en MIM |
| :--- | :--- | :--- |
| **SAGE** | **S**ystemic **A**utomated **G**uidance & **E**valuation | Diagnóstico forense de crashes, análisis de logs, rescate NBT y copiloto de remediación. Ver [sage.md](../engines/sage.md). |
| **FOMO** | **F**ound **O**ther **M**ods **O**bviously | Descubrimiento de mods, showcases, comunidad y sincronización cloud (FOMO Cloud). Ver [fomo.md](../engines/fomo.md). |

> **Nota:** *FOMO Cloud* es el nombre del producto social; la sigla **FOMO** refiere al módulo de descubrimiento (“encontrar otros mods”), no al meme de marketing *Fear Of Missing Out*.

---

## Nombres literales (no son acrónimos)

Estos labels usan la palabra en inglés tal cual; el significado es el nombre mismo:

| Nombre | Significado | Dónde aparece |
| :--- | :--- | :--- |
| **TWEAK** | Ajustes finos (*tweak*) del cliente de Minecraft sin abrir el juego: JVM, `options.txt`, resource packs, overrides. | Sidebar TWEAK, `components/tweak/`, `/api/tweak` |
| **GATE** | Compuerta (*gate*) de validación del modpack antes de compilar o jugar; en UI interna también **Pack Health**. | Botón GATE del header, `components/gate/`, `lib/modding/packValidator.ts` |
| **ALRT** | Alertas (*alert*, abreviado a 4 letras para el header). Centro de incidentes, updates y avisos del sistema. | Botón ALRT del header, `components/alerts/` |

---

## Relación con otros nombres del ecosistema

| Nombre | Tipo | Notas |
| :--- | :--- | :--- |
| **MIM** | Sigla | **M**inecraft **I**ntelligent **M**anager |
| **MIMU** | Modo | Modo usuario simplificado (*User Mode*) |
| **Aduana** | Metáfora | No es sigla: almacén/deduplicación de descargas por hash (CAS) |
| **NBT Rescue** | Nombre descriptivo | Recuperación binaria de inventarios y player `.dat` |

---

## Referencias cruzadas

- Arquitectura SAGE: [overview.md §3](../architecture/overview.md#3-pipeline-de-diagnóstico-sage-20)
- Manual maestro: [mim-core.md](../architecture/mim-core.md)
- Índice de motores: [engines/README.md](../engines/README.md)
