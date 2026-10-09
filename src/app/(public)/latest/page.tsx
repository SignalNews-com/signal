import type { Metadata } from "next";
import { PublicListing } from "@/components/public-listing";
import { listingSeo } from "@/lib/seo";
import type { SearchParams } from "@/types";
type Props = { searchParams: Promise<SearchParams> };
const description = "The newest technology news and analysis from SIGNAL: AI, software, gadgets, gaming, and cybersecurity.";
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> { const seo = listingSeo("/latest", await searchParams); return { title: `Latest technology news${seo.page > 1 ? ` — page ${seo.page}` : ""}`, description, alternates: { canonical: seo.canonical }, robots: seo.robots }; }
export default async function Latest({ searchParams }: Props) { return <div className="container"><PublicListing title="The latest" description="New ideas, emerging technologies, and the stories behind them." params={await searchParams} path="/latest" /></div>; }
