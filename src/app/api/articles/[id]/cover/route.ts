import { requireActor } from "@/lib/auth";
import { removeCover, replaceCover } from "@/lib/cloudinary";
import { apiError, json, jsonBody } from "@/lib/http";
import { rateLimit, sameOrigin } from "@/lib/security";
import { assert } from "@/lib/errors";
import { z } from "zod";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  try { sameOrigin(request); const actor = await requireActor(); await rateLimit(`upload:${actor.id}`, 20, 3600000);
    const reader = request.body?.getReader(); assert(reader, 400, "Choose an image"); let size = 0; const chunks: Uint8Array[] = [];
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 5 * 1024 * 1024) { await reader.cancel(); assert(false, 413, "Choose an image smaller than 5 MB"); } chunks.push(value); }
    const revision = z.coerce.number().int().min(0).parse(request.headers.get("x-article-revision"));
    const alt = decodeURIComponent(request.headers.get("x-image-alt") || "");
    return json({ url: await replaceCover(actor, (await context.params).id, Buffer.concat(chunks), request.headers.get("content-type") || "", alt, revision) });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) { try { sameOrigin(request); const actor = await requireActor(); const { revision } = z.object({ revision: z.number().int().min(0) }).parse(await jsonBody(request)); await removeCover(actor, (await context.params).id, revision); return json({ ok: true }); } catch (error) { return apiError(error); } }
