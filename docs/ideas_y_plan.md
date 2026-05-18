# Ideas y Plan de Ejecución

Documento generado a partir de las ideas listadas en `ideas.txt` para la gestión y mejora de la aplicación.

## 💡 Ideas Relevadas

### 1. Explorador de Configuraciones de Minecraft (Completado)
- **Descripción**: Crear un sistema para visualizar y editar archivos de configuración (`.minecraft\config`). 
- **Detalles**: Podría integrarse dentro de la sección **Tweak** para centralizar las modificaciones.

### 2. Generación de `modlist.html` (Completado)
- **Descripción**: Implementar la generación automática de un archivo `modlist.html` para ambos entornos (**host** y **user**).

### 3. Jerarquía de Resourcepacks en Tweaks (Completado)
- **Descripción**: Mejorar la visualización y el manejo de la jerarquía (orden de prioridad) de los resourcepacks en la sección **Tweaks**.

### 4. Sistema de Onboarding / Guía de Uso
- **Descripción**: Añadir una guía interactiva al iniciar la app por primera vez ("for dummies").
- **Detalles**: Al entrar en secciones como `fomo`, `tweak`, `alrt`, `source` o `gate`, se debería activar una guía específica que explique qué hace cada botón y para qué sirve la sección.

### 5. Preview de Entornos en Library Source (Completado)
- **Descripción**: Permitir visualizar una previsualización (preview) de cómo quedarían los entornos `allhost` y `alluser` dentro de la librería source.

### 6. Monitoreo de VirusTotal en ALRT (Completado)
- **Descripción**: Mientras VirusTotal está en estado "Verificando reputación..." en cola desde el background, permitir ver ese estado en la sección `alrt` y recibir una notificación cuando complete.

### 7. Detección Inteligente de Actualizaciones (Completado)
- **Descripción**: Considerar un proyecto o autor seguido como "actualizado" o "nuevo" si la fecha de actualización o lanzamiento es menor a 15 días respecto a la fecha actual.

### 8. Integración de Seguidos en ALRT (Completado)
- **Descripción**: Hacer que la sección `alrt` consulte los autores/proyectos seguidos en `fomo`. Si se detecta una actualización o nuevo proyecto, debe figurar en el estado de `alrt`.

---

## 📅 Plan de Ejecución Propuesto

Para abordar estas ideas de manera eficiente, se propone dividirlas en 4 fases basadas en prioridad, complejidad y dependencias del sistema.

### Fase 1: Lógica y Mejoras Rápidas (Quick Wins)  (Completado)
*Estas tareas tienen baja complejidad y mejoran la experiencia de usuario inmediatamente.*

1. **Implementar Idea 7 (Detección de Actualizaciones)**: ✅ **Completado**
   - Modificar la lógica de visualización de proyectos para calcular la diferencia de días (<= 15).
   - Añadir un badge de "Nuevo" o "Actualizado" visualmente llamativo.
2. **Implementar Idea 3 (Jerarquía de Resourcepacks)**: ✅ **Completado**
   - Revisar el componente actual en Tweaks.
   - Asegurar que el drag-and-drop o las flechas de prioridad funcionen correctamente y reflejen el orden real.

### Fase 2: Integración entre Módulos
*Conectar sistemas existentes para mejorar el flujo de información.*

1. **Implementar Idea 8 (Seguidos en ALRT)**: ✅ **Completado**
   - Crear un servicio o hook que comparta el estado de "seguidos" de FOMO con ALRT.
   - Generar entradas en ALRT cuando se cumpla la condición de la Idea 7.
2. **Implementar Idea 6 (Estado de VirusTotal en ALRT)**: ✅ **Completado**
   - Conectar el evento de finalización o progreso de VirusTotal con el sistema de notificaciones de ALRT.

### Fase 3: Generación de Contenido y Previews
*Funcionalidades que requieren procesamiento de datos y renderizado específico.*

1. **Implementar Idea 2 (Generación de `modlist.html`)**: ✅ **Completado**
   - Crear un template HTML limpio (estilo brutalista o acorde a la app).
   - Exportar la lista de mods activos de host y user.
2. **Implementar Idea 5 (Preview de Entornos)**: ✅ **Completado**
   - Crear un estado "mock" o proyectado de cómo se vería la lista de mods combinada.

### Fase 4: Funcionalidades Complejas / UX Avanzada
*Requieren desarrollo de UI compleja o acceso a File System delicado.*

1. **Implementar Idea 1 (Explorador de Config)**: ✅ **Completado**
   - Desarrollar un árbol de archivos para leer `AppData\Roaming\.minecraft\config`.
   - Integrar un editor de texto simple (o usar Monaco Editor / similar si aplica).
2. **Implementar Idea 4 (Guía de Uso / Onboarding)**:
   - Implementar una librería de tours (como `driver.js` o similar) o componentes propios.
   - Configurar los triggers para el primer inicio y por sección.




REEMPLZAR TODA LA MEMORIA LOCALSTORAGE POR IndexedDB
