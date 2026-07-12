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
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function isSafeUrl(value: string): boolean {
  const cleaned = value.trim().replace(/&amp;/g, "&");
  return /^(https?:|mailto:|data:image\/|#|\/)/i.test(cleaned);
}

const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);

const GLOBAL_ATTRS = new Set(["class", "data-external-link"]);
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "title"]),
  img: new Set(["src", "alt", "loading", "title"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
};

export function sanitizeHtml(input: string): string {
  if (!input) return "";

  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?([a-z][a-z0-9-]*)(\s[^<>]*)?>/gi, (match, tagName, rawAttrs = "") => {
      const tag = String(tagName).toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (match.startsWith("</")) return `</${tag}>`;

      const allowedAttrs = TAG_ATTRS[tag] || new Set<string>();
      const attrs: string[] = [];
      String(rawAttrs).replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g, (_m, rawName, quoted, singleQuoted, bare) => {
        const name = String(rawName).toLowerCase();
        const value = String(quoted ?? singleQuoted ?? bare ?? "");
        if (name.startsWith("on")) return "";
        if (!GLOBAL_ATTRS.has(name) && !allowedAttrs.has(name)) return "";
        if ((name === "href" || name === "src") && !isSafeUrl(value)) return "";
        attrs.push(`${name}="${escapeAttribute(value)}"`);
        return "";
      });

      if (tag === "a") {
        if (!attrs.some((attr) => attr.startsWith("target="))) attrs.push('target="_blank"');
        if (!attrs.some((attr) => attr.startsWith("rel="))) attrs.push('rel="noopener noreferrer"');
      }
      if (tag === "img" && !attrs.some((attr) => attr.startsWith("loading="))) {
        attrs.push('loading="lazy"');
      }

      return `<${tag}${attrs.length ? ` ${attrs.join(" ")}` : ""}>`;
    });
}

function normalizeRichText(input: string, defaultDomain = "https://modrinth.com"): string {
  let normalized = input.replace(/\r/g, "");

  // 1. Reemplazar <center> y </center> por estilos Tailwind/CSS
  normalized = normalized
    .replace(/<center>/gi, '<div class="text-center my-4 space-y-2">')
    .replace(/<\/center>/gi, "</div>")
    .replace(/<hr\s*\/?>/gi, '<hr class="my-4 border-white/10" />')
    .replace(/<br\s*\/?>/gi, "<br />");

  // 2. Normalizar todas las etiquetas <img> de manera robusta (soporta cualquier orden de atributos y presencia de alt)
  normalized = normalized.replace(/<img\b([^>]*?)>/gim, (match, attrs) => {
    const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) return match; // si no tiene src, no alterar
    
    const rawSrc = srcMatch[1];
    const cleanSrc = cleanEmbeddedUrl(rawSrc, defaultDomain);
    
    // Reemplazar src original por la URL absoluta limpia
    let newAttrs = attrs.replace(/src\s*=\s*["']([^"']+)["']/i, `src="${cleanSrc}"`);
    
    // Inyectar estilos responsivos premium y lazy loading si no están presentes
    if (!newAttrs.includes("class=")) {
      newAttrs += ' class="max-w-full rounded-xl my-4 h-auto block mx-auto border border-white/10"';
    }
    if (!newAttrs.includes("loading=")) {
      newAttrs += ' loading="lazy"';
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
    .replace(/<a\b[\s\S]*?<\/a>/gi, (match) => preserve(match))
    .replace(/<img\b[^>]*>/gi, (match) => preserve(match))
    .replace(/<div\b[^>]*>[\s\S]*?<\/div>/gi, (match) => preserve(match))
    .replace(/<p\b[\s\S]*?<\/p>/gi, (match) => preserve(match))
    .replace(/<span\b[\s\S]*?<\/span>/gi, (match) => preserve(match))
    .replace(/<strong\b[\s\S]*?<\/strong>/gi, (match) => preserve(match))
    .replace(/<b\b[\s\S]*?<\/b>/gi, (match) => preserve(match))
    .replace(/<em\b[\s\S]*?<\/em>/gi, (match) => preserve(match))
    .replace(/<i\b[\s\S]*?<\/i>/gi, (match) => preserve(match))
    .replace(/<ul\b[\s\S]*?<\/ul>/gi, (match) => preserve(match))
    .replace(/<ol\b[\s\S]*?<\/ol>/gi, (match) => preserve(match))
    .replace(/<li\b[\s\S]*?<\/li>/gi, (match) => preserve(match))
    .replace(/<h[1-6]\b[\s\S]*?<\/h[1-6]>/gi, (match) => preserve(match))
    .replace(/<table\b[\s\S]*?<\/table>/gi, (match) => preserve(match))
    .replace(/<code\b[\s\S]*?<\/code>/gi, (match) => preserve(match))
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, (match) => preserve(match))
    .replace(/<blockquote\b[\s\S]*?<\/blockquote>/gi, (match) => preserve(match))
    .replace(/<hr\b[^>]*\/?>/gi, (match) => preserve(match))
    .replace(/<br\s*\/?>/gi, (match) => preserve(match));

  html = escapeHtml(html)
    .replace(/HTMLBLOCK(\d+)/g, "") // Limpiar marcadores residuales de la API
    .replace(/^###\s+(.*)$/gim, '<h3 class="text-lg font-bold mt-5 mb-2 text-white">$1</h3>')
    .replace(/^##\s+(.*)$/gim, '<h2 class="text-xl font-bold mt-6 mb-3 text-white">$1</h2>')
    .replace(/^#\s+(.*)$/gim, '<h1 class="text-2xl font-bold mt-7 mb-4 text-white">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
      const cleanSrc = cleanEmbeddedUrl(src, "https://modrinth.com");
      const safeAlt = escapeHtml(alt);
      return `<img src="${cleanSrc}" alt="${safeAlt}" class="max-w-full rounded-xl my-4 h-auto block mx-auto border border-white/10" loading="lazy" />`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) => {
      const cleanHref = cleanEmbeddedUrl(href, "https://modrinth.com");
      return `<a href="${cleanHref}" data-external-link="true" class="text-primary hover:underline" rel="noopener noreferrer">${text}</a>`;
    })
    .replace(/^\s*[-*]\s+(.*)$/gim, '<li class="ml-5 list-disc">$1</li>')
    .replace(/(<li class="ml-5 list-disc">[\s\S]*?<\/li>)/g, '<ul class="space-y-1 my-3">$1</ul>')
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n\n/g, "<br /><br />")
    .replace(/\n/g, "<br />");

  placeholders.forEach((block, index) => {
    html = html.replace(`@@@MIMHTML${index}@@@`, block);
  });

  return sanitizeHtml(html
    .replace(/<ul class="space-y-1 my-3">(<ul class="space-y-1 my-3">)+/g, '<ul class="space-y-1 my-3">')
    .replace(/(<\/ul>)+/g, "</ul>")
    .replace(/@@@MIMHTML\d+@@@/g, ""));
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

  return sanitizeHtml(formatted);
}
