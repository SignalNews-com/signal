import type { SearchParams } from "@/types";
import { listArticles } from "@/lib/queries";
import { ArticleCard } from "./article-card";
import { Empty, Pagination } from "./ui";
import type { QueryFilter } from "mongoose";
export async function PublicListing({ title, description, params, filter = {} }: { title: string; description?: string; params: SearchParams; filter?: QueryFilter<unknown> }) { const result = await listArticles(params, undefined, filter); return <><div className="listing-heading"><span className="eyebrow">THE SIGNAL FEED</span><h1>{title}</h1>{description ? <p>{description}</p> : null}<span className="small muted">{result.total} {result.total === 1 ? "story" : "stories"}</span></div>{result.items.length ? <div className="article-grid">{result.items.map(a => <ArticleCard article={a} key={a._id} />)}</div> : <Empty title="No stories here yet.">New reporting will appear here once it has been published.</Empty>}<Pagination {...result} params={params} /></>; }
