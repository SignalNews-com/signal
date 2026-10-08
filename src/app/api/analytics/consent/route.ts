import { z } from "zod";
import { sameOrigin } from "@/lib/security";
import { apiError, json, jsonBody } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { consent } = z
      .object({ consent: z.enum(["granted", "denied"]) })
      .parse(await jsonBody(request));
    const response = json({ consent });
    response.cookies.set("signal-analytics-consent", consent, {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 180 * 86400,
    });
    if (consent === "denied")
      response.cookies.set("signal-reader", "", {
        path: "/api/views",
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
