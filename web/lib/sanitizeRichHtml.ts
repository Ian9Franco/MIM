import sanitize from "sanitize-html";

/** Shared by desktop and web. Never preserve executable event attributes. */
export function sanitizeHtml(input: string): string {
  return sanitize(input, {
    allowedTags: ["a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre", "span", "strong", "table", "tbody", "td", "th", "thead", "tr", "ul", "details", "summary", "iframe"],
    allowedAttributes: {
      "*": ["class", "title", "style"],
      a: ["href", "target", "rel", "data-external-link"],
      span: ["data-fomo-query"],
      img: ["src", "alt", "loading", "referrerpolicy"],
      td: ["colspan", "rowspan"], th: ["colspan", "rowspan"],
      details: ["open"],
      iframe: ["src", "allowfullscreen", "loading", "title", "width", "height", "frameborder"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"], iframe: ["https"] },
    allowProtocolRelative: false,
    allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"],
    allowIframeRelativeUrls: false,
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^[a-z]+$/i, /^rgba?\([\d\s.,%]+\)$/i],
        "text-align": [/^(left|right|center|justify)$/],
      },
    },
    transformTags: {
      a: (_tag, attrs) => ({ tagName: "a", attribs: { ...attrs, target: "_blank", rel: "noopener noreferrer" } }),
      img: (_tag, attrs) => {
        const safe: Record<string, string> = { ...attrs, loading: "lazy", referrerpolicy: "no-referrer" };
        if (/^data:/i.test(safe.src || "") && !/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(safe.src)) delete safe.src;
        return { tagName: "img", attribs: safe };
      },
    },
  });
}
