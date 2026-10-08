import { PublicListing } from "@/components/public-listing";
import type { SearchParams } from "@/types";
export const dynamic = "force-dynamic";
export const metadata = { title: "Latest technology news", alternates: { canonical: "/latest" } };
export default async function Latest({ searchParams }: { searchParams: Promise<SearchParams> }) { return <div className="container"><PublicListing title="The latest" description="New ideas, emerging technologies, and the stories behind them." params={await searchParams} /></div>; }
