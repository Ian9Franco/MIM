# Arquitectura MIM

Este documento define la estructura de la carpeta source y el almacén inteligente, basada en categorías estrictas.

## Estructura de Directorios (Source)
El núcleo del sistema es la carpeta source, donde los archivos se almacenan de forma ultra-categorizada.

```
D:\.mine\
├── manager\                # Código fuente de la aplicación (Next.js)
├── assets\                 # Archivos indiferentes de versión
│   ├── shaders\            
│   └── schematics\         
└── source\                 # Almacén categorizado por versión
    └── [Versión]\          # Ej: 1.20.1 / 1.21.1
        ├── common\         
        ├── forge\          
        │   ├── .local\
        │   ├── .server\
        │   └── .essential\
        ├── neoforge\       
        └── fabric\         
```

## Categorización Interna
- **.local (Localside):** animaciones, sonidos, rendimiento, qol, particulas.
- **.server (Serverside):** estructuras, qol, rendimiento, terreno.
- **.essential (Core):** fauna, hostiles, estructuras y mazmorras, arsenal, bosses, vanilla + & qol, dimensiones, progreso y rpg, comidas, librerias, tecnologia, combate avanzado.

## Proceso de Build
- **alluser:** Genera un `.zip` para clientes → `builds/[projectName]_alluser.zip`. Incluye `.essential`, `.local`, `common/resourcepacks` y `assets/shaders`. ✅ Implementado.
- **allhost:** Genera carpeta lista para servidor → `builds/[projectName]_allhost/`. Incluye `.essential`, `.server` y `common/datapacks`. ✅ Implementado.

## Nota sobre Source compartido
`source/` es un **almacén único** por versión+loader. Si dos proyectos usan `1.20.1/forge`, comparten el mismo pool de mods — eso es intencional (sin duplicar archivos en disco). El `projectName` diferencia los outputs en `builds/`. Si en el futuro se necesita aislamiento de mods por proyecto, se implementará un sistema de manifiestos.

