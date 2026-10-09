import { safeJsonLd } from "@/lib/content";
export function JsonLd({ data }: { data: unknown }) { return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />; }
