import { siteUrl } from "@/lib/env";
import { feedArticles } from "@/lib/public-data";
import { site } from "@/lib/seo";
export const dynamic = "force-dynamic";
const xml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
// Google News sitemap: stories published in the last 48 hours (max 1000).
export async function GET() {
  const base = siteUrl(); const since = Math.floor(Date.now() / 3600000) * 3600000 - 48 * 3600000;
  const items = await feedArticles(1000, since);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${items.map(a => `<url>
<loc>${base}/article/${a.slug}</loc>
<news:news><news:publication><news:name>${xml(site.name)}</news:name><news:language>en</news:language></news:publication><news:publication_date>${new Date(a.publishedAt).toISOString()}</news:publication_date><news:title>${xml(a.title)}</news:title></news:news>
${a.image ? `<image:image><image:loc>${xml(a.image.url)}</image:loc></image:image>` : ""}
</url>`).join("\n")}
</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
