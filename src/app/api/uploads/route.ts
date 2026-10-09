import { requireActor } from "@/lib/auth";
import { maxImageBytes, uploadContentImage } from "@/lib/cloudinary";
import { apiError, json, readBody } from "@/lib/http";
import { rateLimit, sameOrigin } from "@/lib/security";
// Inline article images for admins and writers. Pass X-Article-Id to attach the image to an article you can edit.
export async function POST(request: Request) {
  try { sameOrigin(request); const actor = await requireActor(); await rateLimit(`upload:${actor.id}`, 60, 3600000);
    const bytes = await readBody(request, maxImageBytes, "Choose an image smaller than 5 MB");
    return json(await uploadContentImage(actor, bytes, request.headers.get("content-type") || "", request.headers.get("x-article-id") || undefined), 201);
  } catch (error) { return apiError(error); }
}
