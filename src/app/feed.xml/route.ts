import { siteUrl } from "@/lib/env";
import { feedArticles } from "@/lib/public-data";
import { site } from "@/lib/seo";
export const dynamic = "force-dynamic";
const xml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
export async function GET() {
  const base = siteUrl(); const items = await feedArticles(50);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${xml(`${site.name} — ${site.tagline}`)}</title>
<link>${base}</link>
<description>${xml(site.description)}</description>
<language>en</language>
<atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />
${items[0] ? `<lastBuildDate>${new Date(items[0].publishedAt).toUTCString()}</lastBuildDate>` : ""}
${items.map(a => `<item>
<title>${xml(a.title)}</title>
<link>${base}/article/${a.slug}</link>
<guid isPermaLink="true">${base}/article/${a.slug}</guid>
<pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
<dc:creator>${xml(a.author)}</dc:creator>
${a.category ? `<category>${xml(a.category)}</category>` : ""}
${a.tags.map(t => `<category>${xml(t)}</category>`).join("")}
<description>${xml(a.excerpt)}</description>
${a.image ? `<media:content url="${xml(a.image.url)}" medium="image" width="${a.image.width}" height="${a.image.height}"><media:description>${xml(a.image.alt)}</media:description></media:content>` : ""}
</item>`).join("\n")}
</channel>
</rss>`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
