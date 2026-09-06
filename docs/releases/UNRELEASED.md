# Cambios Pendientes (Unreleased)

<!--
Anota aquí los cambios acumulados de PRs o commits.
Al ejecutar 'npm run release:auto', este contenido se trasladará automáticamente
a 'docs/releases/release-notes-vX.X.X.md' y a 'docs/releases/CHANGELOG.md'.
-->

### Planificación auditada y publicación manual por tag

- Reconciliados Who's Next y Unicorn con evidencia de código: los cierres anteriores quedan en el backlog histórico y los alcances incompletos permanecen pendientes.
- Incorporadas tareas de calidad de código, UI/E2E, onboarding, trazabilidad y rigor de evaluación SAGE/MimBot, con criterios de cierre. Son planificación, no nuevas capacidades entregadas.
- Corregida la selección de tag en la release manual de GitHub Actions: el tag solicitado fija checkout, notas y publicación; las entradas inválidas se rechazan antes de compilar. Agregada regresión local del bloque real de resolución y sus consumidores.
- Documentadas las fuentes que usa release:auto y la diferencia entre nombre visible de release, cuerpo editorial y descripción del repositorio.
