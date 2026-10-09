import mongoose from "mongoose";
import { requireActor } from "@/lib/auth";
import { User, Session } from "@/models";
import { profileSchema } from "@/lib/validation";
import { hashPassword, sameOrigin, verifyPassword } from "@/lib/security";
import { assert } from "@/lib/errors";
import { apiError, json, jsonBody } from "@/lib/http";
import { audit } from "@/lib/articles";
import { publicTags, refreshPublic } from "@/lib/revalidate";
export async function PATCH(request: Request) {
  try { sameOrigin(request); const actor = await requireActor(); const data = profileSchema.parse(await jsonBody(request));
    const user = await User.findById(actor.id).select("+passwordHash"); assert(user, 404, "Account not found");
    if (data.password) { assert(data.currentPassword && await verifyPassword(user.passwordHash, data.currentPassword), 400, "Current password is incorrect"); user.passwordHash = await hashPassword(data.password); }
    user.name = data.name; user.bio = data.bio;
    await mongoose.connection.transaction(async session => { await user.save({ session }); if (data.password) await Session.deleteMany({ userId: actor.id }, { session }); await audit(actor, "PROFILE_UPDATED", undefined, data.password ? "Profile and password changed; sessions revoked" : "Profile updated", session); });
    refreshPublic(publicTags.articles, publicTags.people);
    return json({ ok: true, signInAgain: Boolean(data.password) });
  } catch (error) { return apiError(error); }
}
