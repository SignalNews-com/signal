import { NextResponse } from "next/server";
import { User } from "@/models";
import { connectDb } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { sameOrigin, rateLimit, clientKey, verifyPassword, hashPassword } from "@/lib/security";
import { createSession, cookieOptions, sessionCookie } from "@/lib/auth";
import { apiError, jsonBody } from "@/lib/http";
import { assert } from "@/lib/errors";
let dummyHash: Promise<string> | undefined;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const data = loginSchema.parse(await jsonBody(request));
    await rateLimit(`login-ip:${clientKey(request)}`, 30, 15 * 60 * 1000);
    await rateLimit(`login-email:${data.email}`, 8, 15 * 60 * 1000);
    await connectDb();
    const user = await User.findOne({ email: data.email }).select("+passwordHash");
    dummyHash ||= hashPassword("invalid-account-timing-placeholder");
    const valid = await verifyPassword(user?.passwordHash || await dummyHash, data.password);
    assert(user && user.isActive && valid, 401, "Email or password is incorrect, or the account is inactive");
    const session = await createSession(user.id);
    user.lastLoginAt = new Date(); await user.save();
    const response = NextResponse.json({ redirect: user.role === "ADMIN" ? "/admin" : "/writer" });
    response.cookies.set(sessionCookie, session.token, { ...cookieOptions, expires: session.expiresAt });
    return response;
  } catch (error) { return apiError(error); }
}
