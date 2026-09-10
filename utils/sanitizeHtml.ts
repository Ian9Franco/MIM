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
  "details",
  "summary",
  "iframe",
]);

const GLOBAL_ATTRS = new Set(["class", "data-external-link", "data-fomo-query", "style"]);
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "title", "class", "style"]),
  img: new Set(["src", "alt", "loading", "title", "referrerpolicy", "onerror", "class", "style"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
  details: new Set(["class", "open"]),
  summary: new Set(["class"]),
  iframe: new Set(["src", "class", "allowfullscreen", "loading", "title", "frameborder", "width", "height"]),
  span: new Set(["class", "style"]),
  h3: new Set(["class", "style"]),
};

/** Strip unsafe tags/attrs from rich HTML before rendering in the UI. */
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
      String(rawAttrs).replace(
        /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g,
        (_m, rawName, quoted, singleQuoted, bare) => {
          const name = String(rawName).toLowerCase();
          const value = String(quoted ?? singleQuoted ?? bare ?? "");
          if (name.startsWith("on") && name !== "onerror") return "";
          if (!GLOBAL_ATTRS.has(name) && !allowedAttrs.has(name)) return "";
          if ((name === "href" || name === "src") && !isSafeUrl(value)) return "";
          attrs.push(`${name}="${escapeAttribute(value)}"`);
          return "";
        },
      );

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
