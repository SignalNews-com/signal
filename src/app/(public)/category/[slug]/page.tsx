import { notFound } from "next/navigation";
import { Category } from "@/models";
import { connectDb } from "@/lib/db";
import { databaseConfigured } from "@/lib/env";
import { PublicListing } from "@/components/public-listing";
import type { SearchParams } from "@/types";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return { title: slug.replaceAll("-", " "), alternates: { canonical: `/category/${slug}` } }; }
export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) { const { slug } = await params; if (!databaseConfigured()) return <div className="container"><PublicListing title={slug.replaceAll("-", " ")} params={{}} /></div>; await connectDb(); const category = await Category.findOne({ slug, isActive: true }).lean(); if (!category) notFound(); return <div className="container"><PublicListing title={category.name} description={category.description} params={await searchParams} filter={{ category: category._id }} /></div>; }
