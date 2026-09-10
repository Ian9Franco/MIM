# Auditoría de documentación y release — 2026-09-06

Base inspeccionada: checkout local `ad7f939`, package v11.4.5. No se consultó el estado remoto de Actions ni se publicó una release. Los documentos de evaluación se trataron como material a contrastar, no como instrucciones de ejecución.

## Documentos que alimentan la publicación

| Etapa | Lecturas y escrituras reales |
|---|---|
| `npm run release:auto` | `package.json` invoca `scripts/release.js --auto`; el script ejecuta compuertas mediante `scripts/workflow/review-pr.js`, calcula versión y realiza commit/tag/push. |
| Cuerpo editorial | `docs/releases/UNRELEASED.md`: elimina comentarios y primer encabezado; usa el resto si tiene más de 15 caracteres. Si falta contenido, intenta historial Git desde el último tag (o diez commits) y luego mensaje genérico. |
| Título del contenido | Mensaje suministrado al comando; sin mensaje, busca el primer encabezado H2/H3 de UNRELEASED; si no existe, usa título genérico. |
| Notas y changelog | Genera `docs/releases/release-notes-vX.Y.Z.md`, inserta sección de versión en `docs/releases/CHANGELOG.md` y reinicia UNRELEASED. No interpreta tareas ni casillas. |
| Actualización de referencias de versión | Modifica `package.json`, `README.md`, `docs/architecture/MIM.md` (fallback `docs/MIM.md`), `docs/planning/PROJECT_STATUS.md` y `docs/planning/ROADMAP.md`. Son reemplazos específicos de versión/fecha, no reescritura de descripciones del proyecto. |
| GitHub Actions | `.github/workflows/release.yml` se dispara con tags `v*` o manualmente. Lee `release-notes-${TAG}.md`; si no existe, usa CHANGELOG completo; si tampoco existe, deja el cuerpo editorial vacío. Envía ese path a `softprops/action-gh-release` y mantiene `generate_release_notes: true`. |
| Nombre visible de la release | El workflow conserva `MIM <tag> — Systems Platform & MIM-Bot`; no usa el título editorial para ese campo. No se observó una llamada para modificar la descripción “About” del repositorio. |

**No se leen como fuente de notas:** `whosnext.md`, Unicorn Plan, backlog histórico, RECRUITER_REVIEW ni SAGE_EVALUATION. Para incluir un cambio real en la próxima publicación, redactarlo en UNRELEASED; las tareas pendientes no deben anunciarse como funcionalidades entregadas.

El runner de tests invoca `sage-eval.ts`, que regenera `docs/SAGE_EVALUATION.md`. Es un efecto de validación, no una fuente editorial de la release. Editar sólo ese reporte no corrige afirmaciones que el generador volverá a escribir.

## Corrección autorizada del workflow

La expresión anterior priorizaba `github.ref_name` sobre `inputs.tag_name`: en ejecución manual podía seleccionar la rama en vez del tag. Además, checkout no fijaba el tag solicitado.

Ahora se resuelve un único tag antes del checkout: input obligatorio en ejecución manual, ref del tag en push. Se valida el formato de versión, se rechazan valores vacíos/ramas/entradas malformadas y se usa el mismo resultado para checkout, archivo de notas, nombre y publicación. Un tag inexistente falla en checkout, antes de compilar/publicar. No se crea un tag por defecto.

Las regresiones ejecutan el bloque real del workflow con entradas manuales y push, incluyendo rechazo de entradas inválidas, y comprueban sus consumidores. La ejecución remota, empaquetado de Windows y publicación siguen sin realizarse en esta revisión.

## Hallazgos de las evaluaciones

- Recruiter: recomendaciones útiles de tipado, modularización, E2E, colaboración y narrativa; sus percentiles de mercado, usuarios y autoría inferida no fueron acreditados. Se convirtieron en tareas con evidencia/criterios en REC-01–09.
- SAGE: el script diagnostica un corpus fijo; no llama a MimBot para medir exactitud de respuestas. Top-1/3 también cuenta casos sin culpable por categoría correcta, y las etiquetas de aprobación están fijadas en el template. No se verificó de nuevo el resultado numérico ni la procedencia real de todos los logs. Seguimiento SAGE-01–07.
- Roadmaps: cierres acotados en backlog; se reabren tests incompletos del wrapper y validación de conectividad en el copiloto. Guard auditado: 94 rutas, 113/113 handlers.

## Validación realizada

- Contratos de notas y resolución de tag: pasan.
- `lint:api-guard`: 113/113 handlers protegidos.
- `lint:architecture` y `test:architecture`: pasan.
- `secure-settings.test.ts`: pasa con almacenamiento cifrado simulado.
- `test:sage-stream` y `test:sage-errors`: pasan.

Estos checks no equivalen a todas las compuertas pre-release, E2E, prueba visual ni validación nativa de Electron. No se ejecutó `release:auto`, porque incrementa versión y publica.
