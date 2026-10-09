"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ArticleRecord } from "@/types";
import { apiRequest } from "./client-forms";
import { formatDate } from "./ui";
type Action = "submit" | "approve" | "reject" | "publish" | "unpublish" | "feature" | "unfeature" | "delete" | "restore";
const confirmations: Partial<Record<Action, string>> = { publish: "Publish this story now? It goes live immediately.", unpublish: "Take this story offline? It returns to drafts.", delete: "Move this article to trash?" };
const steps = [["DRAFT", "Draft"], ["SUBMITTED", "In review"], ["APPROVED", "Approved"], ["PUBLISHED", "Published"]] as const;
export function WorkflowStepper({ status }: { status: ArticleRecord["status"] }) {
  const current = status === "REJECTED" ? 1 : steps.findIndex(([s]) => s === status);
  return <ol className="workflow-steps" aria-label="Publishing progress">{steps.map(([key, label], i) => <li key={key} className={i < current ? "done" : i === current ? (status === "REJECTED" ? "current rejected" : "current") : undefined} aria-current={i === current ? "step" : undefined}><span>{i < current ? "✓" : i + 1}</span>{i === 1 && status === "REJECTED" ? "Changes requested" : label}</li>)}</ol>;
}
export function useWorkflow(article: Pick<ArticleRecord, "_id" | "revision">) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function perform(action: Action, reason = "") {
    const question = confirmations[action]; if (question && !window.confirm(question)) return false;
    setBusy(true); setError("");
    try { await apiRequest(`/api/articles/${article._id}/workflow`, "POST", { action, reason, revision: article.revision }); router.refresh(); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to update article"); return false; } finally { setBusy(false); }
  }
  return { busy, error, perform };
}
export function WorkflowControls({ article, admin }: { article: ArticleRecord; admin: boolean }) {
  const { busy, error, perform } = useWorkflow(article); const [reject, setReject] = useState(false);
  const live = article.status === "PUBLISHED" && !article.deletedAt;
  const actions: [Action, string, boolean?][] = article.deletedAt ? [["restore", "Restore as draft"]] : [
    ...(["DRAFT", "REJECTED"].includes(article.status) && !admin ? [["submit", article.status === "REJECTED" ? "Resubmit for review" : "Submit for review", true] as [Action, string, boolean]] : []),
    ...(admin && article.status === "SUBMITTED" ? [["publish", "Approve & publish", true], ["approve", "Approve only"]] as [Action, string, boolean?][] : []),
    ...(admin && ["APPROVED", "DRAFT"].includes(article.status) ? [["publish", "Publish now", true] as [Action, string, boolean]] : []),
    ...(admin && live ? [[article.featured ? "unfeature" : "feature", article.featured ? "Remove from top story" : "Make top story"], ["unpublish", "Unpublish"]] as [Action, string][] : []),
    ...(admin ? [["delete", "Move to trash"] as [Action, string]] : []),
  ];
  const note = article.deletedAt ? "This article is in the trash." : article.status === "SUBMITTED" ? (admin ? `Submitted ${formatDate(article.submittedAt)} by ${article.author?.name || "a writer"}. Review the story below, then approve or send it back with feedback.` : `Submitted ${formatDate(article.submittedAt)}. An editor will review it — you'll see feedback here if changes are needed.`) : article.status === "APPROVED" ? "Approved and ready to go live." : live ? `Live since ${formatDate(article.publishedAt)}.` : article.status === "REJECTED" ? "An editor requested changes. Update the story and resubmit." : admin ? "Draft — publish directly when it's ready." : "Draft — submit it for review when it's ready.";
  return <div className="panel workflow-panel"><WorkflowStepper status={article.status} /><p className="workflow-note">{note}</p><div className="actions">{actions.map(([action, label, primary]) => <button type="button" key={action} className={`button ${primary ? "" : action === "delete" || action === "unpublish" ? "danger secondary" : "secondary"}`} disabled={busy} onClick={() => void perform(action)}>{label}</button>)}{admin && !article.deletedAt && ["SUBMITTED", "APPROVED"].includes(article.status) ? <button type="button" className="button danger secondary" disabled={busy} onClick={() => setReject(!reject)}>Request changes</button> : null}{live ? <Link className="button secondary" href={`/article/${article.slug}`} target="_blank">View live ↗</Link> : null}</div><p className="small muted">Actions use the last saved version — save your edits first.</p>{reject ? <RejectForm busy={busy} onSubmit={reason => perform("reject", reason).then(ok => { if (ok) setReject(false); })} /> : null}{error ? <p className="notice error" role="alert">{error}</p> : null}</div>;
}
export function RejectForm({ busy, onSubmit }: { busy: boolean; onSubmit: (reason: string) => void }) {
  return <form className="form-stack rejection-form" onSubmit={e => { e.preventDefault(); onSubmit(String(new FormData(e.currentTarget).get("reason"))); }}><label>What needs to change?<textarea name="reason" required minLength={10} maxLength={2000} rows={3} placeholder="Be specific: e.g. add a primary source for the benchmark figures, tighten the intro." /></label><button className="button danger" disabled={busy}>Send back to writer</button></form>;
}
