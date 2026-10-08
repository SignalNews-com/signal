import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { connectDb } from "./db";
import { Session, User } from "@/models";
import { newToken, tokenDigest } from "./security";
import { assert } from "./errors";
import type { Actor, Role } from "./permissions";
export const sessionCookie = process.env.NODE_ENV === "production" ? "__Host-signal-session" : "signal-session";
export async function resolveSession(token: string | undefined): Promise<Actor | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  await connectDb();
  const session = await Session.findOne({ tokenHash: tokenDigest(token), expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;
  const user = await User.findOne({ _id: session.userId, isActive: true }).select("name email role").lean();
  return user ? { id: user._id.toString(), name: user.name, email: user.email, role: user.role } : null;
}
export const currentActor = cache(async () => resolveSession((await cookies()).get(sessionCookie)?.value));
export async function requireActor(role?: Role): Promise<Actor> {
  const actor = await currentActor();
  assert(actor, 401, "Session expired. Please sign in.");
  if (role) assert(actor.role === role, 403, "You do not have access to this area");
  return actor;
}
export async function requirePageActor(role?: Role) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (role && actor.role !== role) redirect(actor.role === "ADMIN" ? "/admin" : "/writer");
  return actor;
}
// Identity providers can call this same session service after verifying an identity.
export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);
  await Session.create({ userId, tokenHash: tokenDigest(token), expiresAt });
  return { token, expiresAt };
}
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
