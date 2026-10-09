import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { databaseConfigured } from "@/lib/env";
import { categoryBySlug, primaryCategoryIds, publicTaxonomies, type PublicScope } from "@/lib/public-data";
import { othersCategory, primarySlugs, primaryCategories } from "@/lib/categories";
import { listingSeo, ogImage } from "@/lib/seo";
import { PublicListing } from "@/components/public-listing";
import type { SearchParams } from "@/types";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };
// "Others" collects every story outside the main sections, including uncategorized ones.
async function resolve(slug: string): Promise<{ name: string; description: string; scope: PublicScope } | null> {
  const isOthers = slug === othersCategory.slug; const fallback = [...primaryCategories, othersCategory].find(c => c.slug === slug);
  if (!databaseConfigured()) return fallback ? { name: fallback.name, description: fallback.description, scope: {} } : null;
  if (isOthers) { const stored = await categoryBySlug(slug); return { name: stored?.name || othersCategory.name, description: stored?.description || othersCategory.description, scope: { categoryNotIn: await primaryCategoryIds() } }; }
  const category = await categoryBySlug(slug);
  // A main section linked from the navigation should never 404, even before `npm run categories:sync` creates it.
  if (!category) return fallback ? { name: fallback.name, description: fallback.description, scope: { category: "0".repeat(24) } } : null;
  return { name: category.name, description: category.description || fallback?.description || `The latest ${category.name} news and analysis.`, scope: { category: category._id } };
}
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params; const category = await resolve(slug); if (!category) return { title: "Section not found", robots: { index: false } };
  const seo = listingSeo(`/category/${slug}`, await searchParams); const title = `${category.name} news${seo.page > 1 ? ` — page ${seo.page}` : ""}`;
  return { title, description: category.description, alternates: { canonical: seo.canonical }, robots: seo.robots, openGraph: { title, description: category.description, url: seo.canonical, images: [{ url: ogImage(`${category.name} news & analysis`, "SIGNAL section"), width: 1200, height: 630 }] } };
}
export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params; const category = await resolve(slug); if (!category) notFound();
  // Under Others, offer the smaller categories as quick filters.
  const extra = slug === othersCategory.slug ? (await publicTaxonomies()).categories.filter(c => !primarySlugs.includes(c.slug) && c.slug !== othersCategory.slug) : [];
  return <div className="container"><PublicListing title={category.name} description={category.description} params={await searchParams} scope={category.scope} path={`/category/${slug}`} eyebrow="SECTION">{extra.length ? <nav className="subtopics" aria-label="More topics">{extra.map(c => <Link key={c._id} href={`/category/${c.slug}`}>{c.name}</Link>)}</nav> : null}</PublicListing></div>;
}
