import { requireActor } from "@/lib/auth";
import { geographyReport } from "@/lib/geography";
import { apiError, json } from "@/lib/http";
export async function GET(request: Request) {
  try {
    const actor = await requireActor();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    return json(
      await geographyReport(actor, params, {
        article: params.article,
        author: params.author,
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}
