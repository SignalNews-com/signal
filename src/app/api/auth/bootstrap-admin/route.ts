import { NextResponse } from "next/server";
import { User } from "@/models";
import { connectDb } from "@/lib/db";
import { writerSchema } from "@/lib/validation";
import { hashPassword, sameOrigin } from "@/lib/security";
import { apiError, jsonBody } from "@/lib/http";
import { assert } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const bootstrapKey = process.env.BOOTSTRAP_ADMIN_KEY?.trim();
    assert(bootstrapKey, 503, "Admin bootstrap is not configured");
    assert(request.headers.get("x-bootstrap-key") === bootstrapKey, 401, "Invalid bootstrap key");
    // Postman does not send an Origin header. If one is supplied, keep the
    // normal same-origin check so browser requests remain protected.
    if (request.headers.get("origin")) sameOrigin(request);

    const data = writerSchema.parse(await jsonBody(request));
    await connectDb();
    assert(!(await User.exists({ role: "ADMIN" })), 409, "An administrator already exists");

    await User.create({
      name: data.name,
      email: data.email,
      passwordHash: await hashPassword(data.password),
      role: "ADMIN",
    });

    return NextResponse.json({ ok: true, message: "Administrator created" }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
