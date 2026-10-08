import { cookies } from "next/headers";
import { Session } from "@/models";
import { cookieOptions, sessionCookie } from "@/lib/auth";
import { sameOrigin, tokenDigest } from "@/lib/security";
import { apiError, json } from "@/lib/http";
import { connectDb } from "@/lib/db";
export async function POST(request: Request) {
  try { sameOrigin(request); const jar = await cookies(); const token = jar.get(sessionCookie)?.value;
    if (token) { await connectDb(); await Session.deleteOne({ tokenHash: tokenDigest(token) }); }
    jar.set(sessionCookie, "", { ...cookieOptions, maxAge: 0 }); return json({ ok: true });
  } catch (error) { return apiError(error); }
}
