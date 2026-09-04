function cleanEmbeddedUrl(url: string, defaultDomain = "https://modrinth.com"): string {
  const cleaned = url
    .replace(/&amp;/g, "&")
    .replace(/[`"' ]+/g, "")
    .trim();

  // Convert protocol-relative URLs (e.g. //media.forgecdn.net) to absolute https://
  if (cleaned.startsWith("//")) {
    return "https:" + cleaned;
  }

  // Convert relative paths (e.g. /members/tr7zw) to absolute domain-based URLs
  if (cleaned.startsWith("/") && !cleaned.startsWith("//")) {
    return defaultDomain + cleaned;
  }

  return cleaned;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeRichText(input: string, defaultDomain = "https://modrinth.com"): string {
  let normalized = input.replace(/\r/g, "");

  // 1. Reemplazar <center> y </center> por estilos Tailwind/CSS
  normalized = normalized
    .replace(/<center>/gi, '<div class="text-center my-4 space-y-2">')
    .replace(/<\/center>/gi, "</div>")
    .replace(/<hr\s*\/?>/gi, '<hr class="my-4 border-white/10" />')
    .replace(/<details\b([^>]*)>/gi, '<details class="my-2.5 rounded-xl border border-white/10 bg-black/25 overflow-hidden p-2 text-xs">')
    .replace(/<summary\b([^>]*)>/gi, '<summary class="cursor-pointer font-bold text-orange-400 select-none py-1 px-1.5 hover:bg-white/5 rounded-lg transition-colors outline-none list-none flex items-center gap-1.5">');

  // Separar listas pegadas en el texto crudo de Modrinth
  normalized = normalized
    .replace(/([.!?])\s*([1-9]\.\s+[A-Z])/g, "$1\n\n$2")
    .replace(/<\/font>\s*([A-Z0-9+][^–\n]{2,40}\s*–\s*)/g, "</font>\n\n• $1")
    .replace(/([.!?*])\s*([A-Z0-9+][^–\n]{2,40}\s*–\s*<font)/g, "$1\n\n• $2")
    .replace(/<\/font>\s*([A-Z][a-z]+)/g, "</font>\n\n$1");

  // Normalizar <font color="..."> a encabezados o spans estilizados
  normalized = normalized.replace(/(^|\n)\s*<font\s+color=["']([^"']+)["']>([^<\n]+)<\/font>\s*($|\n)/gim, (_m, before, color, content, after) => {
    return `${before}<h3 class="text-xs font-black tracking-wider uppercase mt-4 mb-1.5 block" style="color: ${color}">${content.trim()}</h3>${after}`;
  });
  normalized = normalized.replace(/<font\s+color=["']([^"']+)["']>([\s\S]*?)<\/font>/gim, (_m, color, content) => {
    return `<span style="color: ${color}">${content}</span>`;
  });

  // Normalizar iframes de YouTube / video responsive
  normalized = normalized.replace(/<iframe\b([^>]*?)src=["']([^"']+)["']([^>]*?)>(?:<\/iframe>)?/gim, (_m, _before, src) => {
    return `<div class="aspect-video w-full rounded-xl overflow-hidden my-3 border border-white/10 bg-black/40"><iframe src="${src}" class="w-full h-full border-0" allowfullscreen loading="lazy"></iframe></div>`;
  });

  // 2. Normalizar todas las etiquetas <img> de manera robusta
  normalized = normalized.replace(/<img\b([^>]*?)>/gim, (match, attrs) => {
    const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) return match;
    
    const rawSrc = srcMatch[1];
    const cleanSrc = cleanEmbeddedUrl(rawSrc, defaultDomain);
    
    let newAttrs = attrs.replace(/src\s*=\s*["']([^"']+)["']/i, `src="${cleanSrc}"`);
    
    const isBadge = cleanSrc.includes("shields.io") || cleanSrc.includes("/badge") || cleanSrc.includes("ko-fi.com");
    if (isBadge) {
      if (!newAttrs.includes("class=")) {
        newAttrs += ' class="inline-block h-6 my-1 mr-1.5 align-middle border-0 rounded shadow-sm hover:opacity-90"';
      }
    } else {
      if (!newAttrs.includes("class=")) {
        newAttrs += ' class="max-w-full rounded-xl my-4 h-auto block mx-auto border border-white/10"';
      }
    }

    if (!newAttrs.includes("loading=")) {
      newAttrs += ' loading="lazy"';
    }
    if (!newAttrs.includes("referrerpolicy=")) {
      newAttrs += ' referrerpolicy="no-referrer"';
    }
    if (!newAttrs.includes("onerror=")) {
      newAttrs += ' onerror="this.style.display=\'none\'"';
    }
    
    return `<img ${newAttrs}>`;
  });

  // 3. Normalizar todas las etiquetas <a> de manera robusta
  normalized = normalized.replace(/<a\b([^>]*?)>([\s\S]*?)<\/a>/gim, (match, attrs, content) => {
    const hrefMatch = attrs.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) return match;
    
    const rawHref = hrefMatch[1];
    const cleanHref = cleanEmbeddedUrl(rawHref, defaultDomain);
    
    let newAttrs = attrs.replace(/href\s*=\s*["']([^"']+)["']/i, `href="${cleanHref}"`);
    
    if (!newAttrs.includes("data-external-link")) {
      newAttrs += ' data-external-link="true"';
    }
    if (!newAttrs.includes("target=")) {
      newAttrs += ' target="_blank"';
    }
    if (!newAttrs.includes("rel=")) {
      newAttrs += ' rel="noopener noreferrer"';
    }
    if (!newAttrs.includes("class=")) {
      newAttrs += ' class="text-primary hover:underline"';
    }
    
    return `<a ${newAttrs}>${content}</a>`;
  });

  return normalized;
}

/**
 * Convierte Markdown/HTML liviano de Modrinth a HTML renderizable.
 * No intenta soportar Markdown completo, pero sí los casos más comunes del body.
 */
export function markdownToHtml(md: string): string {
  if (!md) return "";

  const normalized = normalizeRichText(md, "https://modrinth.com");
  const placeholders: string[] = [];
  const preserve = (html: string) => {
    const id = placeholders.push(html) - 1;
    // Usamos @@@MIMHTML...@@@ para evitar que las reglas de negrita/itálica de markdown consuman los guiones bajos
    return `@@@MIMHTML${id}@@@`;
  };

  // Preservar estructuras de HTML seguras durante el escape de caracteres de Markdown
  let html = normalized
    .replace(/<div\b[^>]*class="[^"]*aspect-video[^"]*"[^>]*>[\s\S]*?<\/div>/gi, (match) => preserve(match))
    .replace(/<\/?details\b[^>]*>/gi, (match) => preserve(match))
    .replace(/<\/?summary\b[^>]*>/gi, (match) => preserve(match))
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, (match) => preserve(match))
    .replace(/<a\b[\s\S]*?<\/a>/gi, (match) => preserve(match))
    .replace(/<img\b[^>]*>/gi, (match) => preserve(match))
    .replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, (match) => preserve(match))
    .replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi, (match) => preserve(match))
    .replace(/<div\b[^>]*>[\s\S]*?<\/div>/gi, (match) => preserve(match))
    .replace(/<p\b[\s\S]*?<\/p>/gi, (match) => preserve(match))
    .replace(/<strong\b[\s\S]*?<\/strong>/gi, (match) => preserve(match))
    .replace(/<b\b[\s\S]*?<\/b>/gi, (match) => preserve(match))
    .replace(/<em\b[\s\S]*?<\/em>/gi, (match) => preserve(match))
    .replace(/<i\b[\s\S]*?<\/i>/gi, (match) => preserve(match))
    .replace(/<ul\b[\s\S]*?<\/ul>/gi, (match) => preserve(match))
    .replace(/<ol\b[\s\S]*?<\/ol>/gi, (match) => preserve(match))
    .replace(/<li\b[\s\S]*?<\/li>/gi, (match) => preserve(match))
    .replace(/<table\b[\s\S]*?<\/table>/gi, (match) => preserve(match))
    .replace(/<code\b[\s\S]*?<\/code>/gi, (match) => preserve(match))
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, (match) => preserve(match))
    .replace(/<blockquote\b[\s\S]*?<\/blockquote>/gi, (match) => preserve(match))
    .replace(/<hr\b[^>]*\/?>/gi, (match) => preserve(match))
    .replace(/<br\s*\/?>/gi, (match) => preserve(match));

  html = escapeHtml(html)
    .replace(/\s*\(Sin Vueltas\)/gi, "") // Limpiar cualquier mención residual
    .replace(/HTMLBLOCK(\d+)/g, "") // Limpiar marcadores residuales de la API
    .replace(/^###\s+(.*)$/gim, (_m, title) => `<h3 class="text-sm font-bold mt-4 mb-2 text-white">${title.replace(/\*\*/g, "")}</h3>`)
    .replace(/^##\s+(.*)$/gim, (_m, title) => `<h2 class="text-base font-black mt-5 mb-2 text-white tracking-wide uppercase">${title.replace(/\*\*/g, "")}</h2>`)
    .replace(/^#\s+(.*)$/gim, (_m, title) => `<h1 class="text-lg font-black mt-6 mb-3 text-white tracking-wide uppercase">${title.replace(/\*\*/g, "")}</h1>`)
    .replace(/_\*\*(.*?)\*\*_/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*_(.*?)_\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
      const cleanSrc = cleanEmbeddedUrl(src, "https://modrinth.com");
      const safeAlt = escapeHtml(alt);
      const isBadge = cleanSrc.includes("shields.io") || cleanSrc.includes("/badge") || cleanSrc.includes("ko-fi.com");
      const cls = isBadge
        ? "inline-block h-6 my-1 mr-1.5 align-middle border-0 rounded shadow-sm hover:opacity-90"
        : "max-w-full rounded-xl my-4 h-auto block mx-auto border border-white/10";
      return `<img src="${cleanSrc}" alt="${safeAlt}" referrerpolicy="no-referrer" onerror="this.style.display='none'" class="${cls}" loading="lazy" />`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) => {
      const trimmedHref = href.trim();
      if (trimmedHref.startsWith("fomo:") || trimmedHref.startsWith("fomo://")) {
        const query = trimmedHref.replace(/^fomo:(\/\/)?/, "").trim();
        return `<span data-fomo-query="${escapeHtml(query)}" class="fomo-open-trigger inline-flex items-center gap-1 px-2 py-0.5 my-0.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/35 text-purple-200 hover:text-white border border-purple-500/40 font-bold transition-all active:scale-95 text-xs shadow-sm cursor-pointer select-none"><span>📦</span><span>${text}</span><span class="text-[9px] opacity-70 font-mono">↗ FOMO</span></span>`;
      }
      const cleanHref = cleanEmbeddedUrl(href, "https://modrinth.com");
      return `<a href="${cleanHref}" data-external-link="true" class="text-primary hover:underline" rel="noopener noreferrer">${text}</a>`;
    })
    // Auto-link URLs crudas en el texto
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)(?=[)\s]|$)/g, '$1<a href="$2" data-external-link="true" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">$2</a>')
    .replace(/^\s*[-*•]\s+(.*)$/gim, '<li class="ml-5 list-disc my-1">$1</li>')
    .replace(/(<li class="ml-5 list-disc my-1">[\s\S]*?<\/li>)/g, '<ul class="space-y-1 my-3">$1</ul>')
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n\n/g, "<br /><br />")
    .replace(/\n/g, "<br />");

  placeholders.forEach((block, index) => {
    html = html.replace(`@@@MIMHTML${index}@@@`, block);
  });

  return html
    .replace(/<ul class="space-y-1 my-3">(<ul class="space-y-1 my-3">)+/g, '<ul class="space-y-1 my-3">')
    .replace(/(<\/ul>)+/g, "</ul>")
    .replace(/@@@MIMHTML\d+@@@/g, "");
}

/**
 * Formatea y embellece descripciones HTML nativas provenientes de CurseForge.
 * Asegura resolución de URLs relativas y protocol-relative, styling de imágenes y links externos.
 */
export function formatCurseForgeHtml(html: string): string {
  if (!html) return "";

  // 1. Normalizar saltos de línea
  let formatted = html.replace(/\r/g, "");

  // 2. Resolver URLs protocol-relative (e.g. //media.forgecdn.net -> https://media.forgecdn.net)
  formatted = formatted.replace(/(src|href)\s*=\s*["']\/\/([^"']+)["']/gim, '$1="https://$2"');

  // 3. Convertir URLs relativas de imágenes (not starting with http, https, or data:) a CurseForge absoluto
  formatted = formatted.replace(/<img\b([^>]*?)src\s*=\s*["'](?!\s*https?:\/\/|\s*data:)([^"']+)["']/gim, (_m, attrs, src) => {
    const cleanSrc = src.startsWith("/") ? `https://www.curseforge.com${src}` : `https://www.curseforge.com/${src}`;
    return `<img ${attrs}src="${cleanSrc}"`;
  });

  // 4. Convertir URLs relativas de enlaces a CurseForge absoluto
  formatted = formatted.replace(/<a\b([^>]*?)href\s*=\s*["'](?!\s*https?:\/\/|\s*mailto:|\s*#)([^"']+)["']/gim, (_m, attrs, href) => {
    const cleanHref = href.startsWith("/") ? `https://www.curseforge.com${href}` : `https://www.curseforge.com/${href}`;
    return `<a ${attrs}href="${cleanHref}" data-external-link="true"`;
  });

  // 5. Inyectar atributos de link externo a todas las etiquetas <a> para que se abran en el navegador de forma correcta
  formatted = formatted.replace(/<a\b([^>]*?)>/gim, (_m, attrs) => {
    let cleanAttrs = attrs;
    // Evitamos duplicar
    if (!cleanAttrs.includes("data-external-link")) {
      cleanAttrs += ' data-external-link="true"';
    }
    if (!cleanAttrs.includes("target=")) {
      cleanAttrs += ' target="_blank"';
    }
    if (!cleanAttrs.includes("rel=")) {
      cleanAttrs += ' rel="noopener noreferrer"';
    }
    if (!cleanAttrs.includes("class=")) {
      cleanAttrs += ' class="text-primary hover:underline"';
    }
    return `<a ${cleanAttrs}>`;
  });

  // 6. Aplicar estilos premium y responsivos a todas las etiquetas <img>
  formatted = formatted.replace(/<img\b([^>]*?)>/gim, (_m, attrs) => {
    let cleanAttrs = attrs;
    if (!cleanAttrs.includes("class=")) {
      cleanAttrs += ' class="max-w-full rounded-xl my-4 h-auto block mx-auto border border-white/10"';
    }
    if (!cleanAttrs.includes("loading=")) {
      cleanAttrs += ' loading="lazy"';
    }
    return `<img ${cleanAttrs}>`;
  });

  return formatted;
}
