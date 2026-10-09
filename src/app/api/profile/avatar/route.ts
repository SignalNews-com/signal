import { requireActor } from "@/lib/auth";
import { maxImageBytes, replaceAvatar } from "@/lib/cloudinary";
import { apiError, json, readBody } from "@/lib/http";
import { rateLimit, sameOrigin } from "@/lib/security";
import { publicTags, refreshPublic } from "@/lib/revalidate";
export async function POST(request: Request) {
  try { sameOrigin(request); const actor = await requireActor(); await rateLimit(`upload:${actor.id}`, 60, 3600000);
    const url = await replaceAvatar(actor, await readBody(request, maxImageBytes, "Choose an image smaller than 5 MB"), request.headers.get("content-type") || "");
    refreshPublic(publicTags.articles, publicTags.people);
    return json({ url });
  } catch (error) { return apiError(error); }
}
