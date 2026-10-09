import { requirePageActor } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
export const metadata = { title: "Writer workspace", robots: { index: false, follow: false } };
export default async function WriterLayout({ children }: { children: React.ReactNode }) { return <DashboardShell actor={await requirePageActor("WRITER")}>{children}</DashboardShell>; }
