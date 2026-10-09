import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tagBySlug } from "@/lib/public-data";
import { listingSeo, ogImage } from "@/lib/seo";
import { PublicListing } from "@/components/public-listing";
import type { SearchParams } from "@/types";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params; const tag = await tagBySlug(slug); if (!tag) return { title: "Topic not found", robots: { index: false } };
  const seo = listingSeo(`/tag/${slug}`, await searchParams); const title = `${tag.name}: latest news and analysis${seo.page > 1 ? ` — page ${seo.page}` : ""}`; const description = tag.description || `Every SIGNAL story about ${tag.name}.`;
  return { title, description, alternates: { canonical: seo.canonical }, robots: seo.robots, openGraph: { title, description, url: seo.canonical, images: [{ url: ogImage(tag.name, "SIGNAL topic"), width: 1200, height: 630 }] } };
}
export default async function TagPage({ params, searchParams }: Props) { const { slug } = await params; const tag = await tagBySlug(slug); if (!tag) notFound(); return <div className="container"><PublicListing title={tag.name} description={tag.description || `Every SIGNAL story about ${tag.name}.`} params={await searchParams} scope={{ tag: tag._id }} path={`/tag/${slug}`} eyebrow="TOPIC" /></div>; }
