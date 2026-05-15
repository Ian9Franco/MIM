# Arquitectura del Sistema Tweak (MIM)

Tweak es el centro de personalización del juego para el usuario final. Su objetivo es desacoplar la configuración personal del jugador del contenido del modpack, permitiendo una gestión fluida de la experiencia de juego.

## 1. Visión y Propósito
Tweak debe funcionar de manera **autónoma e indiferente** al proyecto activo. Mientras que el resto de MIM gestiona *qué mods* hay, Tweak gestiona *cómo se siente* el juego.

### Pilares Fundamentales:
- **Independencia**: No requiere un proyecto seleccionado para funcionar. Apunta directamente a la ruta global del juego (`minecraftPath`).
- **Inmutabilidad de Base**: El archivo `options.txt` original se guarda en la "Cámara de Seguridad" de MIM.
- **Gestión de Perfiles (Combos)**: Capacidad de guardar y cargar configuraciones completas (Texturas + Keybinds).
- **Seguridad**: Siempre se genera un backup antes de aplicar cambios.

## 2. Flujo de Datos y Archivos

### El "Círculo de Confianza" de Archivos:
1. **Original (`options.txt`)**: El archivo que está actualmente en la carpeta del juego.
2. **Base (Backup Maestro)**: Copia de seguridad inalterada guardada en `MIM/core/tweak/master_options.txt`.
3. **Perfiles (Combos)**: Archivos JSON en `MIM/core/tweak/profiles/*.json`.
4. **Draft (Borrador)**: Cambios en tiempo real en la UI que aún no se han aplicado al juego. **Debe ser persistente (Cacheable)**: si se cierra la app, al volver a entrar el borrador debe estar ahí (usando `localStorage` o base de datos interna).

### Proceso de Aplicación:
Cuando el usuario pulsa "Aplicar":
`MIM Draft` -> `Validación de Sintaxis & Dependencias` -> `Reemplazo de options.txt` -> `Notificación de éxito`.

## 3. Características Detalladas

### A. Resource Pack Manager (Gestor de Texturas)
- **Ordenación Visual**: Drag-and-drop para priorizar packs.
- **Sugerencias Inteligentes (Pack Intelligence)**:
    - **Validación de Capas**: Detección automática de dependencias (ej. *Fresh Animations: Player Extension* arriba de *Fresh Animations*).
    - **Requerimientos de Mods**: Consultar con **FOMO** si el pack requiere mods específicos (ej. *Fresh Moves* requiere EMF/ETF). Si no están, avisar al usuario.
    - **Lógica de Algoritmo**: Aplicar reglas de "Abajo hacia Arriba" (Base -> Parches -> Extensiones -> Overlays).
- **Combos**: Guardar "Estética Medieval" (Pack X + Shader Y) y cambiarlo con un click.

### B. Keybind Manager (Mapeo de Teclas)
- **Buscador**: Encontrar teclas por nombre de mod o acción.
- **Resolución Inteligente de Conflictos**:
    - **Algoritmo de Prioridad**: El sistema identifica la función de la tecla (Combate, Movimiento, UI).
    - **Sugerencias Automáticas**: Si *Irons Spellbook* y *Terramity* chocan en la tecla `X`, el sistema sugiere priorizar el hechizo sobre la habilidad según su relevancia en el gameplay.
- **Bloqueo de Teclas**: Evitar que el juego cambie teclas críticas.

### C. Sistema de Snapshots (Perfiles)
Un snapshot en Tweak ya no es solo una copia del proyecto, es un **Combo de Configuración** que incluye:
- `options.txt` (parcial o total)
- `servers.dat` (opcional, para mantener servidores favoritos)
- Lista de packs activados.

## 4. Estado de Implementación

- [x] **Desacoplamiento del API**: Completado. Soporta modo Standalone.
- [x] **Módulo de Backup Maestro**: Implementado en `.mim-index/tweak/master_options.txt`.
- [x] **Draft Persistente**: Implementado (Cacheable global/por proyecto).
- [x] **Pack Intelligence**: Conexión con FOMO y validación de dependencias (EMF/ETF).
- [x] **Keybind Intelligence**: Algoritmo de priorización por categorías de mod.
- [x] **Estrategia de Sincronización**: Lógica de detección de cambios externos (Juego -> MIM).
- [x] **UI de Sugerencias**: Implementado (Heatmap y Recomendaciones inteligentes).
- [x] **Bloqueo de Teclas**: Icono de candado y protección en API implementados.

## 5. Estrategia de Sincronización y Conflictos

Para evitar que los cambios realizados directamente dentro del juego se pierdan o entren en conflicto con MIM:

1. **Detección de Cambio Externo**: MIM comparará el `mtime` (fecha de modificación) de `options.txt` al abrir el panel. Si el archivo es más reciente que el último "Save" de MIM, se notificará al usuario.
2. **Importación Forzada (Sync from Game)**: El usuario podrá elegir importar los ajustes actuales del juego hacia su borrador en MIM, ignorando el caché actual.
3. **Snapshots de Rescate**: Antes de que MIM sobreescriba el `options.txt` al pulsar "Aplicar", se generará un snapshot oculto de "Rescate" por si el usuario necesita recuperar ajustes manuales previos.
