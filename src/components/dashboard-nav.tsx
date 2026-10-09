"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardCheck, FileText, Folder, Globe2, History, LayoutDashboard, PenLine, Settings, Tags, UserRound, Users } from "lucide-react";
import type { Role } from "@/lib/permissions";
const adminLinks = [["", "Overview", LayoutDashboard], ["articles", "Articles", FileText], ["articles/new", "Create article", PenLine], ["review", "Review queue", ClipboardCheck], ["writers", "Writers", Users], ["categories", "Categories", Folder], ["tags", "Tags", Tags], ["analytics", "Analytics", BarChart3], ["analytics/geography", "Geographic Analytics", Globe2], ["activity", "Activity", History], ["settings", "Settings", Settings]] as const;
const writerLinks = [["", "Overview", LayoutDashboard], ["articles", "My articles", FileText], ["articles/new", "Create article", PenLine], ["analytics", "Analytics", BarChart3], ["analytics/geography", "Geographic Analytics", Globe2], ["profile", "Profile", UserRound]] as const;
// Layout-level navigation: the sidebar stays mounted while pages stream in.
const current = (pathname: string, base: string) => pathname.replace(base, "").replace(/^\//, "");
export function DashboardNav({ role, pending }: { role: Role; pending: number }) {
  const base = role === "ADMIN" ? "/admin" : "/writer"; const path = current(usePathname(), base); const badgeRoute = role === "ADMIN" ? "review" : "articles";
  return <nav aria-label="Workspace navigation">{(role === "ADMIN" ? adminLinks : writerLinks).map(([route, label, Icon]) => { const active = path === route || (route === "articles" && /^articles\/[a-f\d]{24}/.test(path)); return <Link key={route} href={`${base}/${route}`} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><Icon size={18} aria-hidden="true" />{label}{route === badgeRoute && pending ? <span className="nav-badge" aria-label={`${pending} ${role === "ADMIN" ? "waiting for review" : "need changes"}`}>{pending}</span> : null}</Link>; })}</nav>;
}
export function WorkspaceCrumb({ role }: { role: Role }) { const path = current(usePathname(), role === "ADMIN" ? "/admin" : "/writer"); return <span>Newsroom <span className="muted">/ {path.split("/")[0] || "overview"}</span></span>; }
