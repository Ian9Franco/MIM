# 🛠️ Smart Config Management

MIM ahora soporta una gestión inteligente de archivos de configuración separando lo que va al cliente y lo que va al servidor de forma automática durante la exportación.

## Estructura de Carpetas

Dentro de la carpeta `config/` de tu proyecto, puedes organizar los archivos de la siguiente manera:

```text
_projects/[Nombre]/config/
├── common_config.toml       <-- Se copia a AMBOS (User y Host)
├── global-settings.json     <-- Se copia a AMBOS
├── .user/                   <-- Solo para ALLUSER (Cliente)
│   └── client-only.cfg
└── .host/                   <-- Solo para ALLHOST (Servidor)
    └── server-tuning.properties
```

## Reglas de Funcionamiento

1. **Archivos Raíz**: Cualquier archivo o carpeta en la raíz de `config/` (que no empiece por `.`) se considera **común** y se incluirá en ambos builds.
2. **Carpeta `.user/`**: Todo el contenido dentro de esta carpeta se moverá a la raíz de `config/` **solo** en el build `alluser.zip`. Ideal para:
   *   Configs de mods de optimización (Sodium, Iris).
   *   Keybinds específicos.
   *   Configuraciones visuales.
3. **Carpeta `.host/`**: Todo el contenido dentro de esta carpeta se moverá a la raíz de `config/` **solo** en el build `allhost.zip`. Ideal para:
   *   `server.properties`.
   *   Whitelists / Ops.
   *   Configs de rendimiento de servidor (Spark, Lithium).

## Beneficios
*   **Limpieza**: No más configs de cliente en el servidor que causan warnings pesados.
*   **Automatización**: Un solo clic genera ambos entornos optimizados.
*   **Diferenciación**: Puedes tener diferentes valores para el mismo mod en cliente y servidor simplemente poniendo el archivo con el mismo nombre en `.user/` y `.host/`. (El específico sobreescribe al común).
