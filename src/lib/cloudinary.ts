import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { requiredEnv } from "./env";
import { Article, Asset } from "@/models";
import { assertEditable, type Actor } from "./permissions";
import { assert } from "./errors";
import { audit } from "./articles";
import { objectId } from "./validation";
import { connectDb } from "./db";
function client() {
  cloudinary.config({ cloud_name: requiredEnv("CLOUDINARY_CLOUD_NAME"), api_key: requiredEnv("CLOUDINARY_API_KEY"), api_secret: requiredEnv("CLOUDINARY_API_SECRET"), secure: true });
  return cloudinary;
}
export function imageType(bytes: Buffer): string | null {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (bytes.toString("ascii", 4, 8) === "ftyp" && ["avif", "avis"].includes(bytes.toString("ascii", 8, 12))) return "image/avif";
  return null;
}
export async function cleanAsset(publicId: string) {
  try {
    const result = await client().uploader.destroy(publicId, { resource_type: "image", invalidate: true });
    if (result.result === "ok" || result.result === "not found") await Asset.deleteOne({ publicId, state: "DELETE_PENDING" });
    else console.error("Asset cleanup pending", { publicId });
  } catch { console.error("Asset cleanup pending", { publicId }); }
}
export async function replaceCover(actor: Actor, id: string, bytes: Buffer, mime: string, alt: string, revision: number) {
  objectId.parse(id); assert(bytes.length > 0 && bytes.length <= 5 * 1024 * 1024, 400, "Choose an image smaller than 5 MB");
  assert(imageType(bytes) === mime, 400, "Choose a valid JPEG, PNG, WebP, or AVIF image");
  assert(alt.trim().length > 0 && alt.length <= 250, 400, "Add image alt text (up to 250 characters)");
  await connectDb(); const existing = await Article.findById(id); assert(existing, 404, "Article not found"); assertEditable(actor, existing); assert(existing.revision === revision, 409, "Article changed. Reload before uploading.");
  const publicId = `signal/${id}/${randomUUID()}`;
  // Register cleanup before uploading so a process interruption cannot lose the asset reference.
  await Asset.create({ publicId, owner: actor.id, article: id, state: "DELETE_PENDING" });
  let uploaded: UploadApiResponse;
  try {
    uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = client().uploader.upload_stream({ public_id: publicId, resource_type: "image", allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"], overwrite: false, transformation: [{ width: 2400, height: 2400, crop: "limit" }] }, (error, result) => { if (error || !result) reject(error || new Error("Upload failed")); else resolve(result); });
      stream.end(bytes);
    });
    let previous: string | undefined;
    await mongoose.connection.transaction(async session => {
      const article = await Article.findById(id).session(session); assert(article, 404, "Article not found"); assertEditable(actor, article); assert(article.revision === revision, 409, "Article changed. Reload before uploading.");
      previous = article.coverImage?.publicId || undefined;
      article.coverImage = { url: uploaded.secure_url, secureUrl: uploaded.secure_url, publicId, width: uploaded.width, height: uploaded.height, alt: alt.trim() };
      article.revision += 1; await article.save({ session });
      await Asset.updateOne({ publicId }, { state: "ACTIVE" }, { session });
      if (previous) await Asset.updateOne({ publicId: previous }, { state: "DELETE_PENDING" }, { session });
      await audit(actor, "ARTICLE_UPDATED", article._id, "Cover image replaced", session);
    });
    if (previous) await cleanAsset(previous);
    return uploaded.secure_url;
  } catch (error) { await cleanAsset(publicId); throw error; }
}
export async function removeCover(actor: Actor, id: string, revision: number) {
  objectId.parse(id); await connectDb(); let old: string | undefined;
  await mongoose.connection.transaction(async session => {
    const article = await Article.findById(id).session(session); assert(article, 404, "Article not found"); assertEditable(actor, article); assert(article.revision === revision, 409, "Article changed. Reload before deleting the cover.");
    old = article.coverImage?.publicId || undefined; article.coverImage = undefined; article.revision += 1; await article.save({ session });
    if (old) await Asset.updateOne({ publicId: old }, { state: "DELETE_PENDING" }, { session });
    await audit(actor, "ARTICLE_UPDATED", article._id, "Cover image removed", session);
  });
  if (old) await cleanAsset(old);
}
