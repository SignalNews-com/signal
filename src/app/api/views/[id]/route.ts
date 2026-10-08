import mongoose from "mongoose";
import { cookies } from "next/headers";
import { Article, DailyView, DailyArticleCountryMetric, ViewReceipt } from "@/models";
import { publicFilter } from "@/lib/permissions";
import { objectId } from "@/lib/validation";
import { clientKey, newToken, rateLimit, sameOrigin, tokenDigest } from "@/lib/security";
import { apiError, json, jsonBody } from "@/lib/http";
import { assert } from "@/lib/errors";
import { currentActor } from "@/lib/auth";
import { collectionAllowed, detectCountry, trafficSource } from "@/lib/geography-policy";
import { siteUrl } from "@/lib/env";
import { z } from "zod";
const attributionSchema = z.object({ referrer: z.string().max(2048).optional(), utmSource: z.string().max(100).optional(), utmMedium: z.string().max(100).optional() });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request); const id = objectId.parse((await context.params).id);
    const jar = await cookies();
    if (!collectionAllowed(request.headers, jar.get("signal-analytics-consent")?.value)) return json({ counted: false });
    if (/bot|crawl|spider|preview|headless/i.test(request.headers.get("user-agent") || "")) return json({ counted: false });
    if (await currentActor()) return json({ counted: false });
    await rateLimit(`views:${clientKey(request)}`, 120, 60000);
    const input = attributionSchema.parse(await jsonBody(request));
    const countryCode = detectCountry(request.headers); const source = trafficSource(input, siteUrl());
    const candidate = jar.get("signal-reader")?.value; const token = candidate && /^[a-f0-9]{64}$/.test(candidate) ? candidate : newToken();
    const day = new Date().toISOString().slice(0, 10); const receipt = tokenDigest(`${id}:${token}:${day}`);
    const counted = await mongoose.connection.transaction(async session => {
      const article = await Article.findOne({ _id: id, ...publicFilter }).session(session); assert(article, 404, "Article not found");
      if (await ViewReceipt.exists({ _id: receipt }).session(session)) return false;
      await ViewReceipt.create([{ _id: receipt, expiresAt: new Date(Date.now() + 2 * 86400000) }], { session });
      await Article.updateOne({ _id: id, ...publicFilter }, { $inc: { views: 1 } }, { session });
      await DailyView.updateOne({ article: id, day }, { $inc: { views: 1 } }, { upsert: true, session });
      await DailyArticleCountryMetric.updateOne({ article: id, day, countryCode, source }, { $inc: { pageViews: 1 } }, { upsert: true, session });
      return true;
    });
    const response = json({ counted }); response.cookies.set("signal-reader", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 86400, path: "/api/views" }); return response;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) return json({ counted: false });
    return apiError(error);
  }
}
