import { requirePageActor } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardPage } from "@/components/dashboard-pages";
import type { SearchParams } from "@/types";
export const dynamic = "force-dynamic";
export const metadata = { title: "Writer workspace", robots: { index: false, follow: false } };
export default async function Writer({ params, searchParams }: { params: Promise<{ path?: string[] }>; searchParams: Promise<SearchParams> }) { const actor = await requirePageActor("WRITER"); const path = (await params).path || []; return <DashboardShell actor={actor} path={path.join("/")}><DashboardPage actor={actor} path={path} params={await searchParams} /></DashboardShell>; }
