import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { sitemapData } from "@/lib/public-data";
import { navLinks } from "@/lib/categories";
// Rendered per request from cached data (no database access at build time).
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl(); const data = await sitemapData(); const now = new Date();
  const sections = new Set(navLinks.map(([href]) => href));
  const fixed: MetadataRoute.Sitemap = [{ url: base, lastModified: data.articles[0]?.updatedAt || now, changeFrequency: "hourly", priority: 1 }, ...[...sections].map(path => ({ url: `${base}${path}`, changeFrequency: "hourly" as const, priority: 0.8 })), ...["/about", "/privacy"].map(path => ({ url: `${base}${path}`, changeFrequency: "yearly" as const, priority: 0.2 }))];
  return [...fixed,
    ...data.articles.map(a => ({ url: `${base}/article/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "weekly" as const, priority: 0.7, images: a.coverImage?.secureUrl ? [a.coverImage.secureUrl] : undefined })),
    ...data.categories.filter(c => !sections.has(`/category/${c.slug}`)).map(c => ({ url: `${base}/category/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "daily" as const, priority: 0.5 })),
    ...data.tags.map(t => ({ url: `${base}/tag/${t.slug}`, lastModified: t.updatedAt, changeFrequency: "daily" as const, priority: 0.4 })),
    ...data.authors.map(id => ({ url: `${base}/author/${id}`, changeFrequency: "weekly" as const, priority: 0.3 })),
  ];
}
