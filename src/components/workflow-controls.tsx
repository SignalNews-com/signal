"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ArticleRecord } from "@/types";
import { apiRequest } from "./client-forms";
export function WorkflowControls({ article, admin }: { article: ArticleRecord; admin: boolean }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [reject, setReject] = useState(false); const router = useRouter();
  const actions: [string, string][] = article.deletedAt ? [["restore", "Restore as draft"]] : [
    ...(["DRAFT", "REJECTED"].includes(article.status) ? [["submit", article.status === "REJECTED" ? "Resubmit for review" : "Submit for review"] as [string, string]] : []),
    ...(admin && article.status === "SUBMITTED" ? [["approve", "Approve"] as [string, string]] : []),
    ...(admin && article.status === "APPROVED" ? [["publish", "Publish article"] as [string, string]] : []),
    ...(admin && article.status === "PUBLISHED" ? [["unpublish", "Unpublish"], [article.featured ? "unfeature" : "feature", article.featured ? "Unfeature" : "Feature article"]] as [string, string][] : []),
    ...(admin ? [["delete", "Move to trash"] as [string, string]] : []),
  ];
  async function perform(action: string, reason = "") { if (!window.confirm(`${action === "delete" ? "Move this article to trash" : action.charAt(0).toUpperCase() + action.slice(1) + " this article"}? This uses the saved version; save editor changes first.`)) return; setBusy(true); setError(""); try { await apiRequest(`/api/articles/${article._id}/workflow`, "POST", { action, reason, revision: article.revision }); setReject(false); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to update article"); } finally { setBusy(false); } }
  return <div className="panel workflow-panel"><div className="actions">{actions.map(([action, label]) => <button type="button" key={action} className={`button ${action === "delete" ? "danger secondary" : "secondary"}`} disabled={busy} onClick={() => void perform(action)}>{label}</button>)}{admin && !article.deletedAt && ["SUBMITTED", "APPROVED"].includes(article.status) ? <button className="button danger secondary" disabled={busy} onClick={() => setReject(!reject)}>Reject with feedback</button> : null}</div>{reject ? <form className="form-stack rejection-form" onSubmit={e => { e.preventDefault(); void perform("reject", String(new FormData(e.currentTarget).get("reason"))); }}><label>What needs to change?<textarea name="reason" required minLength={10} maxLength={2000} rows={3} /></label><button className="button danger" disabled={busy}>Confirm rejection</button></form> : null}{error ? <p className="notice error" role="alert">{error}</p> : null}</div>;
}
