import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/lib/env";
import { ogImage, site } from "@/lib/seo";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()), applicationName: site.name, title: { default: `${site.name} — Technology news & analysis`, template: `%s | ${site.name}` }, description: site.description,
  keywords: ["technology news", "AI news", "software", "gadgets", "gaming", "cybersecurity", "tech analysis"], category: "technology", creator: site.name, publisher: site.name, formatDetection: { telephone: false, email: false, address: false },
  alternates: { canonical: "/", types: { "application/rss+xml": [{ url: "/feed.xml", title: `${site.name} — Latest stories` }] } },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: { type: "website", siteName: site.name, locale: site.locale, url: "/", title: `${site.name} — Technology news & analysis`, description: site.description, images: [{ url: ogImage(`${site.name} — ${site.tagline}`), width: 1200, height: 630, alt: site.name }] },
  twitter: { card: "summary_large_image", site: site.twitter, creator: site.twitter },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined, other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined },
};
export const viewport: Viewport = { themeColor: "#14202b", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
