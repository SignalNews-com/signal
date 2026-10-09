import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { connectDb } from "../src/lib/db";
import { Category } from "../src/models";
import { othersCategory, primaryCategories } from "../src/lib/categories";
// Creates (or re-activates) the navigation sections and the "Others" catch-all. Existing names/descriptions are kept.
async function main() {
  loadEnvConfig(process.cwd()); await connectDb();
  for (const c of [...primaryCategories, othersCategory]) {
    const result = await Category.updateOne({ slug: c.slug }, { $setOnInsert: { name: c.name, description: c.description }, $set: { isActive: true } }, { upsert: true });
    console.log(`${result.upsertedCount ? "Created" : "Kept"} category: ${c.name} (/category/${c.slug})`);
  }
  console.log("Done. Stories in any other category appear under Others. Revalidate the site (or wait up to an hour) for the public pages to pick up new categories.");
}
main().catch(() => { console.error("Category sync failed. Check MONGODB_URI."); process.exitCode = 1; }).finally(() => mongoose.disconnect());
