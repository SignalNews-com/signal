import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicAuthor } from "@/lib/public-data";
import { absolute, listingSeo, ogImage } from "@/lib/seo";
import { PublicListing } from "@/components/public-listing";
import { JsonLd } from "@/components/json-ld";
import { Avatar } from "@/components/ui";
import type { SearchParams } from "@/types";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params; const author = await publicAuthor(id); if (!author) return { title: "Writer not found", robots: { index: false } };
  const seo = listingSeo(`/author/${id}`, await searchParams); const description = author.bio || `Stories by ${author.name} on SIGNAL.`;
  return { title: `${author.name} — writer`, description, alternates: { canonical: seo.canonical }, robots: seo.robots, openGraph: { type: "profile", title: author.name, description, images: [author.avatar ? { url: author.avatar } : { url: ogImage(author.name, "SIGNAL writer"), width: 1200, height: 630 }] } };
}
export default async function Author({ params, searchParams }: Props) {
  const { id } = await params; const author = await publicAuthor(id); if (!author) notFound();
  const profile = { "@context": "https://schema.org", "@type": "ProfilePage", mainEntity: { "@type": "Person", name: author.name, description: author.bio || undefined, image: author.avatar || undefined, url: absolute(`/author/${id}`) } };
  return <div className="container"><JsonLd data={profile} /><PublicListing title={author.name} description={author.bio} params={await searchParams} scope={{ author: id }} eyebrow="WRITER"><Avatar person={author} large /></PublicListing></div>;
}
