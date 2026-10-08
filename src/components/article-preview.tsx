import Image from "next/image";
import type { ArticleRecord } from "@/types";
import { formatDate } from "./ui";
import { readingTime, sanitizeContent } from "@/lib/content";
export function ArticlePreview({ article }: { article: ArticleRecord }) {
  return <article className="article-body"><div className="eyebrow">{article.category?.name || "Uncategorized"}</div><h1>{article.title}</h1><p className="article-deck">{article.excerpt}</p><div className="article-byline"><span className="avatar">{article.author?.name?.slice(0, 1)}</span><div><strong>{article.author?.name}</strong><div className="small muted">{formatDate(article.publishedAt || article.createdAt)} · {readingTime(article.content)} min read</div></div></div>{article.coverImage ? <figure><Image className="article-cover" src={article.coverImage.secureUrl} alt={article.coverImage.alt} width={article.coverImage.width || 1600} height={article.coverImage.height || 900} sizes="(max-width: 900px) 100vw, 850px" priority /><figcaption>{article.coverImage.alt}</figcaption></figure> : null}<div className="prose" dangerouslySetInnerHTML={{ __html: sanitizeContent(article.content) }} />{article.sourceUrl ? <p className="source-line">Source: <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">{article.sourceName || new URL(article.sourceUrl).hostname}</a></p> : null}</article>;
}
