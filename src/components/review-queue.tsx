"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ArticleRecord } from "@/types";
import { Empty, formatDate } from "./ui";
import { RejectForm, useWorkflow } from "./workflow-controls";
function ReviewItem({ article, now }: { article: ArticleRecord; now: number }) {
  const { busy, error, perform } = useWorkflow(article); const [reject, setReject] = useState(false);
  const waiting = article.submittedAt ? Math.max(0, Math.floor((now - Date.parse(article.submittedAt)) / 3600000)) : 0;
  return <li className="review-item"><div className="review-thumb">{article.coverImage ? <Image src={article.coverImage.secureUrl} alt="" width={160} height={100} sizes="160px" /> : <span>No cover</span>}</div><div className="review-body"><span className="eyebrow">{article.category?.name || "No category"}</span><h3><Link href={`/admin/articles/${article._id}/edit`}>{article.title}</Link></h3>{article.excerpt ? <p>{article.excerpt}</p> : null}<p className="small muted">{article.author?.name || "Former writer"} · submitted {formatDate(article.submittedAt)}{waiting >= 24 ? <strong className="waiting"> · waiting {Math.floor(waiting / 24)}d</strong> : null}</p><div className="actions"><button className="button" disabled={busy} onClick={() => void perform("publish")}>Approve & publish</button><button className="button secondary" disabled={busy} onClick={() => void perform("approve")}>Approve only</button><Link className="button secondary" href={`/admin/articles/${article._id}/preview`}>Preview</Link><Link className="button secondary" href={`/admin/articles/${article._id}/edit`}>Edit</Link><button className="button danger secondary" disabled={busy} onClick={() => setReject(!reject)}>Request changes</button></div>{reject ? <RejectForm busy={busy} onSubmit={reason => void perform("reject", reason)} /> : null}{error ? <p className="notice error" role="alert">{error}</p> : null}</div></li>;
}
// `now` comes from the server render so the "waiting" label is stable across hydration.
export function ReviewQueue({ articles, now }: { articles: ArticleRecord[]; now: number }) {
  if (!articles.length) return <Empty title="The review queue is clear.">New submissions from writers will appear here.</Empty>;
  return <ol className="review-list">{articles.map(article => <ReviewItem key={`${article._id}-${article.revision}`} article={article} now={now} />)}</ol>;
}
