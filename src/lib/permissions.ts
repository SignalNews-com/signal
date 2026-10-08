import { AppError } from "./errors";
export const roles = ["ADMIN", "WRITER"] as const;
export type Role = typeof roles[number];
export const statuses = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "PUBLISHED"] as const;
export type Status = typeof statuses[number];
export type Actor = { id: string; role: Role; name: string; email: string };
export const editableStatuses: Status[] = ["DRAFT", "REJECTED"];
export function requireAdmin(actor: Actor) {
  if (actor.role !== "ADMIN") throw new AppError(403, "Administrator access required");
}
export function assertOwner(actor: Actor, author: { toString(): string }) {
  if (actor.role !== "ADMIN" && actor.id !== author.toString()) throw new AppError(403, "You do not have access to this article");
}
export function assertEditable(actor: Actor, article: { author: { toString(): string }; status: Status; deletedAt?: Date | null }) {
  assertOwner(actor, article.author);
  if (article.deletedAt) throw new AppError(409, "Restore this article before editing");
  if (actor.role !== "ADMIN" && !editableStatuses.includes(article.status)) throw new AppError(409, "Only drafts and rejected articles can be edited");
}
export type WorkflowAction = "submit" | "approve" | "reject" | "publish" | "unpublish";
export function nextStatus(role: Role, status: Status, action: WorkflowAction): Status {
  if (action !== "submit" && role !== "ADMIN") throw new AppError(403, "Administrator access required");
  if (action === "submit" && (status === "DRAFT" || status === "REJECTED")) return "SUBMITTED";
  if (action === "approve" && status === "SUBMITTED") return "APPROVED";
  if (action === "reject" && (status === "SUBMITTED" || status === "APPROVED")) return "REJECTED";
  if (action === "publish" && status === "APPROVED") return "PUBLISHED";
  if (action === "unpublish" && status === "PUBLISHED") return "DRAFT";
  throw new AppError(409, `Cannot ${action} an article with status ${status}`);
}
export const publicFilter = { status: "PUBLISHED", deletedAt: null } as const;
