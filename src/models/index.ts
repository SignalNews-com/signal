import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { roles, statuses } from "@/lib/permissions";
import { countryCodes, trafficSources } from "@/lib/geography-policy";
const ref = (model: string) => ({ type: Schema.Types.ObjectId, ref: model, required: true });
const userSchema = new Schema({
  name: { type: String, required: true }, email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false }, role: { type: String, enum: roles, required: true, default: "WRITER" },
  avatar: { type: String, default: "" }, bio: { type: String, default: "" }, isActive: { type: Boolean, default: true }, lastLoginAt: Date,
}, { timestamps: true });
userSchema.index({ role: 1, isActive: 1, createdAt: -1 });
export const User = mongoose.models.User as mongoose.Model<InferSchemaType<typeof userSchema>> || mongoose.model("User", userSchema);
const taxonomySchema = new Schema({ name: { type: String, required: true }, slug: { type: String, required: true, unique: true }, description: { type: String, default: "" }, isActive: { type: Boolean, default: true }, revision: { type: Number, default: 0 } }, { timestamps: true });
export const Category = mongoose.models.Category as mongoose.Model<InferSchemaType<typeof taxonomySchema>> || mongoose.model("Category", taxonomySchema);
export const Tag = mongoose.models.Tag as mongoose.Model<InferSchemaType<typeof taxonomySchema>> || mongoose.model("Tag", taxonomySchema);
const imageSchema = new Schema({ url: String, secureUrl: String, publicId: String, width: Number, height: Number, alt: String }, { _id: false });
const articleSchema = new Schema({
  title: { type: String, required: true }, slug: { type: String, required: true, unique: true }, excerpt: { type: String, default: "" }, content: { type: String, default: "" },
  coverImage: imageSchema, socialImage: { type: String, default: "" }, category: { type: Schema.Types.ObjectId, ref: "Category", default: null }, tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }], author: ref("User"),
  status: { type: String, enum: statuses, default: "DRAFT", required: true }, featured: { type: Boolean, default: false }, views: { type: Number, default: 0 },
  seoTitle: { type: String, default: "" }, seoDescription: { type: String, default: "" }, canonicalUrl: { type: String, default: "" }, sourceName: { type: String, default: "" }, sourceUrl: { type: String, default: "" },
  submittedAt: Date, approvedAt: Date, publishedAt: Date, rejectedAt: Date, rejectionReason: { type: String, default: "" }, reviewedBy: { type: Schema.Types.ObjectId, ref: "User" }, deletedAt: { type: Date, default: null }, revision: { type: Number, default: 0 },
}, { timestamps: true });
articleSchema.index({ status: 1, deletedAt: 1, publishedAt: -1 });
articleSchema.index({ author: 1, deletedAt: 1, status: 1, createdAt: -1 });
articleSchema.index({ category: 1, status: 1, deletedAt: 1, publishedAt: -1 });
articleSchema.index({ tags: 1, status: 1, deletedAt: 1, publishedAt: -1 });
articleSchema.index({ status: 1, deletedAt: 1, views: -1 });
articleSchema.index({ title: "text", excerpt: "text" }, { weights: { title: 5, excerpt: 2 } });
export const Article = mongoose.models.Article as mongoose.Model<InferSchemaType<typeof articleSchema>> || mongoose.model("Article", articleSchema);
const auditSchema = new Schema({ articleId: { type: Schema.Types.ObjectId, ref: "Article" }, actorId: ref("User"), actorRole: { type: String, enum: roles, required: true }, action: { type: String, required: true }, message: { type: String, default: "" }, metadata: { type: Map, of: String } }, { timestamps: { createdAt: true, updatedAt: false } });
auditSchema.index({ articleId: 1, createdAt: -1 }); auditSchema.index({ createdAt: -1 });
export const AuditLog = mongoose.models.AuditLog as mongoose.Model<InferSchemaType<typeof auditSchema>> || mongoose.model("AuditLog", auditSchema);
const sessionSchema = new Schema({ tokenHash: { type: String, required: true, unique: true }, userId: ref("User"), expiresAt: { type: Date, required: true } }, { timestamps: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); sessionSchema.index({ userId: 1 });
export const Session = mongoose.models.Session as mongoose.Model<InferSchemaType<typeof sessionSchema>> || mongoose.model("Session", sessionSchema);
const rateSchema = new Schema({ _id: String, count: { type: Number, default: 0 }, expiresAt: Date });
rateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RateLimit = mongoose.models.RateLimit as mongoose.Model<InferSchemaType<typeof rateSchema>> || mongoose.model("RateLimit", rateSchema);
const viewSchema = new Schema({ article: ref("Article"), day: { type: String, required: true }, views: { type: Number, default: 0 } });
viewSchema.index({ article: 1, day: 1 }, { unique: true }); viewSchema.index({ day: 1 });
export const DailyView = mongoose.models.DailyView as mongoose.Model<InferSchemaType<typeof viewSchema>> || mongoose.model("DailyView", viewSchema);
const countryMetricSchema = new Schema({
  article: ref("Article"), day: { type: String, required: true },
  countryCode: { type: String, enum: [...countryCodes, "UNKNOWN"], required: true },
  source: { type: String, enum: trafficSources, required: true },
  pageViews: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
countryMetricSchema.index({ article: 1, day: 1, countryCode: 1, source: 1 }, { unique: true });
countryMetricSchema.index({ day: 1, countryCode: 1, article: 1 });
countryMetricSchema.index({ countryCode: 1, day: 1, article: 1 });
export const DailyArticleCountryMetric = mongoose.models.DailyArticleCountryMetric as mongoose.Model<InferSchemaType<typeof countryMetricSchema>> || mongoose.model("DailyArticleCountryMetric", countryMetricSchema);
const receiptSchema = new Schema({ _id: String, expiresAt: Date }); receiptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const ViewReceipt = mongoose.models.ViewReceipt as mongoose.Model<InferSchemaType<typeof receiptSchema>> || mongoose.model("ViewReceipt", receiptSchema);
const assetSchema = new Schema({ publicId: { type: String, unique: true, required: true }, owner: ref("User"), article: { type: Schema.Types.ObjectId, ref: "Article", required: true }, state: { type: String, enum: ["ACTIVE", "DELETE_PENDING"], default: "ACTIVE" } }, { timestamps: true });
assetSchema.index({ state: 1, updatedAt: 1 });
export const Asset = mongoose.models.Asset as mongoose.Model<InferSchemaType<typeof assetSchema>> || mongoose.model("Asset", assetSchema);
