import sanitizeHtml from "sanitize-html";
export function sanitizeContent(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "h4", "strong", "em", "s", "ul", "ol", "li", "blockquote", "pre", "code", "a", "img", "br", "hr"],
    allowedAttributes: { a: ["href", "title", "rel", "target"], img: ["src", "alt", "width", "height"], code: ["class"] },
    allowedSchemes: ["http", "https", "mailto"], allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }) },
    exclusiveFilter: frame => frame.tag === "img" && !/^https:\/\/res\.cloudinary\.com\//.test(frame.attribs.src || ""),
  });
}
export const plainText = (html: string) => sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim();
export const readingTime = (html: string) => Math.max(1, Math.ceil(plainText(html).split(/\s+/).length / 220));
export const safeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
