import { siteUrl } from "./env";
import { scalar } from "./queries";
import type { SearchParams } from "@/types";
export const site = { name: "SIGNAL", tagline: "Technology in perspective", description: "Independent technology news and analysis: AI, software, gadgets, gaming, cybersecurity, and the ideas shaping tomorrow.", locale: "en_US", twitter: process.env.NEXT_PUBLIC_TWITTER_HANDLE || undefined } as const;
export const absolute = (path = "") => `${siteUrl()}${path}`;
// Branded fallback share image for pages and stories without a cover.
export const ogImage = (title: string, kicker: string = site.tagline) => `/og?${new URLSearchParams({ title: title.slice(0, 140), kicker: kicker.slice(0, 40) })}`;
export const organization = () => ({ "@type": "NewsMediaOrganization", "@id": absolute("/#organization"), name: site.name, url: absolute("/"), logo: { "@type": "ImageObject", url: absolute("/logo.png"), width: 512, height: 512 }, publishingPrinciples: absolute("/about") });
// Paginated listings canonicalize to themselves; sorted/filtered variants are kept out of the index.
export function listingSeo(path: string, params: SearchParams) {
  const page = Math.max(1, Number.parseInt(scalar(params.page)) || 1);
  const filtered = ["sort", "from", "to", "featured", "q"].some(key => scalar(params[key]));
  return { canonical: page > 1 ? `${path}?page=${page}` : path, page, robots: filtered ? { index: false, follow: true } : undefined };
}
export const breadcrumbs = (items: [string, string][]) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: absolute(path) })) });
