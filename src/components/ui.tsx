import Image from "next/image";
import Link from "next/link";
import type { SearchParams } from "@/types";
const scalar = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
export function Empty({ title, children }: { title: string; children?: React.ReactNode }) { return <div className="empty"><span className="empty-mark" aria-hidden="true">—</span><h3>{title}</h3>{children ? <p>{children}</p> : null}</div>; }
export function Badge({ status }: { status: string }) { return <span className={`badge badge-${status.toLowerCase()}`}>{status.toLowerCase().replaceAll("_", " ")}</span>; }
export const formatNumber = (n: number) => new Intl.NumberFormat("en", { notation: n >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
export const formatDate = (date?: string | Date | null) => date ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(date)) : "—";
export function Pagination({ page, pages, params = {} }: { page: number; pages: number; params?: SearchParams }) {
  function href(target: number) { const p = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (scalar(value)) p.set(key, scalar(value)); p.set("page", String(target)); return `?${p}`; }
  if (pages <= 1) return null;
  return <nav className="pagination" aria-label="Pagination">{page > 1 ? <Link className="button secondary" href={href(page - 1)}>Previous</Link> : <span /> }<span>Page {page} of {pages}</span>{page < pages ? <Link className="button secondary" href={href(page + 1)}>Next</Link> : <span />}</nav>;
}
export function Stat({ label, value, detail }: { label: string; value: number | string; detail?: string }) { return <div className="stat"><span>{label}</span><strong>{typeof value === "number" ? formatNumber(value) : value}</strong>{detail ? <small>{detail}</small> : null}</div>; }
export function Avatar({ person, large = false }: { person?: { name?: string; avatar?: string } | null; large?: boolean }) { const size = large ? 62 : 37; return person?.avatar ? <Image className={`avatar${large ? " large" : ""}`} src={person.avatar} alt="" width={size} height={size} sizes={`${size * 2}px`} /> : <span className={`avatar${large ? " large" : ""}`} aria-hidden="true">{person?.name?.slice(0, 1) || "S"}</span>; }
export const viewsLabel = (n: number) => `${formatNumber(n)} ${n === 1 ? "view" : "views"}`;
