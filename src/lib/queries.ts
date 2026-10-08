import mongoose, { type QueryFilter } from "mongoose";
import { Article, AuditLog, Category, Tag, User } from "@/models";
import { connectDb } from "./db";
import { databaseConfigured } from "./env";
import { assertOwner, publicFilter, statuses, type Actor } from "./permissions";
import { objectId } from "./validation";
import { assert } from "./errors";
import { serialize, type ArticleRecord, type AuditRecord, type SearchParams, type Taxonomy } from "@/types";
export const scalar = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const pageNumber = (value: string | string[] | undefined) => Math.max(1, Math.min(10000, Number.parseInt(scalar(value)) || 1));
const relations = [{ path: "author", select: "name bio avatar" }, { path: "category", select: "name slug" }, { path: "tags", select: "name slug" }];
const cardFields = "title slug excerpt category author tags status featured views coverImage createdAt updatedAt publishedAt submittedAt deletedAt revision";
export async function taxonomies(activeOnly = true) {
  if (!databaseConfigured()) return { categories: [] as Taxonomy[], tags: [] as Taxonomy[] };
  await connectDb(); const filter = activeOnly ? { isActive: true } : {};
  const [categories, tags] = await Promise.all([Category.find(filter).sort({ name: 1 }).lean(), Tag.find(filter).sort({ name: 1 }).lean()]);
  return { categories: serialize<Taxonomy[]>(categories), tags: serialize<Taxonomy[]>(tags) };
}
export async function listArticles(params: SearchParams = {}, actor?: Actor, extra: QueryFilter<unknown> = {}) {
  const page = pageNumber(params.page); const limit = 12;
  if (!databaseConfigured()) return { items: [] as ArticleRecord[], total: 0, page, pages: 1 };
  await connectDb();
  const filter: QueryFilter<unknown> = actor ? { deletedAt: actor.role === "ADMIN" && scalar(params.deleted) === "true" ? { $ne: null } : null } : { ...publicFilter };
  if (actor?.role === "WRITER") filter.author = new mongoose.Types.ObjectId(actor.id);
  if (actor && statuses.includes(scalar(params.status) as typeof statuses[number])) filter.status = scalar(params.status);
  if (actor?.role === "ADMIN" && objectId.safeParse(scalar(params.author)).success) filter.author = new mongoose.Types.ObjectId(scalar(params.author));
  if (objectId.safeParse(scalar(params.category)).success) filter.category = new mongoose.Types.ObjectId(scalar(params.category));
  if (scalar(params.featured) === "true") filter.featured = true;
  const q = scalar(params.q).trim().slice(0, 100);
  if (q) {
    const tags = await Tag.find({ name: { $regex: escapeRegex(q), $options: "i" } }).select("_id").limit(30).lean();
    filter.$or = [{ $text: { $search: q } }, ...(tags.length ? [{ tags: { $in: tags.map(t => t._id) } }] : [])];
  }
  const from = scalar(params.from); const to = scalar(params.to);
  if (/^\d{4}-\d{2}-\d{2}$/.test(from) || /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const range: { $gte?: Date; $lt?: Date } = {};
    if (from && Number.isFinite(Date.parse(from))) range.$gte = new Date(`${from}T00:00:00Z`);
    if (to && Number.isFinite(Date.parse(to))) range.$lt = new Date(Date.parse(`${to}T00:00:00Z`) + 86400000);
    filter[actor ? "createdAt" : "publishedAt"] = range;
  }
  Object.assign(filter, extra);
  const sort: Record<string, 1 | -1> = scalar(params.sort) === "views" ? { views: -1, _id: -1 } : scalar(params.sort) === "oldest" ? { createdAt: 1, _id: 1 } : scalar(params.sort) === "updated" ? { updatedAt: -1, _id: -1 } : { [actor ? "createdAt" : "publishedAt"]: -1, _id: -1 };
  const [items, total] = await Promise.all([Article.find(filter).select(cardFields).populate(relations).sort(sort).skip((page - 1) * limit).limit(limit).lean(), Article.countDocuments(filter)]);
  return { items: serialize<ArticleRecord[]>(items), total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}
export async function privateArticle(actor: Actor, id: string) {
  objectId.parse(id); await connectDb();
  const raw = await Article.findById(id).lean(); assert(raw, 404, "Article not found"); assertOwner(actor, raw.author);
  const article = await Article.findById(id).populate(relations).lean();
  const history = await AuditLog.find({ articleId: id }).populate("actorId", "name").sort({ createdAt: -1 }).limit(100).lean();
  return { article: serialize<ArticleRecord>(article), history: serialize<AuditRecord[]>(history) };
}
export async function publicArticle(slug: string) {
  if (!databaseConfigured()) return null;
  await connectDb();
  const article = await Article.findOne({ ...publicFilter, slug }).select("-rejectionReason -reviewedBy -approvedAt -rejectedAt -deletedAt -revision -__v").populate(relations).lean();
  return article ? serialize<ArticleRecord>(article) : null;
}
export async function dashboardStats(actor: Actor, author?: string) {
  await connectDb();
  const owner = actor.role === "WRITER" ? actor.id : author;
  const match = { deletedAt: null, ...(owner ? { author: new mongoose.Types.ObjectId(objectId.parse(owner)) } : {}) };
  const [counts, top, writers, activeWriters, activity] = await Promise.all([
    Article.aggregate<{ _id: string; count: number; views: number }>([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 }, views: { $sum: "$views" } } }]),
    Article.find(match).select(cardFields).populate(relations).sort({ views: -1 }).limit(5).lean(),
    actor.role === "ADMIN" ? User.countDocuments({ role: "WRITER" }) : Promise.resolve(0),
    actor.role === "ADMIN" ? User.countDocuments({ role: "WRITER", isActive: true }) : Promise.resolve(0),
    actor.role === "ADMIN" && !owner ? AuditLog.find().populate("actorId", "name").populate("articleId", "title").sort({ createdAt: -1 }).limit(8).lean() : Promise.resolve([]),
  ]);
  return { counts, total: counts.reduce((n, c) => n + c.count, 0), views: counts.reduce((n, c) => n + c.views, 0), top: serialize<ArticleRecord[]>(top), writers, activeWriters, activity: serialize<AuditRecord[]>(activity) };
}
