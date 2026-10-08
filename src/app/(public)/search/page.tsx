import { headers } from "next/headers";
import { PublicListing } from "@/components/public-listing";
import { scalar } from "@/lib/queries";
import { databaseConfigured } from "@/lib/env";
import { rateLimit, tokenDigest } from "@/lib/security";
import type { SearchParams } from "@/types";
export const dynamic = "force-dynamic";
export const metadata = { title: "Search", robots: { index: false, follow: true } };
export default async function Search({ searchParams }: { searchParams: Promise<SearchParams> }) { const params = await searchParams; const q = scalar(params.q).slice(0, 100); if (q && databaseConfigured()) { const h = await headers(); const key = process.env.TRUST_PROXY === "true" ? h.get("x-forwarded-for")?.split(",")[0] || "shared" : "shared"; await rateLimit(`search:${tokenDigest(key)}`, 120, 60000); } return <div className="container"><form className="public-search" action="/search"><label htmlFor="query">Find your next perspective.</label><div><input id="query" name="q" type="search" defaultValue={q} placeholder="Search technology, ideas, and companies" maxLength={100} required /><button className="button">Search</button></div></form>{q ? <PublicListing title={`Results for “${q}”`} params={params} /> : <p className="muted">Search published stories by headline, excerpt, or tag.</p>}</div>; }
