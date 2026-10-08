import mongoose from "mongoose";
import { Article, Category, Session, Tag, User } from "@/models";
import { requireAdmin, type Actor } from "./permissions";
import { objectId, slugify, taxonomySchema, writerSchema } from "./validation";
import { assert } from "./errors";
import { hashPassword } from "./security";
import { connectDb } from "./db";
import { audit } from "./articles";
export async function createWriter(actor: Actor, input: unknown) {
  requireAdmin(actor);
  const data = writerSchema.parse(input);
  const passwordHash = await hashPassword(data.password);
  await connectDb();
  const user = await User.create({ name: data.name, email: data.email, bio: data.bio, passwordHash, role: "WRITER" });
  await audit(actor, "WRITER_CREATED", undefined, `Created writer ${user.name}`, undefined, { userId: user.id });
  return user.id;
}
export async function setWriterActive(actor: Actor, id: string, isActive: boolean) {
  requireAdmin(actor); objectId.parse(id); await connectDb();
  await mongoose.connection.transaction(async session => {
    const writer = await User.findOneAndUpdate({ _id: id, role: "WRITER" }, { isActive }, { new: true, session }); assert(writer, 404, "Writer not found");
    if (!isActive) await Session.deleteMany({ userId: id }, { session });
    await audit(actor, isActive ? "WRITER_ACTIVATED" : "WRITER_DEACTIVATED", undefined, writer.name, session, { userId: id });
  });
}
export async function saveTaxonomy(actor: Actor, kind: "categories" | "tags", input: unknown, id?: string) {
  requireAdmin(actor); if (id) objectId.parse(id); const data = taxonomySchema.parse(input); const slug = slugify(data.slug || data.name); assert(slug, 400, "Provide a valid slug"); await connectDb();
  const Model = kind === "categories" ? Category : Tag;
  return mongoose.connection.transaction(async session => {
    const document = id ? await Model.findById(id).session(session) : new Model(); assert(document, 404, "Item not found");
    Object.assign(document, data, { slug }); document.revision += 1; await document.save({ session });
    await audit(actor, `${kind.toUpperCase()}_${id ? "UPDATED" : "CREATED"}`, undefined, data.name, session); return document.id;
  });
}
export async function deleteTaxonomy(actor: Actor, kind: "categories" | "tags", id: string) {
  requireAdmin(actor); objectId.parse(id); await connectDb(); const Model = kind === "categories" ? Category : Tag;
  await mongoose.connection.transaction(async session => {
    const doc = await Model.findOneAndUpdate({ _id: id }, { $inc: { revision: 1 } }, { session }); assert(doc, 404, "Item not found");
    assert(!await Article.exists({ [kind === "categories" ? "category" : "tags"]: id }).session(session), 409, "Articles use this item. Deactivate it instead, or reassign the articles first.");
    await Model.deleteOne({ _id: id }, { session }); await audit(actor, `${kind.toUpperCase()}_DELETED`, undefined, doc.name, session);
  });
}
