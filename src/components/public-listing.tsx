import type { SearchParams } from "@/types";
import { publicList, type PublicScope } from "@/lib/public-data";
import { absolute, breadcrumbs } from "@/lib/seo";
import { ArticleCard } from "./article-card";
import { JsonLd } from "./json-ld";
import { Empty, Pagination } from "./ui";
export async function PublicListing({ title, description, params, scope = {}, path, eyebrow = "THE SIGNAL FEED", children }: { title: string; description?: string; params: SearchParams; scope?: PublicScope; path?: string; eyebrow?: string; children?: React.ReactNode }) {
  const result = await publicList(params, scope);
  const collection = path ? { "@context": "https://schema.org", "@type": "CollectionPage", name: title, description, url: absolute(path), mainEntity: { "@type": "ItemList", itemListElement: result.items.map((a, i) => ({ "@type": "ListItem", position: (result.page - 1) * 12 + i + 1, url: absolute(`/article/${a.slug}`), name: a.title })) } } : null;
  return <>{collection ? <><JsonLd data={collection} /><JsonLd data={breadcrumbs([["Home", "/"], [title, path!]])} /></> : null}<div className="listing-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description ? <p>{description}</p> : null}<span className="small muted">{result.total} {result.total === 1 ? "story" : "stories"}{result.page > 1 ? ` · Page ${result.page} of ${result.pages}` : ""}</span>{children}</div>{result.items.length ? <div className="article-grid">{result.items.map((a, i) => <ArticleCard article={a} key={a._id} priority={i < 3 && result.page === 1} />)}</div> : <Empty title="No stories here yet.">New reporting will appear here once it has been published.</Empty>}<Pagination {...result} params={params} /></>;
}
