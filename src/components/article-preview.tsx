import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";
import type { ArticleRecord } from "@/types";
import { Avatar, formatDate, viewsLabel } from "./ui";
import { readingTime, renderContent } from "@/lib/content";
export function ArticlePreview({ article, linked = false }: { article: ArticleRecord; linked?: boolean }) {
  const published = article.publishedAt || article.createdAt;
  return <article className="article-body"><div className="eyebrow">{linked && article.category ? <Link href={`/category/${article.category.slug}`}>{article.category.name}</Link> : article.category?.name || "Uncategorized"}</div><h1>{article.title}</h1>{article.excerpt ? <p className="article-deck">{article.excerpt}</p> : null}<div className="article-byline"><Avatar person={article.author} /><div><strong>{linked && article.author?._id ? <Link href={`/author/${article.author._id}`} rel="author">{article.author.name}</Link> : article.author?.name}</strong><div className="small muted byline-meta"><time dateTime={published}>{formatDate(published)}</time><span>·</span><span>{readingTime(article.content)} min read</span>{article.views > 0 ? <><span>·</span><span className="views"><Eye size={14} aria-hidden="true" />{viewsLabel(article.views)}</span></> : null}</div></div></div>{article.coverImage ? <figure><Image className="article-cover" src={article.coverImage.secureUrl} alt={article.coverImage.alt} width={article.coverImage.width || 1600} height={article.coverImage.height || 900} sizes="(max-width: 900px) 100vw, 850px" priority fetchPriority="high" /><figcaption>{article.coverImage.alt}</figcaption></figure> : null}<div className="prose" dangerouslySetInnerHTML={{ __html: renderContent(article.content) }} />{article.sourceUrl ? <p className="source-line">Source: <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">{article.sourceName || new URL(article.sourceUrl).hostname}</a></p> : null}</article>;
}
