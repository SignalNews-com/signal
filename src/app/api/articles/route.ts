import { requireActor } from "@/lib/auth";
import { saveArticle } from "@/lib/articles";
import { apiError, json, jsonBody } from "@/lib/http";
import { rateLimit, sameOrigin } from "@/lib/security";
export async function POST(request: Request) { try { sameOrigin(request); const actor = await requireActor(); await rateLimit(`article:${actor.id}`, 60, 60000); const { publicChange: _publicChange, ...saved } = await saveArticle(actor, await jsonBody(request)); void _publicChange; return json(saved, 201); } catch (error) { return apiError(error); } }
