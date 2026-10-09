import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: ["/", "/og"], disallow: ["/admin", "/writer", "/api/", "/login", "/search"] }, sitemap: [`${siteUrl()}/sitemap.xml`, `${siteUrl()}/news-sitemap.xml`], host: siteUrl() }; }
