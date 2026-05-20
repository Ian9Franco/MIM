# Guía de Configuración de Supabase y Arquitectura de APIs de MIM

Esta guía detalla paso a paso las acciones requeridas dentro del panel de control de Supabase y explica cómo estructurar la lógica de APIs y descargas en la aplicación de MIM para evitar saturar las APIs externas (Modrinth/CurseForge) y optimizar el almacenamiento.

---

## 🛠️ Parte 1: Configuración en el Dashboard de Supabase

Sigue estos pasos en la consola web de Supabase para configurar tu proyecto `mim`.

### Paso 1: Configuración del Auth (Autenticación)
Para que los usuarios puedan registrarse e iniciar sesión de forma sencilla y segura en la aplicación de escritorio:
1. Entra en tu proyecto en Supabase y ve a **Project Settings** (icono de engranaje en la barra izquierda) > **Auth**.
2. **Email Auth**:
   - Asegúrate de que **Enable Email Provider** esté activado.
   - **Confirm Email**: Desactívalo temporalmente si quieres que los usuarios puedan registrarse e iniciar sesión inmediatamente sin confirmar su correo durante las pruebas. Actívalo en producción.
   - **Secure Email Change**: Activo.
3. **Redirect URLs**:
   - En la sección **Redirect URLs**, añade: `http://localhost:3000` y `http://127.0.0.1:3000`. Esto es vital en caso de que decidas habilitar inicio de sesión mediante OAuth (Discord/Google) en el futuro.

---

### Paso 2: Ejecución del Script SQL (Base de Datos)
La arquitectura de modpacks usará un **Modelo Híbrido**:
* **Mods del Modpack**: Se guardan como un archivo JSON (`manifest` tipo `jsonb`) con el listado de ids, nombres, plataformas y hashes. No se suben los archivos `.jar` grandes.
* **Archivos Personalizados**: Las carpetas `config/` locales y overrides propios se empaquetan en un pequeño `.zip` (normalmente de menos de 1-2MB) y se suben al Storage.

Ve a **SQL Editor** en Supabase, haz clic en **New Query**, pega el siguiente código y presiona **Run**:

```sql
-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- 1. TABLA: PROFILES
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    username text unique not null,
    avatar_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Trigger para perfiles automáticos
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'User_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Políticas RLS Profiles
create policy "Lectura pública de perfiles" on public.profiles for select using (true);
create policy "Modificación de perfil propio" on public.profiles for update using (auth.uid() = id);

-- 2. TABLA: FAVORITE_MODS
create table public.favorite_mods (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    mod_id text not null,
    platform text not null check (platform in ('modrinth', 'curseforge')),
    name text not null,
    icon_url text,
    summary text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (profile_id, mod_id, platform)
);

alter table public.favorite_mods enable row level security;

-- Políticas RLS Favoritos
create policy "Lectura pública de favoritos" on public.favorite_mods for select using (true);
create policy "Insertar favoritos propios" on public.favorite_mods for insert with check (auth.uid() = profile_id);
create policy "Eliminar favoritos propios" on public.favorite_mods for delete using (auth.uid() = profile_id);

-- 3. TABLA: SHOWCASE_VIDEOS
create table public.showcase_videos (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    youtube_video_id text not null,
    title text not null,
    description text,
    thumbnail_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (profile_id, youtube_video_id)
);

alter table public.showcase_videos enable row level security;

-- Políticas RLS Videos
create policy "Lectura pública de videos" on public.showcase_videos for select using (true);
create policy "Publicar videos propios" on public.showcase_videos for insert with check (auth.uid() = profile_id);
create policy "Eliminar videos propios" on public.showcase_videos for delete using (auth.uid() = profile_id);

-- 4. TABLA: MODPACK_BUILDS (Modelo Híbrido Liviano)
create table public.modpack_builds (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    description text,
    game_version text not null,
    modloader text not null,
    version_label text not null,
    config_zip_url text,      -- URL al zip con overrides/config (opcional en Storage)
    manifest jsonb not null,   -- Contiene listado de mods (ID, plataforma, versión, etc.)
    downloads_count integer default 0 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.modpack_builds enable row level security;

-- Políticas RLS Modpacks
create policy "Lectura pública de modpacks" on public.modpack_builds for select using (true);
create policy "Publicar modpack propio" on public.modpack_builds for insert with check (auth.uid() = profile_id);
create policy "Eliminar modpack propio" on public.modpack_builds for delete using (auth.uid() = profile_id);

-- 5. FUNCIÓN RPC: CONTADOR DE DESCARGAS ATÓMICO
create or replace function public.increment_downloads(row_id uuid)
returns void as $$
begin
  update public.modpack_builds
  set downloads_count = downloads_count + 1
  where id = row_id;
end;
$$ language plpgsql security definer;
```

---

### Paso 3: Crear el Storage Bucket para Overrides
Crearemos el bucket para almacenar de forma segura los ZIPs de configuración personalizada:
1. Ve a la sección **Storage** en tu consola de Supabase.
2. Haz clic en **New Bucket**.
3. Nómbralo: `modpack-configs`.
4. Márcalo como **Public Bucket** (esto facilita la descarga directa desde el cliente).
5. Abre la sección de **Allowed MIME types** si deseas restringir las subidas únicamente a archivos comprimidos. Puedes ingresar: `application/zip`, `application/x-zip-compressed`.
6. En **Maximum file size**, define `5MB` (evita subidas accidentales de archivos pesados).

Ejecuta el siguiente script en el **SQL Editor** para aplicar las políticas de RLS en el Storage:

```sql
-- Permitir descarga pública
create policy "Descarga pública de configs" on storage.objects
    for select using (bucket_id = 'modpack-configs');

-- Permitir subida solo a usuarios autenticados bajo su carpeta virtual 'uploads/id_usuario/*'
create policy "Usuarios autenticados suben configs" on storage.objects
    for insert with check (
        bucket_id = 'modpack-configs' 
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- Permitir borrar su propio config
create policy "Usuarios borran sus configs" on storage.objects
    for delete using (
        bucket_id = 'modpack-configs' 
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
    );
```

---

## 🔌 Parte 2: Arquitectura del Código e Integración de APIs

Dado que Supabase maneja autenticación e integridad en el cliente (usando las reglas RLS en PostgreSQL), **gran parte de las peticiones se pueden hacer directamente desde los componentes de React** usando la instancia `supabase`. Sin embargo, para descargas controladas y evitar exceder los límites de API (rate limit), organizaremos el código de la siguiente forma.

### 📁 1. Estructura de Archivos Propuesta
Colocaremos el código en las siguientes ubicaciones para mantener la consistencia con MIM:

```
d:\.mine\manager\
├── app/
│   ├── api/
│   │   └── community/
│   │       ├── download-queue/      # API para orquestar descargas controladas
│   │       │   └── route.ts
│   │       └── modpacks/            # Backend opcional para transacciones seguras
│   │           └── route.ts
├── components/
│   ├── community/                   # UI del sistema online
│   │   ├── CommunityPanel.tsx       # Vista principal (Pestaña en FOMO)
│   │   ├── LoginPortal.tsx          # Pantalla de Login/Registro Glassmorphic
│   │   ├── ModpackDownloader.tsx    # Barra de progreso con ETA y cola
│   │   └── ShowcaseVideoShare.tsx   # Compartir enlaces de YouTube
└── lib/
    ├── downloadQueue.ts             # Gestor secuencial de descargas con delay
    └── supabaseClient.ts            # Cliente Supabase (Creado previamente)
```

---

### 📥 2. Cola de Descargas Controlada (`lib/downloadQueue.ts`)
Para no saturar las APIs de CurseForge y Modrinth, implementaremos una cola con reintentos y delays. Evita descargar 50 archivos simultáneamente. En su lugar, descarga de 2 en 2 con un retardo de `250ms` a `500ms` entre peticiones.

Crea el archivo `lib/downloadQueue.ts`:

```typescript
import { supabase } from "./supabaseClient";

interface DownloadItem {
  id: string;
  name: string;
  url: string;
  platform: 'modrinth' | 'curseforge';
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  bytesDownloaded: number;
  totalBytes: number;
}

export class SafeDownloader {
  private queue: DownloadItem[] = [];
  private activeDownloads = 0;
  private maxConcurrent = 2; // Máximo 2 descargas simultáneas para proteger APIs
  private delayMs = 300;     // Retardo entre lanzamientos de descargas
  
  private onProgressCallback?: (queue: DownloadItem[], progress: number, etaSeconds: number) => void;
  private startTime = 0;

  constructor(items: DownloadItem[]) {
    this.queue = items;
  }

  public onProgress(callback: (queue: DownloadItem[], progress: number, etaSeconds: number) => void) {
    this.onProgressCallback = callback;
  }

  public async start() {
    this.startTime = Date.now();
    this.processNext();
  }

  private async processNext() {
    if (this.queue.every(item => item.status === 'completed' || item.status === 'failed')) {
      // Todo completado
      return;
    }

    while (this.activeDownloads < this.maxConcurrent) {
      const nextItem = this.queue.find(item => item.status === 'pending');
      if (!nextItem) break;

      this.activeDownloads++;
      nextItem.status = 'downloading';
      
      // Retardo artificial entre inicio de descargas para no alertar limitadores
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
      
      this.downloadFile(nextItem);
    }
  }

  private async downloadFile(item: DownloadItem) {
    try {
      // Usamos el endpoint interno de descarga existente de la app o llamada directa
      const response = await fetch('/api/modrinth/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: item.url, 
          modId: item.id,
          platform: item.platform 
        })
      });

      if (!response.ok) throw new Error("Network response was not ok");
      
      // Simulación o reporte de progreso
      item.status = 'completed';
    } catch (err) {
      console.error(`Error downloading ${item.name}:`, err);
      item.status = 'failed';
    } finally {
      this.activeDownloads--;
      this.updateProgress();
      this.processNext();
    }
  }

  private updateProgress() {
    const completed = this.queue.filter(i => i.status === 'completed').length;
    const total = this.queue.length;
    const percent = (completed / total) * 100;

    // Calcular ETA (Tiempo Estimado de Finalización)
    const elapsedMs = Date.now() - this.startTime;
    const avgTimePerFile = elapsedMs / (completed || 1);
    const remainingFiles = total - completed;
    const etaSeconds = Math.round((remainingFiles * avgTimePerFile) / 1000);

    if (this.onProgressCallback) {
      this.onProgressCallback(this.queue, percent, etaSeconds);
    }
  }
}
```
