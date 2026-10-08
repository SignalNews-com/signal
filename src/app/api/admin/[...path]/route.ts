import { z } from "zod";
import { requireActor } from "@/lib/auth";
import { createWriter, deleteTaxonomy, saveTaxonomy, setWriterActive } from "@/lib/management";
import { apiError, json, jsonBody } from "@/lib/http";
import { sameOrigin } from "@/lib/security";
import { AppError } from "@/lib/errors";
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  try {
    const actor = await requireActor("ADMIN"); sameOrigin(request); const [kind, id] = (await context.params).path;
    if (kind === "writers") {
      if (request.method === "POST" && !id) return json({ id: await createWriter(actor, await jsonBody(request)) }, 201);
      if (request.method === "PATCH" && id) { const data = z.object({ isActive: z.boolean() }).parse(await jsonBody(request)); await setWriterActive(actor, id, data.isActive); return json({ ok: true }); }
    }
    if (kind === "categories" || kind === "tags") {
      if (request.method === "DELETE" && id) { await deleteTaxonomy(actor, kind, id); return json({ ok: true }); }
      if ((request.method === "POST" && !id) || (request.method === "PATCH" && id)) return json({ id: await saveTaxonomy(actor, kind, await jsonBody(request), id) });
    }
    throw new AppError(404, "Endpoint not found");
  } catch (error) { return apiError(error); }
}
export const POST = handle; export const PATCH = handle; export const DELETE = handle;
export async function GET() { try { await requireActor("ADMIN"); return json({ ok: true }); } catch (error) { return apiError(error); } }
