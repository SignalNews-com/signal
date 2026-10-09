import { requireActor } from "@/lib/auth";
import { transitionArticle } from "@/lib/articles";
import { apiError, json, jsonBody } from "@/lib/http";
import { sameOrigin } from "@/lib/security";
import { publicTags, refreshPublic } from "@/lib/revalidate";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { sameOrigin(request); const { publicChange, ...result } = await transitionArticle(await requireActor(), (await context.params).id, await jsonBody(request)); if (publicChange) refreshPublic(publicTags.articles); return json(result); } catch (error) { return apiError(error); } }
