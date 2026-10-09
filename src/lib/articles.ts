import mongoose, { type ClientSession } from "mongoose";
import { Article, AuditLog, Category, Tag } from "@/models";
import { connectDb } from "./db";
import { assert } from "./errors";
import { assertEditable, assertOwner, nextStatus, requireAdmin, type Actor } from "./permissions";
import { articleSchema, objectId, slugify, workflowSchema } from "./validation";
import { plainText, sanitizeContent } from "./content";
export async function audit(actor: Actor, action: string, articleId: mongoose.Types.ObjectId | string | undefined, message: string, session?: ClientSession, metadata?: Record<string, string>) {
  const entry = { actorId: actor.id, actorRole: actor.role, articleId, action, message, metadata };
  if (session) await AuditLog.create([entry], { session });
  else await AuditLog.create(entry);
}
async function validateTaxonomy(category: string | null, tags: string[], session: ClientSession) {
  // Touch references in the transaction to serialize concurrent deletion/deactivation.
  if (category) assert((await Category.updateOne({ _id: category, isActive: true }, { $inc: { revision: 1 } }, { session })).matchedCount === 1, 400, "Choose an active category");
  if (tags.length) assert((await Tag.updateMany({ _id: { $in: [...new Set(tags)] }, isActive: true }, { $inc: { revision: 1 } }, { session })).matchedCount === new Set(tags).size, 400, "Choose active tags");
}
export async function saveArticle(actor: Actor, input: unknown, id?: string) {
  const data = articleSchema.parse(input);
  if (id) objectId.parse(id);
  await connectDb();
  return mongoose.connection.transaction(async session => {
    const article = id ? await Article.findById(id).session(session) : new Article({ author: actor.id });
    assert(article, 404, "Article not found");
    if (id) { assertEditable(actor, article); assert(data.revision === article.revision, 409, "This article changed. Reload before saving."); }
    await validateTaxonomy(data.category, data.tags, session);
    const { revision: _revision, coverAlt, ...fields } = data;
    void _revision;
    Object.assign(article, fields, { slug: data.slug || (id ? article.slug : `${slugify(data.title) || "article"}-${article._id.toString().slice(-6)}`), content: sanitizeContent(data.content) });
    if (article.coverImage) article.coverImage.alt = coverAlt;
    if (article.status === "PUBLISHED") validatePublishable(article);
    article.revision += 1;
    await article.save({ session });
    await audit(actor, id ? "ARTICLE_UPDATED" : "ARTICLE_CREATED", article._id, "", session);
    return { id: article._id.toString(), revision: article.revision, status: article.status, publicChange: article.status === "PUBLISHED" && !article.deletedAt };
  });
}
export function validatePublishable(article: { title: string; excerpt: string; content: string; category?: unknown; coverImage?: { alt?: string | null } | null }) {
  assert(article.title.length >= 8 && article.excerpt.length >= 30 && plainText(article.content).length >= 100 && article.category, 400, "Before submitting, add a title of 8+ characters, an excerpt of 30+ characters, a category, and at least 100 characters of article text.");
  if (article.coverImage) assert(article.coverImage.alt?.trim(), 400, "Add descriptive cover image alt text");
}
export async function transitionArticle(actor: Actor, id: string, input: unknown) {
  objectId.parse(id); const data = workflowSchema.parse(input); await connectDb();
  return mongoose.connection.transaction(async session => {
    const article = await Article.findById(id).session(session); assert(article, 404, "Article not found"); assertOwner(actor, article.author);
    assert(article.revision === data.revision, 409, "This article changed. Reload before continuing.");
    const now = new Date(); let action = ""; const wasPublic = article.status === "PUBLISHED" && !article.deletedAt;
    if (data.action === "feature" || data.action === "unfeature" || data.action === "delete" || data.action === "restore") {
      requireAdmin(actor);
      if (data.action === "restore") { assert(article.deletedAt, 409, "Article is not deleted"); article.deletedAt = null; article.status = "DRAFT"; action = "ARTICLE_RESTORED"; }
      else { assert(!article.deletedAt, 409, "Article is deleted");
        if (data.action === "delete") { article.deletedAt = now; article.featured = false; action = "ARTICLE_DELETED"; }
        else { assert(article.status === "PUBLISHED", 409, "Only published articles can be featured"); article.featured = data.action === "feature"; action = article.featured ? "ARTICLE_FEATURED" : "ARTICLE_UNFEATURED"; }
      }
    } else {
      assert(!article.deletedAt, 409, "Article is deleted");
      const oldStatus = article.status;
      article.status = nextStatus(actor.role, article.status, data.action);
      if (["submit", "publish"].includes(data.action)) {
        validatePublishable(article);
        await validateTaxonomy(article.category?.toString() || null, article.tags.map(String), session);
      }
      switch (data.action) {
        case "submit": article.submittedAt = now; article.rejectionReason = ""; article.approvedAt = undefined; action = oldStatus === "REJECTED" ? "ARTICLE_RESUBMITTED" : "ARTICLE_SUBMITTED"; break;
        case "approve": article.approvedAt = now; article.reviewedBy = new mongoose.Types.ObjectId(actor.id); action = "ARTICLE_APPROVED"; break;
        case "reject": assert(data.reason.length >= 10, 400, "Provide a rejection reason of at least 10 characters"); article.rejectedAt = now; article.rejectionReason = data.reason; article.reviewedBy = new mongoose.Types.ObjectId(actor.id); action = "ARTICLE_REJECTED"; break;
        case "publish": article.publishedAt ||= now; if (oldStatus !== "APPROVED") { article.approvedAt = now; article.reviewedBy = new mongoose.Types.ObjectId(actor.id); article.rejectionReason = ""; } action = oldStatus === "APPROVED" ? "ARTICLE_PUBLISHED" : "ARTICLE_APPROVED_AND_PUBLISHED"; break;
        case "unpublish": article.featured = false; article.approvedAt = undefined; action = "ARTICLE_UNPUBLISHED"; break;
      }
    }
    article.revision += 1; await article.save({ session }); await audit(actor, action, article._id, data.reason, session);
    return { status: article.status, revision: article.revision, slug: article.slug, publicChange: wasPublic || (article.status === "PUBLISHED" && !article.deletedAt) };
  });
}
