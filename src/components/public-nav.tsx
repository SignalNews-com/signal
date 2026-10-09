"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { navLinks } from "@/lib/categories";
const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
export function PublicNav() {
  const pathname = usePathname();
  return <nav className="public-nav" aria-label="Main navigation"><div className="container public-nav-inner">{navLinks.map(([href, label]) => <Link key={href} href={href} className={isActive(pathname, href) ? "active" : undefined} aria-current={isActive(pathname, href) ? "page" : undefined}>{label}</Link>)}<span className="nav-note">INDEPENDENT THINKING</span></div></nav>;
}
export function MobileMenu() {
  const pathname = usePathname(); const menu = useRef<HTMLDetailsElement>(null);
  // Client-side navigation keeps the layout mounted, so close the menu explicitly.
  useEffect(() => { if (menu.current) menu.current.open = false; }, [pathname]);
  return <details className="mobile-menu" ref={menu}><summary>Menu</summary><nav aria-label="Mobile navigation">{navLinks.map(([href, label]) => <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}>{label}</Link>)}<Link href="/search">Search</Link><Link href="/login">Newsroom sign in</Link></nav></details>;
}
