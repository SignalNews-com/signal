import { requireActor } from "@/lib/auth";
import { saveArticle } from "@/lib/articles";
import { privateArticle } from "@/lib/queries";
import { apiError, json, jsonBody } from "@/lib/http";
import { rateLimit, sameOrigin } from "@/lib/security";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) { try { return json(await privateArticle(await requireActor(), (await context.params).id)); } catch (error) { return apiError(error); } }
export async function PATCH(request: Request, context: Context) { try { sameOrigin(request); const actor = await requireActor(); await rateLimit(`article:${actor.id}`, 60, 60000); return json({ id: await saveArticle(actor, await jsonBody(request), (await context.params).id) }); } catch (error) { return apiError(error); } }
