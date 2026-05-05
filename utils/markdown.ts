function cleanEmbeddedUrl(url: string): string {
  return url
    .replace(/&amp;/g, "&")
    .replace(/[`"' ]+/g, "")
    .trim();
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeRichText(input: string): string {
  return input
    .replace(/\r/g, "")
    .replace(/<center>/gi, '<div class="text-center my-4 space-y-2">')
    .replace(/<\/center>/gi, "</div>")
    .replace(/<hr\s*\/?>/gi, '<hr class="my-4 border-white/10" />')
    .replace(/<br\s*\/?>/gi, "<br />")
    .replace(/<\/a>/gi, "")
    .replace(/<\/?p>/gi, "")
    .replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>(.*?)$/gim, (_m, href, text) => {
      const cleanHref = cleanEmbeddedUrl(href);
      return `<a href="${cleanHref}" data-external-link="true" class="text-primary hover:underline" rel="noopener noreferrer">${text}</a>`;
    })
    .replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>(.*?)<\/a>/gim, (_m, href, text) => {
      const cleanHref = cleanEmbeddedUrl(href);
      return `<a href="${cleanHref}" data-external-link="true" class="text-primary hover:underline" rel="noopener noreferrer">${text}</a>`;
    })
    .replace(/<img\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*alt\s*=\s*["']([^"']*)["'][^>]*>/gim, (_m, src, alt) => {
      const cleanSrc = cleanEmbeddedUrl(src);
      const safeAlt = escapeHtml(alt);
      return `<img src="${cleanSrc}" alt="${safeAlt}" class="max-w-full rounded-xl my-4 h-auto block mx-auto border border-white/10" loading="lazy" />`;
    });
}

/**
 * Convierte Markdown/HTML liviano de Modrinth a HTML renderizable.
 * No intenta soportar Markdown completo, pero sí los casos más comunes del body.
 */
export function markdownToHtml(md: string): string {
  if (!md) return "";

  const normalized = normalizeRichText(md);
  const placeholders: string[] = [];
  const preserve = (html: string) => {
    const id = placeholders.push(html) - 1;
    return `__HTML_BLOCK_${id}__`;
  };

  let html = normalized
    .replace(/<a\b[\s\S]*?<\/a>/gi, (match) => preserve(match))
    .replace(/<img\b[^>]*>/gi, (match) => preserve(match))
    .replace(/<div\b[^>]*>[\s\S]*?<\/div>/gi, (match) => preserve(match))
    .replace(/<hr\b[^>]*\/?>/gi, (match) => preserve(match))
    .replace(/<br\s*\/?>/gi, (match) => preserve(match));

  html = escapeHtml(html)
    .replace(/^###\s+(.*)$/gim, '<h3 class="text-lg font-bold mt-5 mb-2 text-white">$1</h3>')
    .replace(/^##\s+(.*)$/gim, '<h2 class="text-xl font-bold mt-6 mb-3 text-white">$1</h2>')
    .replace(/^#\s+(.*)$/gim, '<h1 class="text-2xl font-bold mt-7 mb-4 text-white">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
      const cleanSrc = cleanEmbeddedUrl(src);
      const safeAlt = escapeHtml(alt);
      return `<img src="${cleanSrc}" alt="${safeAlt}" class="max-w-full rounded-xl my-4 h-auto block mx-auto border border-white/10" loading="lazy" />`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) => {
      const cleanHref = cleanEmbeddedUrl(href);
      return `<a href="${cleanHref}" data-external-link="true" class="text-primary hover:underline" rel="noopener noreferrer">${text}</a>`;
    })
    .replace(/^\s*[-*]\s+(.*)$/gim, '<li class="ml-5 list-disc">$1</li>')
    .replace(/(<li class="ml-5 list-disc">[\s\S]*?<\/li>)/g, '<ul class="space-y-1 my-3">$1</ul>')
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n\n/g, "<br /><br />")
    .replace(/\n/g, "<br />");

  placeholders.forEach((block, index) => {
    html = html.replace(`__HTML_BLOCK_${index}__`, block);
  });

  return html
    .replace(/<ul class="space-y-1 my-3">(<ul class="space-y-1 my-3">)+/g, '<ul class="space-y-1 my-3">')
    .replace(/(<\/ul>)+/g, "</ul>")
    .replace(/__HTML_BLOCK_\d+__/g, "");
}
