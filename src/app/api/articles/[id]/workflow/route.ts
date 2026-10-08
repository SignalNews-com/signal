import { requireActor } from "@/lib/auth";
import { transitionArticle } from "@/lib/articles";
import { apiError, json, jsonBody } from "@/lib/http";
import { sameOrigin } from "@/lib/security";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { sameOrigin(request); return json(await transitionArticle(await requireActor(), (await context.params).id, await jsonBody(request))); } catch (error) { return apiError(error); } }
