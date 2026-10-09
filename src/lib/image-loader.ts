// next/image loader: Cloudinary resizes and picks AVIF/WebP per browser, so images skip the Next.js optimizer.
export function cloudinaryUrl(src: string, width: number, quality?: number) {
  const match = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/.exec(src);
  if (!match) return src;
  // Strip a transformation we added earlier so the URL stays canonical.
  const rest = match[2].replace(/^f_auto,q_auto[^/]*\//, "");
  return `${match[1]}f_auto,q_${quality || "auto"},c_limit,w_${width}/${rest}`;
}
// Fixed aspect-ratio crops for structured data (Google recommends 16:9, 4:3 and 1:1 variants).
export function cloudinaryCrop(src: string, width: number, height: number) {
  const match = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/.exec(src);
  return match ? `${match[1]}f_jpg,q_auto,c_fill,g_auto,w_${width},h_${height}/${match[2]}` : src;
}
export default function loader({ src, width, quality }: { src: string; width: number; quality?: number }) { return cloudinaryUrl(src, width, quality); }
