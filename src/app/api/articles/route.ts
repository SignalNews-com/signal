import { requireActor } from "@/lib/auth";
import { saveArticle } from "@/lib/articles";
import { apiError, json, jsonBody } from "@/lib/http";
import { rateLimit, sameOrigin } from "@/lib/security";
export async function POST(request: Request) { try { sameOrigin(request); const actor = await requireActor(); await rateLimit(`article:${actor.id}`, 60, 60000); return json({ id: await saveArticle(actor, await jsonBody(request)) }, 201); } catch (error) { return apiError(error); } }
