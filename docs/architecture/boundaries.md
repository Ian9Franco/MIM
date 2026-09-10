# MIM Architecture Boundaries

Estas fronteras se aplican automáticamente con `npm run lint:architecture` y CI. Su objetivo es impedir que las capas internas de MIM pierdan separación con el tiempo.

## Reglas aplicadas

### Los motores core no dependen de UI

Los archivos bajo:

- `lib/modding/`
- `lib/intelligence/`
- `lib/security/`

no pueden importar desde:

- `app/`
- `components/`
- `web/`
- `standalone/`

El flujo de dependencias es deliberadamente unidireccional: UI y runtime pueden consumir los motores core, pero los motores deben seguir siendo testeables y reutilizables sin depender de UI.

### Web no depende del runtime Desktop

Los archivos bajo `web/` no pueden importar desde `standalone/`.

El comportamiento exclusivo de Desktop debe exponerse mediante un contrato compartido o un adaptador específico de plataforma, no importarse directamente dentro de MIMweb.

## Qué detecta el verificador

El verificador usa la API del compilador de TypeScript y revisa:

- imports estáticos;
- `export ... from`;
- `import()` dinámicos;
- llamadas CommonJS `require()`;
- alias `@/`;
- imports relativos dentro del repositorio.

Los imports de paquetes externos se ignoran porque no pertenecen al grafo interno de capas de MIM.

## Modificar una frontera

No se debe esquivar el verificador mediante strings construidos, indirecciones o rutas generadas. Si una frontera deja de ser correcta, la regla debe cambiarse explícitamente y sus tests de contrato deben actualizarse en el mismo PR con una razón arquitectónica concreta.
