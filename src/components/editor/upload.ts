"use client";
const accepted = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const serverLimit = 5 * 1024 * 1024;
// Resize and re-encode in the browser so large phone photos upload quickly and stay under the 5 MB server limit.
export async function prepareImage(file: File, maxSide = 2400): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file (JPEG, PNG, WebP, or AVIF).");
  if (file.size > 30 * 1024 * 1024) throw new Error("Choose an image smaller than 30 MB.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { if (accepted.includes(file.type) && file.size <= serverLimit) return file; throw new Error("This image format isn't supported here. Use JPEG, PNG, WebP, or AVIF."); }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && accepted.includes(file.type) && file.size <= 1.5 * 1024 * 1024) { bitmap.close(); return file; }
  const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const encode = (type: string, quality: number) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality));
  // Some browsers silently fall back to PNG for WebP; use JPEG then.
  let blob = await encode("image/webp", 0.86);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.86);
  if (!blob) throw new Error("Couldn't process this image. Try a different file.");
  if (blob.size > serverLimit) throw new Error("This image is still larger than 5 MB after compression. Try a smaller image.");
  return blob;
}
async function send(url: string, body: Blob, headers: Record<string, string>) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": body.type, ...headers }, body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Image upload failed");
  return result;
}
export async function uploadContentImage(file: File, articleId?: string): Promise<{ url: string; width: number; height: number }> {
  return send("/api/uploads", await prepareImage(file, 2000), articleId ? { "X-Article-Id": articleId } : {});
}
export async function uploadCover(file: File, articleId: string, revision: number, alt: string): Promise<{ url: string; revision: number }> {
  return send(`/api/articles/${articleId}/cover`, await prepareImage(file), { "X-Article-Revision": String(revision), "X-Image-Alt": encodeURIComponent(alt) });
}
export async function uploadAvatar(file: File): Promise<{ url: string }> { return send("/api/profile/avatar", await prepareImage(file, 800), {}); }
export const altFromFilename = (name: string) => name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
