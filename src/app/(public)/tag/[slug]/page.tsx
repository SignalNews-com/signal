import { notFound } from "next/navigation";
import { Tag } from "@/models";
import { connectDb } from "@/lib/db";
import { databaseConfigured } from "@/lib/env";
import { PublicListing } from "@/components/public-listing";
import type { SearchParams } from "@/types";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return { title: `Stories tagged ${slug}`, alternates: { canonical: `/tag/${slug}` } }; }
export default async function TagPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) { if (!databaseConfigured()) notFound(); await connectDb(); const tag = await Tag.findOne({ slug: (await params).slug, isActive: true }).lean(); if (!tag) notFound(); return <div className="container"><PublicListing title={tag.name} description={tag.description} params={await searchParams} filter={{ tags: tag._id }} /></div>; }
