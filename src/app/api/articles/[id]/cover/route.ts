import { requireActor } from "@/lib/auth";
import { maxImageBytes, removeCover, replaceCover } from "@/lib/cloudinary";
import { apiError, json, jsonBody, readBody } from "@/lib/http";
import { rateLimit, sameOrigin } from "@/lib/security";
import { publicTags, refreshPublic } from "@/lib/revalidate";
import { z } from "zod";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  try { sameOrigin(request); const actor = await requireActor(); await rateLimit(`upload:${actor.id}`, 60, 3600000);
    const bytes = await readBody(request, maxImageBytes, "Choose an image smaller than 5 MB");
    const revision = z.coerce.number().int().min(0).parse(request.headers.get("x-article-revision"));
    const alt = decodeURIComponent(request.headers.get("x-image-alt") || "");
    const { publicChange, ...result } = await replaceCover(actor, (await context.params).id, bytes, request.headers.get("content-type") || "", alt, revision);
    if (publicChange) refreshPublic(publicTags.articles);
    return json(result);
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) { try { sameOrigin(request); const actor = await requireActor(); const { revision } = z.object({ revision: z.number().int().min(0) }).parse(await jsonBody(request)); const { publicChange, ...result } = await removeCover(actor, (await context.params).id, revision); if (publicChange) refreshPublic(publicTags.articles); return json({ ok: true, ...result }); } catch (error) { return apiError(error); } }
