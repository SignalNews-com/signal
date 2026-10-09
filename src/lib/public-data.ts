import "server-only";
import { unstable_cache } from "next/cache";
import mongoose, { type QueryFilter } from "mongoose";
import { Article, Category, DailyView, Tag, User } from "@/models";
import { connectDb } from "./db";
import { databaseConfigured } from "./env";
import { publicFilter } from "./permissions";
import { listArticles, publicArticle, scalar, taxonomies } from "./queries";
import { objectId } from "./validation";
import { primarySlugs } from "./categories";
import { publicTags } from "./revalidate";
import { serialize, type ArticleRecord, type Person, type SearchParams, type Taxonomy } from "@/types";
// Reader-facing data is served from the Next.js data cache. Editorial changes call refreshPublic()
// (src/lib/revalidate.ts); the time-based revalidate keeps view counts and "most read" reasonably fresh.
const LIST_TTL = 300;
const oid = (id: string) => new mongoose.Types.ObjectId(id);
export type PublicScope = { category?: string; categoryNotIn?: string[]; tag?: string; author?: string; excludeId?: string; relatedTo?: { category?: string; tags: string[] } };
function scopeFilter(scope: PublicScope): QueryFilter<unknown> {
  const filter: QueryFilter<unknown> = {};
  if (scope.category) filter.category = oid(scope.category);
  if (scope.categoryNotIn) filter.category = { $nin: scope.categoryNotIn.map(oid) };
  if (scope.tag) filter.tags = oid(scope.tag);
  if (scope.author) filter.author = oid(scope.author);
  if (scope.excludeId) filter._id = { $ne: oid(scope.excludeId) };
  if (scope.relatedTo) filter.$or = [...(scope.relatedTo.category ? [{ category: oid(scope.relatedTo.category) }] : []), { tags: { $in: scope.relatedTo.tags.map(oid) } }];
  return filter;
}
// Only these parameters affect public listings; dropping the rest keeps cache keys bounded.
const listKeys = ["page", "sort", "featured", "from", "to"] as const;
const cachedList = unstable_cache(async (params: SearchParams, scope: PublicScope) => listArticles(params, undefined, scopeFilter(scope)), ["public-list-v2"], { tags: [publicTags.articles, publicTags.people], revalidate: LIST_TTL });
export async function publicList(params: SearchParams = {}, scope: PublicScope = {}) {
  const clean: SearchParams = {}; for (const key of listKeys) if (scalar(params[key])) clean[key] = scalar(params[key]);
  const q = scalar(params.q).trim().slice(0, 100);
  // Searches are open-ended, so they bypass the cache (and are rate limited by the search page).
  if (q || !databaseConfigured()) return listArticles({ ...clean, q }, undefined, scopeFilter(scope));
  return cachedList(clean, scope);
}
export const cachedArticle = unstable_cache(async (slug: string) => publicArticle(slug), ["public-article-v2"], { tags: [publicTags.articles, publicTags.people], revalidate: LIST_TTL });
export const publicTaxonomies = unstable_cache(async () => taxonomies(true), ["public-taxonomy-v2"], { tags: [publicTags.taxonomy], revalidate: 3600 });
export async function categoryBySlug(slug: string) { return (await publicTaxonomies()).categories.find(c => c.slug === slug) || null; }
export async function tagBySlug(slug: string) { return (await publicTaxonomies()).tags.find(t => t.slug === slug) || null; }
export async function primaryCategoryIds() { return (await publicTaxonomies()).categories.filter(c => primarySlugs.includes(c.slug)).map(c => c._id); }
export const publicAuthor = unstable_cache(async (id: string): Promise<Person | null> => {
  if (!databaseConfigured() || !objectId.safeParse(id).success) return null;
  await connectDb(); const author = await User.findById(id).select("name bio avatar").lean();
  return author ? serialize<Person>(author) : null;
}, ["public-author-v2"], { tags: [publicTags.people], revalidate: 3600 });
// "Most read" uses the last 7 days of views so the list reflects what readers follow now.
export const trendingArticles = unstable_cache(async (limit = 5): Promise<ArticleRecord[]> => {
  if (!databaseConfigured()) return [];
  await connectDb(); const since = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const top = await DailyView.aggregate<{ _id: mongoose.Types.ObjectId; views: number }>([{ $match: { day: { $gte: since } } }, { $group: { _id: "$article", views: { $sum: "$views" } } }, { $sort: { views: -1 } }, { $limit: limit * 3 }]);
  const recent = top.length ? (await listArticles({}, undefined, { _id: { $in: top.map(t => t._id) } })).items : [];
  const order = new Map(top.map((t, i) => [t._id.toString(), i]));
  const ranked = recent.toSorted((a, b) => (order.get(a._id) ?? 99) - (order.get(b._id) ?? 99)).slice(0, limit);
  if (ranked.length >= limit) return ranked;
  const allTime = (await listArticles({ sort: "views" })).items.filter(a => !ranked.some(r => r._id === a._id));
  return [...ranked, ...allTime].slice(0, limit);
}, ["public-trending-v2"], { tags: [publicTags.articles], revalidate: 600 });
export type FeedItem = { slug: string; title: string; excerpt: string; publishedAt: string; updatedAt: string; author: string; category: string; tags: string[]; image?: { url: string; alt: string; width: number; height: number } };
export const feedArticles = unstable_cache(async (limit: number, sinceMs = 0): Promise<FeedItem[]> => {
  if (!databaseConfigured()) return [];
  await connectDb();
  const items = await Article.find({ ...publicFilter, ...(sinceMs ? { publishedAt: { $gte: new Date(sinceMs) } } : {}) }).select("slug title excerpt publishedAt updatedAt coverImage author category tags").populate([{ path: "author", select: "name" }, { path: "category", select: "name" }, { path: "tags", select: "name" }]).sort({ publishedAt: -1 }).limit(limit).lean();
  return serialize<ArticleRecord[]>(items).map(a => ({ slug: a.slug, title: a.title, excerpt: a.excerpt, publishedAt: a.publishedAt || a.createdAt, updatedAt: a.updatedAt, author: a.author?.name || "SIGNAL", category: a.category?.name || "", tags: a.tags.map(t => t.name), image: a.coverImage ? { url: a.coverImage.secureUrl, alt: a.coverImage.alt, width: a.coverImage.width, height: a.coverImage.height } : undefined }));
}, ["public-feed-v2"], { tags: [publicTags.articles], revalidate: LIST_TTL });
type Dated = Taxonomy & { updatedAt: string };
export const sitemapData = unstable_cache(async () => {
  if (!databaseConfigured()) return { articles: [], categories: [] as Dated[], tags: [] as Dated[], authors: [] as string[] };
  await connectDb();
  const [articles, categories, tags, authors] = await Promise.all([
    Article.find(publicFilter).select("slug updatedAt title coverImage.secureUrl").sort({ publishedAt: -1 }).limit(45000).lean(),
    Category.find({ isActive: true }).select("slug updatedAt").limit(1000).lean(),
    Tag.find({ isActive: true }).select("slug updatedAt").limit(3000).lean(),
    Article.distinct("author", publicFilter),
  ]);
  return { articles: serialize<{ slug: string; updatedAt: string; title: string; coverImage?: { secureUrl?: string } }[]>(articles), categories: serialize<Dated[]>(categories), tags: serialize<Dated[]>(tags), authors: authors.map(String) };
}, ["public-sitemap-v2"], { tags: [publicTags.articles, publicTags.taxonomy], revalidate: 3600 });
