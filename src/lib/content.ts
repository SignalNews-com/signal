import sanitizeHtml from "sanitize-html";
import { cloudinaryUrl } from "./image-loader";
const contentTags = ["p", "h2", "h3", "h4", "strong", "em", "s", "ul", "ol", "li", "blockquote", "pre", "code", "a", "img", "br", "hr"];
export function sanitizeContent(html: string) {
  return sanitizeHtml(html, {
    allowedTags: contentTags,
    allowedAttributes: { a: ["href", "title", "rel", "target"], img: ["src", "alt", "width", "height"], code: ["class"] },
    allowedSchemes: ["http", "https", "mailto"], allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }) },
    exclusiveFilter: frame => frame.tag === "img" && !/^https:\/\/res\.cloudinary\.com\//.test(frame.attribs.src || ""),
  });
}
export const plainText = (html: string) => sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim();
export const readingTime = (html: string) => Math.max(1, Math.ceil(plainText(html).split(/\s+/).length / 220));
export const safeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
// Reader-facing HTML: responsive Cloudinary images that load lazily, and anchor ids on section headings.
export function renderContent(html: string) {
  const withImages = sanitizeHtml(sanitizeContent(html), {
    allowedTags: contentTags, allowedAttributes: { a: ["href", "title", "rel", "target"], img: ["src", "srcset", "sizes", "alt", "width", "height", "loading", "decoding"], code: ["class"] }, allowedSchemes: ["http", "https", "mailto"],
    transformTags: { img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, src: cloudinaryUrl(attribs.src || "", 1600), srcset: [640, 1080, 1600].map(w => `${cloudinaryUrl(attribs.src || "", w)} ${w}w`).join(", "), sizes: "(max-width: 900px) 100vw, 850px", loading: "lazy", decoding: "async" } }) },
  });
  // sanitizeContent strips heading attributes, so every h2 here is a bare <h2>.
  const seen = new Map<string, number>();
  return withImages.replace(/<h2>([\s\S]*?)<\/h2>/g, (_match, inner: string) => {
    const base = plainText(inner).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "section";
    const n = seen.get(base) || 0; seen.set(base, n + 1);
    return `<h2 id="${n ? `${base}-${n}` : base}">${inner}</h2>`;
  });
}
