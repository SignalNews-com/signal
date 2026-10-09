import Link from "next/link";
import type { Actor } from "@/lib/permissions";
import { Logout } from "./client-forms";
import { Avatar } from "./ui";
import { DashboardNav, WorkspaceCrumb } from "./dashboard-nav";
import { Article, User } from "@/models";
import { connectDb } from "@/lib/db";
export async function DashboardShell({ actor, children }: { actor: Actor; children: React.ReactNode }) {
  await connectDb();
  // Badges: submissions waiting for an editor, or a writer's stories sent back for changes.
  const [pending, me] = await Promise.all([Article.countDocuments(actor.role === "ADMIN" ? { status: "SUBMITTED", deletedAt: null } : { author: actor.id, status: "REJECTED", deletedAt: null }), User.findById(actor.id).select("avatar").lean()]);
  return <div className="dashboard"><aside className="sidebar"><Link href="/" className="wordmark">SIGNAL<span>▰</span></Link><span className="sidebar-label">{actor.role === "ADMIN" ? "EDITORIAL OPERATIONS" : "WRITER WORKSPACE"}</span><DashboardNav role={actor.role} pending={pending} /><div className="sidebar-bottom"><Link href="/">View publication</Link><div className="account"><Avatar person={{ name: actor.name, avatar: me?.avatar || undefined }} /><div><strong>{actor.name}</strong><small>{actor.role.toLowerCase()}</small></div></div><Logout /></div></aside><div className="workspace"><header className="workspace-header"><WorkspaceCrumb role={actor.role} /><span className="small muted">Your editorial workspace</span></header><main id="main" className="workspace-main">{children}</main></div></div>;
}
