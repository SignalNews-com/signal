import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { connectDb } from "../src/lib/db";
import { Asset, Article } from "../src/models";
import { cleanAsset } from "../src/lib/cloudinary";
async function main() { loadEnvConfig(process.cwd()); await connectDb(); const pending = await Asset.find({ state: "DELETE_PENDING", updatedAt: { $lt: new Date(Date.now() - 3600000) } }).limit(100).lean(); for (const asset of pending) { if (!await Article.exists({ "coverImage.publicId": asset.publicId })) await cleanAsset(asset.publicId); } console.log("Processed pending asset cleanup batch."); }
main().catch(() => { console.error("Asset cleanup failed. Check MongoDB and Cloudinary configuration."); process.exitCode = 1; }).finally(() => mongoose.disconnect());
