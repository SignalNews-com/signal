import { requirePageActor } from "@/lib/auth";
import { DashboardPage } from "@/components/dashboard-pages";
import type { SearchParams } from "@/types";
export const dynamic = "force-dynamic";
export default async function Writer({ params, searchParams }: { params: Promise<{ path?: string[] }>; searchParams: Promise<SearchParams> }) { const actor = await requirePageActor("WRITER"); return <DashboardPage actor={actor} path={(await params).path || []} params={await searchParams} />; }
