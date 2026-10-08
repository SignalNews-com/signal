import type { MetadataRoute } from "next";
import { Article, Category, Tag } from "@/models";
import { connectDb } from "@/lib/db";
import { databaseConfigured, siteUrl } from "@/lib/env";
import { publicFilter } from "@/lib/permissions";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const base = siteUrl(); const fixed = ["", "/latest", "/about", "/privacy"].map(path => ({ url: `${base}${path}` })); if (!databaseConfigured()) return fixed; await connectDb(); const [articles, categories, tags] = await Promise.all([Article.find(publicFilter).select("slug updatedAt").sort({ publishedAt: -1 }).limit(45000).lean(), Category.find({ isActive: true }).select("slug updatedAt").limit(1000).lean(), Tag.find({ isActive: true }).select("slug updatedAt").limit(3000).lean()]); return [...fixed, ...articles.map(a => ({ url: `${base}/article/${a.slug}`, lastModified: a.updatedAt })), ...categories.map(c => ({ url: `${base}/category/${c.slug}`, lastModified: c.updatedAt })), ...tags.map(t => ({ url: `${base}/tag/${t.slug}`, lastModified: t.updatedAt }))]; }
