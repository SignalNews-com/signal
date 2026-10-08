import type { Metadata } from "next";
import { siteUrl } from "@/lib/env";
import "./globals.css";
export const metadata: Metadata = { metadataBase: new URL(siteUrl()), title: { default: "SIGNAL — Technology in perspective", template: "%s | SIGNAL" }, description: "Independent perspectives on technology, artificial intelligence, software, and the ideas shaping tomorrow.", openGraph: { type: "website", siteName: "SIGNAL" }, twitter: { card: "summary_large_image" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
