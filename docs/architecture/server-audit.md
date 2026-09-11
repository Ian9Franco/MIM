# Auditoría de mods de servidor — primera entrega

## Alcance y decisión

`/servers` en MIM Desktop conecta por SSH/SFTP y compara los JAR de `mods/` con el último build `<proyecto>_allhost/mods/`. No ejecuta el builder: el usuario debe generar previamente ese build. Su selección de versión/loader describe el runtime remoto; no se certifica leyendo dependencias de los JAR.

El transporte real vive en `lib/server/transport/`, separado de discovery/diff en `packages/server-engine`. Solo expone lectura/listado. Se reutilizan scanner, validator y componentes de comparación. Las credenciales se usan en una única petición, no se guardan y se limpian del formulario después de enviarlas. `server.properties` no se lee en este recorrido.

## Garantías verificables

- La huella `SHA256:…` del host SSH es obligatoria y debe obtenerse por un canal confiable (administrador/panel de hosting). No se autoacepta una clave desconocida.
- Rutas canónicas confinadas a la raíz elegida, incluyendo enlaces que apuntan fuera de ella.
- Una auditoría concurrente por proceso; 90 segundos globales; hasta 64 MiB por archivo y 512 MiB recibidos por conexión. Los archivos ZIP/JAR tienen además límites de expansión y entradas antes del scanner.
- Lecturas fallidas o metadata incompleta producen `isPartialAudit` y `report: null`. Nunca se certifican faltantes sobre un inventario parcial.
- El endpoint requiere runtime Desktop local (o desarrollo), origen local coincidente y schema Zod; no está disponible en Hub. Electron habilita `MIM_DESKTOP_RUNTIME=1` en su backend local.
- Los requisitos de plataforma (Minecraft, Java y el loader seleccionado) no se presentan como mods descargables faltantes. Esto no valida sus rangos de versión.

## Reproducir sin contratar un servidor

1. Ejecutar `npm run dev:server-fixture`.
2. Abrir `http://127.0.0.1:3101/servers`.
3. Crear un proyecto `Fixture`, Minecraft `1.20.1`, loader `fabric` desde la pantalla principal. El build AllHost de prueba ya está preparado en un directorio temporal.
4. Consultar `.server-fixture.json` para host, puerto, usuario, contraseña de prueba y huella. Usar raíz `/server`, runtime `1.20.1`/`fabric`.
5. Auditar. El resultado esperado es un mod faltante y otro con versión distinta.
6. En la terminal de la fixture, usar `denied`, `disconnect` o `stall` para provocar fallos, y `none` para restaurar la lectura. Reingresar la contraseña al repetir. `quit` cierra los procesos y elimina los archivos temporales.

La fixture tiene una clave de host efímera y credenciales exclusivas de prueba; no modifica proyectos ni servidores reales. La UI también puede verificarse con una cuenta SFTP propia de solo lectura.

## Pruebas y límites

`npm run test:server` incluye `server-sftp-integration.test.ts`: habla protocolo SSH/SFTP real sobre loopback, comprueba diferencias, huellas, permisos, rutas, desconexión, cancelación, redacción y cero operaciones de escritura. También ejecuta el handler HTTP para verificar el origen local normalizado.

Se verificó el formulario contra esa fixture en navegador (Desktop y viewport móvil), incluyendo respuesta HTTP y limpieza de contraseña. No equivale a validar un hosting externo ni el ejecutable Electron empaquetado.

Pendiente: integración de configs/mundos, persistencia durable, control del proceso remoto, recuperación tras reinicio del Desktop, pruebas con proveedores SFTP y packaging Windows. La existencia de los módulos SRV-3–SRV-7 no cierra esas entregas.

## Aplicar el plan (SRV-4)

Después de una auditoría **completa** (no parcial) con diferencias y sin bloqueos de revisión manual, `/servers` permite aplicar el plan. La API `POST /api/server/deploy` vuelve a descubrir el estado remoto, rechaza inventarios incompletos y ejecuta `executeServerDeployment` con transporte SFTP escribible.

Reproducción con la fixture: mismos pasos de auditoría; en la UI usar **Revisar y aplicar…**, marcar la confirmación y aplicar. El resultado esperado es instalar `missing` y reemplazar `example`. Las credenciales siguen sin persistirse: se reutilizan solo en memoria para esa sesión.
