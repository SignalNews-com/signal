import { requirePageActor } from "@/lib/auth";
import { DashboardPage } from "@/components/dashboard-pages";
import type { SearchParams } from "@/types";
export const dynamic = "force-dynamic";
export default async function Admin({ params, searchParams }: { params: Promise<{ path?: string[] }>; searchParams: Promise<SearchParams> }) { const actor = await requirePageActor("ADMIN"); return <DashboardPage actor={actor} path={(await params).path || []} params={await searchParams} />; }
