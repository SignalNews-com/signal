import { notFound } from "next/navigation";
import { User } from "@/models";
import { connectDb } from "@/lib/db";
import { databaseConfigured } from "@/lib/env";
import { objectId } from "@/lib/validation";
import { PublicListing } from "@/components/public-listing";
import type { SearchParams } from "@/types";
export const dynamic = "force-dynamic";
export default async function Author({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) { const { id } = await params; if (!databaseConfigured() || !objectId.safeParse(id).success) notFound(); await connectDb(); const author = await User.findById(id).select("name bio avatar").lean(); if (!author) notFound(); return <div className="container"><PublicListing title={author.name} description={author.bio} params={await searchParams} filter={{ author: author._id }} /></div>; }
