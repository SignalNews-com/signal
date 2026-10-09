import { requirePageActor } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
export const metadata = { title: "Admin newsroom", robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) { return <DashboardShell actor={await requirePageActor("ADMIN")}>{children}</DashboardShell>; }
