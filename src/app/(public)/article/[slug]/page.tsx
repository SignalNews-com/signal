import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cachedArticle, publicList, trendingArticles } from "@/lib/public-data";
import { plainText } from "@/lib/content";
import { cloudinaryCrop } from "@/lib/image-loader";
import { absolute, breadcrumbs, ogImage, organization, site } from "@/lib/seo";
import { ArticlePreview } from "@/components/article-preview";
import { ArticleCard } from "@/components/article-card";
import { AdSlot } from "@/components/ads/ad-slot";
import { JsonLd } from "@/components/json-ld";
import { Avatar } from "@/components/ui";
import { AnalyticsConsentPrompt } from "@/components/analytics-consent-prompt";
import { ReadingProgress, ShareButtons, ViewTracker } from "@/components/article-interactions";
// Incremental static regeneration: rendered on first visit, then served from cache.
// Publishing, edits and unpublishing refresh it immediately (src/lib/revalidate.ts).
export const revalidate = 300;
export async function generateStaticParams() { return []; }
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await cachedArticle((await params).slug); if (!article) return { title: "Article not found", robots: { index: false } };
  const title = article.seoTitle || article.title; const description = article.seoDescription || article.excerpt || plainText(article.content).slice(0, 160);
  const url = article.canonicalUrl || absolute(`/article/${article.slug}`); const authorUrl = absolute(`/author/${article.author._id}`);
  const image = article.socialImage ? { url: article.socialImage, alt: title } : article.coverImage ? { url: cloudinaryCrop(article.coverImage.secureUrl, 1200, 630), width: 1200, height: 630, alt: article.coverImage.alt } : { url: ogImage(article.title, article.category?.name), width: 1200, height: 630, alt: article.title };
  return { title, description, keywords: article.tags.map(t => t.name), authors: [{ name: article.author.name, url: authorUrl }], alternates: { canonical: url }, openGraph: { type: "article", title, description, url, siteName: site.name, publishedTime: article.publishedAt, modifiedTime: article.updatedAt, authors: [authorUrl], section: article.category?.name, tags: article.tags.map(t => t.name), images: [image] }, twitter: { card: "summary_large_image", title, description, images: [image.url] } };
}
export default async function ArticlePage({ params }: Props) {
  const article = await cachedArticle((await params).slug); if (!article) notFound();
  const [related, trending] = await Promise.all([publicList({}, { excludeId: article._id, relatedTo: { category: article.category?._id, tags: article.tags.map(t => t._id) } }), trendingArticles(5)]);
  const url = absolute(`/article/${article.slug}`); const categoryPath = article.category ? `/category/${article.category.slug}` : "/category/others";
  const images = article.coverImage ? [[1200, 675], [1200, 900], [1200, 1200]].map(([w, h]) => cloudinaryCrop(article.coverImage!.secureUrl, w, h)) : [absolute(ogImage(article.title, article.category?.name))];
  const structured = { "@context": "https://schema.org", "@type": "NewsArticle", "@id": `${url}#article`, headline: article.title.slice(0, 110), description: article.seoDescription || article.excerpt, image: images, datePublished: article.publishedAt, dateModified: article.updatedAt, inLanguage: "en", isAccessibleForFree: true, wordCount: plainText(article.content).split(/\s+/).filter(Boolean).length, articleSection: article.category?.name, keywords: article.tags.map(t => t.name).join(", ") || undefined, author: [{ "@type": "Person", name: article.author.name, url: absolute(`/author/${article.author._id}`), image: article.author.avatar || undefined }], publisher: organization(), mainEntityOfPage: { "@type": "WebPage", "@id": article.canonicalUrl || url }, ...(article.sourceUrl ? { isBasedOn: article.sourceUrl } : {}) };
  const crumbs = breadcrumbs([["Home", "/"], [article.category?.name || "Others", categoryPath], [article.title, `/article/${article.slug}`]]);
  const popular = trending.filter(a => a._id !== article._id).slice(0, 4);
  return <div className="container"><ReadingProgress /><JsonLd data={structured} /><JsonLd data={crumbs} /><ViewTracker id={article._id} /><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href={categoryPath}>{article.category?.name || "Others"}</Link></nav><AdSlot position="article-top" /><div className="public-article-layout"><div><ArticlePreview article={article} linked /><div className="article-after"><p className="small muted">Updated <time dateTime={article.updatedAt}>{new Date(article.updatedAt).toLocaleDateString("en", { timeZone: "UTC", dateStyle: "medium" })}</time></p>{article.tags.length ? <div className="tags">{article.tags.map(tag => <Link key={tag._id} href={`/tag/${tag.slug}`}>#{tag.name}</Link>)}</div> : null}<ShareButtons title={article.title} url={url} /><Link href={`/author/${article.author._id}`} className="author-box" rel="author"><Avatar person={article.author} large /><span><strong>{article.author.name}</strong><p>{article.author.bio || "Contributor to SIGNAL."}</p><span className="text-link">More from this writer</span></span></Link></div></div><aside className="article-sidebar"><AdSlot position="sidebar" />{popular.length ? <section className="sidebar-popular"><h3>Most read</h3><ol className="popular-list compact">{popular.map((a, i) => <li key={a._id}><span>{String(i + 1).padStart(2, "0")}</span><div><span className="eyebrow">{a.category?.name || "Others"}</span><h4><Link href={`/article/${a.slug}`}>{a.title}</Link></h4></div></li>)}</ol></section> : null}</aside></div><AdSlot position="article-bottom" />{related.items.length ? <section className="related"><div className="section-heading editorial"><h2>The bigger picture</h2></div><div className="article-grid">{related.items.slice(0, 3).map(a => <ArticleCard key={a._id} article={a} />)}</div></section> : null}<AnalyticsConsentPrompt enabled={process.env.ANALYTICS_ENABLED !== "false" && process.env.ANALYTICS_CONSENT_MODE !== "optional"} /></div>;
}
