# Integración de Galerías de Imágenes en MIM

Este documento define la arquitectura y los pasos necesarios para implementar la pestaña de **Galería de Imágenes** en la superposición de detalles de mods (`FomoVersionOverlay`) de Minecraft Intelligent Manager (MIM), unificando las fuentes de Modrinth y CurseForge.

---

## 1. Arquitectura de Datos

Para soportar galerías visuales sin sobrecargar las peticiones iniciales de descubrimiento (`/api/modrinth/discover`), la obtención de imágenes debe realizarse de forma **perezosa (Lazy Loading)** al abrir los detalles del proyecto o al seleccionar la pestaña "Galería".

### Estructura del Objeto de Galería (`ModGalleryImage`)

```typescript
export interface ModGalleryImage {
  url: string;           // URL directa de la imagen (debe usar CDN optimizada)
  title?: string;        // Título o descripción corta
  description?: string;  // Pie de foto detallado
  featured?: boolean;    // Si es la imagen de portada o principal
}
```

---

## 2. Consumo de APIs Externas

### A. Modrinth API v2
El endpoint `/project/{id}` de Modrinth devuelve un array nativo de objetos en la propiedad `gallery`.

```json
// GET https://api.modrinth.com/v2/project/{id}
{
  "gallery": [
    {
      "url": "https://cdn.modrinth.com/data/XXXX/images/YYYY.png",
      "featured": true,
      "title": "Main Gameplay",
      "description": "Una vista de las redes logísticas funcionando en tiempo real."
    }
  ]
}
```

### B. CurseForge API v1
El endpoint `/v1/mods/{modId}` de CurseForge devuelve las imágenes en la propiedad `screenshots`.

```json
// GET https://api.curseforge.com/v1/mods/{modId}
{
  "data": {
    "screenshots": [
      {
        "id": 12345,
        "url": "https://media.forgecdn.net/files/XXXX/YYYY/screenshot.png",
        "title": "Terminal Interface",
        "thumbnailUrl": "https://media.forgecdn.net/files/XXXX/YYYY/screenshot_thumb.png"
      }
    ]
  }
}
```

---

## 3. Implementación en el Backend (API Routes)

Se debe crear un endpoint unificado `/api/mod-gallery` o extender el endpoint de consulta individual de proyectos para normalizar ambas respuestas.

```typescript
// app/api/mod-gallery/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getApiKey } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const source = searchParams.get("source") || "modrinth";

  if (!projectId) return NextResponse.json({ error: "Falta projectId" }, { status: 400 });

  try {
    if (source === "curseforge") {
      const res = await fetch(`https://api.curseforge.com/v1/mods/${projectId}`, {
        headers: { "x-api-key": getApiKey("curseforge") || "" }
      });
      const data = await res.json();
      const gallery = (data.data?.screenshots || []).map((s: any) => ({
        url: s.url,
        title: s.title,
        thumbnailUrl: s.thumbnailUrl || s.url
      }));
      return NextResponse.json({ gallery });
    } else {
      const res = await fetch(`https://api.modrinth.com/v2/project/${projectId}`, {
        headers: { "Authorization": getApiKey("modrinth") || "" }
      });
      const data = await res.json();
      const gallery = (data.gallery || []).map((g: any) => ({
        url: g.url,
        title: g.title,
        description: g.description,
        featured: g.featured
      }));
      return NextResponse.json({ gallery });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

---

## 4. Integración en el Frontend (`FomoVersionOverlay.tsx`)

### Paso 1: Añadir el estado y la consulta en el Hook Gestor
En `hooks/useFomoOverlayManager.ts`, se añade la hidratación de la galería:

```typescript
const [gallery, setGallery] = useState<ModGalleryImage[]>([]);
const [loadingGallery, setLoadingGallery] = useState(false);

useEffect(() => {
  if (activeTab === "gallery" && gallery.length === 0) {
    setLoadingGallery(true);
    fetch(`/api/mod-gallery?projectId=${mod.projectId}&source=${mod._source}`)
      .then(r => r.json())
      .then(d => setGallery(d.gallery || []))
      .catch(e => console.error(e))
      .finally(() => setLoadingGallery(false));
  }
}, [activeTab, mod.projectId, mod._source]);
```

### Paso 2: Botón de Pestaña (TabButton)
Añadir el botón de la galería en el header de pestañas de `FomoVersionOverlay.tsx`:

```tsx
<TabButton 
  active={activeTab === "gallery"} 
  onClick={() => setActiveTab("gallery")} 
  icon={<Image className="w-3.5 h-3.5" />} 
  label="Galería" 
/>
```

### Paso 3: Renderizado del Grid Visual con Lightbox
En la sección de contenido de `FomoVersionOverlay.tsx`:

```tsx
{activeTab === "gallery" && (
  <div className="space-y-4">
    {loadingGallery ? (
      <div className="grid grid-cols-2 gap-3">
        <div className="h-40 bg-white/5 animate-pulse rounded-2xl" />
        <div className="h-40 bg-white/5 animate-pulse rounded-2xl" />
      </div>
    ) : gallery.length === 0 ? (
      <p className="text-center text-xs opacity-50 py-10">No hay imágenes disponibles para este proyecto.</p>
    ) : (
      <div className="grid grid-cols-2 gap-4">
        {gallery.map((img, i) => (
          <div key={i} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video cursor-pointer hover:border-primary/50 transition-all">
            <img src={img.url} alt={img.title || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            {img.title && (
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black via-black/70 to-transparent text-[10px] font-bold">
                {img.title}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

---

## 5. Puntos de Optimización (Best Practices)
1. **Dominio de Imágenes en Next.js**: Asegurar que `cdn.modrinth.com` y `media.forgecdn.net` estén permitidos en `next.config.ts` o utilizar etiquetas `<img>` nativas para evitar restricciones del proxy de Next.js.
2. **Caché de Imágenes**: El endpoint del backend debe configurar cabeceras de control de caché (`Cache-Control: public, s-maxage=3600`) para no consultar repetidamente las mismas imágenes durante una sesión.
