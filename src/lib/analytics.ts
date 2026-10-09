import mongoose from "mongoose";
import { Article, DailyView, User } from "@/models";
import { connectDb } from "./db";
import type { Actor } from "./permissions";
import { objectId } from "./validation";
import { scalar } from "./queries";
import type { SearchParams } from "@/types";
export type SeriesPoint = { _id: string; count: number };
// Days without views are absent from DailyView; charts need them as explicit zeros.
export function fillDays(points: SeriesPoint[], from: string, to: string) {
  const counts = new Map(points.map(p => [p._id, p.count])); const out: SeriesPoint[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`), end = Date.parse(`${to}T00:00:00Z`); t <= end && out.length < 1000; t += 86400000) { const day = new Date(t).toISOString().slice(0, 10); out.push({ _id: day, count: counts.get(day) || 0 }); }
  return out;
}
export const requestTime = () => Date.now();
export const rangePresets = () => { const to = new Date().toISOString().slice(0, 10); return [7, 30, 90].map(days => ({ label: `${days} days`, from: new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10), to })); };
export async function articleViews(articleId: string, days = 30) {
  await connectDb(); const to = new Date().toISOString().slice(0, 10); const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const rows = await DailyView.find({ article: new mongoose.Types.ObjectId(objectId.parse(articleId)), day: { $gte: from, $lte: to } }).select("day views").lean();
  return fillDays(rows.map(r => ({ _id: r.day, count: r.views })), from, to);
}
export async function analytics(actor: Actor, params: SearchParams, author?: string) {
  await connectDb(); const today = new Date().toISOString().slice(0, 10);
  const validDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s));
  const from = validDay(scalar(params.from)) ? scalar(params.from) : new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const to = validDay(scalar(params.to)) ? scalar(params.to) : today;
  const owner = actor.role === "WRITER" ? actor.id : author;
  const match = { deletedAt: null, ...(owner ? { author: new mongoose.Types.ObjectId(objectId.parse(owner)) } : {}) };
  const [views, publishing, categories, statuses, leaderboard, topArticles] = await Promise.all([
    DailyView.aggregate<SeriesPoint>([{ $match: { day: { $gte: from, $lte: to } } }, { $lookup: { from: "articles", localField: "article", foreignField: "_id", as: "story" } }, { $unwind: "$story" }, { $match: { "story.deletedAt": null, ...(owner ? { "story.author": new mongoose.Types.ObjectId(owner) } : {}) } }, { $group: { _id: "$day", count: { $sum: "$views" } } }, { $sort: { _id: 1 } }]),
    Article.aggregate<SeriesPoint>([{ $match: { ...match, publishedAt: { $gte: new Date(`${from}T00:00:00Z`), $lt: new Date(Date.parse(`${to}T00:00:00Z`) + 86400000) } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$publishedAt", timezone: "UTC" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Article.aggregate<{ _id: string; count: number; views: number }>([{ $match: match }, { $group: { _id: "$category", count: { $sum: 1 }, views: { $sum: "$views" } } }, { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } }, { $project: { _id: { $ifNull: [{ $first: "$category.name" }, "Uncategorized"] }, count: 1, views: 1 } }, { $sort: { count: -1 } }]),
    Article.aggregate<SeriesPoint>([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    actor.role === "ADMIN" ? Article.aggregate<{ _id: string; name: string; count: number; published: number; views: number }>([{ $match: match }, { $group: { _id: "$author", count: { $sum: 1 }, published: { $sum: { $cond: [{ $eq: ["$status", "PUBLISHED"] }, 1, 0] } }, views: { $sum: "$views" } } }, { $sort: { views: -1 } }, { $limit: 10 }, { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "writer" } }, { $project: { name: { $first: "$writer.name" }, count: 1, published: 1, views: 1 } }]) : Promise.resolve([]),
    DailyView.aggregate<{ _id: string; title: string; count: number }>([{ $match: { day: { $gte: from, $lte: to } } }, { $lookup: { from: "articles", localField: "article", foreignField: "_id", as: "story" } }, { $unwind: "$story" }, { $match: { "story.deletedAt": null, ...(owner ? { "story.author": new mongoose.Types.ObjectId(owner) } : {}) } }, { $group: { _id: "$article", title: { $first: "$story.title" }, count: { $sum: "$views" } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
  ]);
  const series = fillDays(views, from, to);
  return { from, to, views: series, publishing, categories, statuses, leaderboard, topArticles, totalViews: views.reduce((sum, d) => sum + d.count, 0) };
}
export async function listWriters(params: SearchParams) {
  await connectDb(); const page = Math.max(1, Number.parseInt(scalar(params.page)) || 1);
  const q = scalar(params.q).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = { role: "WRITER", ...(q ? { $or: [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }] } : {}), ...(["active", "inactive"].includes(scalar(params.status)) ? { isActive: scalar(params.status) === "active" } : {}) };
  const result = await User.aggregate<{ items: { _id: string; name: string; email: string; bio: string; isActive: boolean; lastLoginAt?: string; createdAt: string; stats?: { total: number; published: number; submitted: number; rejected: number; views: number } }[]; total: { count: number }[] }>([
    { $match: match }, { $lookup: { from: "articles", let: { owner: "$_id" }, pipeline: [{ $match: { $expr: { $eq: ["$author", "$$owner"] }, deletedAt: null } }, { $group: { _id: null, total: { $sum: 1 }, views: { $sum: "$views" }, published: { $sum: { $cond: [{ $eq: ["$status", "PUBLISHED"] }, 1, 0] } }, submitted: { $sum: { $cond: [{ $eq: ["$status", "SUBMITTED"] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] } } } }], as: "stats" } }, { $set: { stats: { $first: "$stats" } } }, { $sort: scalar(params.sort) === "views" ? { "stats.views": -1, _id: -1 } : scalar(params.sort) === "name" ? { name: 1, _id: 1 } : { createdAt: -1, _id: -1 } }, { $project: { passwordHash: 0 } }, { $facet: { items: [{ $skip: (page - 1) * 12 }, { $limit: 12 }], total: [{ $count: "count" }] } },
  ]);
  return { items: result[0]?.items || [], page, pages: Math.max(1, Math.ceil((result[0]?.total[0]?.count || 0) / 12)) };
}
