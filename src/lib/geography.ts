import "server-only";
import mongoose, { type PipelineStage } from "mongoose";
import { cache } from "react";
import { Article, DailyArticleCountryMetric } from "@/models";
import { connectDb } from "./db";
import { assert } from "./errors";
import { assertOwner, type Actor } from "./permissions";
import { objectId } from "./validation";
import { geographyFilters } from "./geography-policy";
import type { SearchParams } from "@/types";

export type CountryRow = {
  _id: string;
  views: number;
  previous: number;
  percentage: number;
  growth: number | null;
};
export type RankingRow = { _id: string; name: string; views: number };
export type TrendRow = { date: string; country: string; views: number };
export type GeographyScope = { article?: string; author?: string };

// This service receives only the authenticated actor from server auth, never a request body.
// Request-local memoization cannot reuse one user's report in another user's request.
export const geographyReport = cache(
  async (actor: Actor, params: SearchParams, scope: GeographyScope = {}) => {
    assert(
      actor && ["ADMIN", "WRITER"].includes(actor.role),
      403,
      "Analytics access required",
    );
    const filters = geographyFilters(params);
    if (scope.author) objectId.parse(scope.author);
    if (scope.article) objectId.parse(scope.article);
    if (actor.role === "WRITER" && scope.author)
      assert(
        scope.author === actor.id,
        403,
        "You do not have access to this writer's analytics",
      );
    await connectDb();
    if (scope.article) {
      const article = await Article.findOne({
        _id: scope.article,
        deletedAt: null,
      })
        .select("author status")
        .lean();
      assert(article, 404, "Article not found");
      assertOwner(actor, article.author);
      if (actor.role === "WRITER")
        assert(
          article.status === "PUBLISHED",
          403,
          "Analytics are available for your published articles only",
        );
    }
    const owner = actor.role === "WRITER" ? actor.id : scope.author;
    const base = (from: string): PipelineStage[] => [
      {
        $match: {
          day: { $gte: from, $lte: filters.to },
          ...(scope.article
            ? { article: new mongoose.Types.ObjectId(scope.article) }
            : {}),
        },
      },
      {
        $lookup: {
          from: "articles",
          localField: "article",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                title: 1,
                author: 1,
                category: 1,
                deletedAt: 1,
                status: 1,
              },
            },
          ],
          as: "story",
        },
      },
      { $unwind: "$story" },
      {
        $match: {
          "story.deletedAt": null,
          ...(owner
            ? { "story.author": new mongoose.Types.ObjectId(owner) }
            : {}),
          ...(actor.role === "WRITER" ? { "story.status": "PUBLISHED" } : {}),
        },
      },
    ];
    const rawCountries = await DailyArticleCountryMetric.aggregate<
      Omit<CountryRow, "percentage" | "growth">
    >([
      ...base(filters.previousFrom),
      {
        $group: {
          _id: "$countryCode",
          views: {
            $sum: {
              $cond: [{ $gte: ["$day", filters.from] }, "$pageViews", 0],
            },
          },
          previous: {
            $sum: { $cond: [{ $lt: ["$day", filters.from] }, "$pageViews", 0] },
          },
        },
      },
      { $sort: { views: -1, _id: 1 } },
    ]).option({ maxTimeMS: 15000 });
    const total = rawCountries.reduce((sum, c) => sum + c.views, 0);
    const unknown = rawCountries.find((c) => c._id === "UNKNOWN")?.views || 0;
    const countries: CountryRow[] = rawCountries.map((c) => ({
      ...c,
      percentage: total ? (c.views / total) * 100 : 0,
      growth: c.previous ? ((c.views - c.previous) / c.previous) * 100 : null,
    }));
    const selected: PipelineStage.FacetPipelineStage[] = filters.country
      ? [{ $match: { countryCode: filters.country } }]
      : [];
    const ranking = (
      field: string,
      collection: string,
      fallback: string,
    ): PipelineStage.FacetPipelineStage[] => [
      ...selected,
      { $group: { _id: field, views: { $sum: "$pageViews" } } },
      { $sort: { views: -1, _id: 1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: collection,
          localField: "_id",
          foreignField: "_id",
          as: "entity",
        },
      },
      {
        $project: {
          _id: { $toString: "$_id" },
          name: { $ifNull: [{ $first: "$entity.name" }, fallback] },
          views: 1,
        },
      },
    ];
    const trendCountries = filters.country
      ? [filters.country]
      : countries
          .filter((c) => c.views > 0)
          .slice(0, 5)
          .map((c) => c._id);
    const [result] = await DailyArticleCountryMetric.aggregate<{
      articles: RankingRow[];
      articleCount: { count: number }[];
      writers: RankingRow[];
      categories: RankingRow[];
      sources: RankingRow[];
      trend: TrendRow[];
    }>([
      ...base(filters.from),
      {
        $facet: {
          articles: [
            ...selected,
            {
              $group: {
                _id: "$article",
                name: { $first: "$story.title" },
                views: { $sum: "$pageViews" },
              },
            },
            { $sort: { views: -1, _id: 1 } },
            { $skip: (filters.page - 1) * 10 },
            { $limit: 10 },
            { $set: { _id: { $toString: "$_id" } } },
          ],
          articleCount: [
            ...selected,
            { $group: { _id: "$article" } },
            { $count: "count" },
          ],
          writers:
            actor.role === "ADMIN"
              ? ranking("$story.author", "users", "Former writer")
              : [{ $match: { _id: null } }],
          categories: ranking("$story.category", "categories", "Uncategorized"),
          sources: [
            ...selected,
            {
              $group: {
                _id: "$source",
                name: { $first: "$source" },
                views: { $sum: "$pageViews" },
              },
            },
            { $sort: { views: -1, _id: 1 } },
          ],
          trend: [
            { $match: { countryCode: { $in: trendCountries } } },
            {
              $group: {
                _id: {
                  country: "$countryCode",
                  date: {
                    $dateTrunc: {
                      date: { $dateFromString: { dateString: "$day" } },
                      unit: filters.interval,
                      timezone: "UTC",
                      ...(filters.interval === "week"
                        ? { startOfWeek: "monday" }
                        : {}),
                    },
                  },
                },
                views: { $sum: "$pageViews" },
              },
            },
            {
              $project: {
                _id: 0,
                country: "$_id.country",
                date: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$_id.date",
                    timezone: "UTC",
                  },
                },
                views: 1,
              },
            },
            { $sort: { date: 1, country: 1 } },
          ],
        },
      },
    ]).option({ maxTimeMS: 15000 });
    return {
      ...filters,
      total,
      known: total - unknown,
      unknown,
      countries,
      selectedViews: filters.country
        ? countries.find((c) => c._id === filters.country)?.views || 0
        : total,
      articles: result?.articles || [],
      writers: result?.writers || [],
      categories: result?.categories || [],
      sources: result?.sources || [],
      trend: result?.trend || [],
      trendCountries,
      pages: Math.max(1, Math.ceil((result?.articleCount[0]?.count || 0) / 10)),
      provider: "first-party" as const,
      uniqueVisitorsSupported: false as const,
    };
  },
);
export type GeographyReport = Awaited<ReturnType<typeof geographyReport>>;
