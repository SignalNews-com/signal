# Geographic article analytics

The existing article counter and `DailyView` remain intact. New accepted views also increment `DailyArticleCountryMetric` in the **same MongoDB transaction** as the short-lived duplicate receipt. Existing data is not migrated, guessed, or backfilled. Geography reports describe only views collected by this feature. Reports exclude deleted articles; writers can see only their own currently published articles. Admin reports may include previously published articles that have been unpublished. Writer/category attribution follows the article's current author/category.

## Configure and deploy

1. Use MongoDB Atlas or a replica set; transactions are required by the existing platform.
2. Set `ANALYTICS_ENABLED=true`. Keep `ANALYTICS_CONSENT_MODE=required` (the default). Only use `optional` after determining the appropriate consent policy for your deployment. Explicit denial, DNT and Global Privacy Control always prevent collection. Readers can allow or withdraw collection at `/privacy`; preferences last 180 days. Declining removes the reader cookie. No third-party analytics script is installed.
3. On Vercel set `ANALYTICS_GEO_PROVIDER=vercel`. The server additionally requires the platform's `VERCEL=1`. Vercel supplies `x-vercel-ip-country`; do not forward unchecked client values or set `VERCEL=1` on an untrusted origin. For other hosting leave `ANALYTICS_GEO_PROVIDER=unknown`: all views remain valid and country is `UNKNOWN`. No external GeoIP service is contacted, so visitor IPs are not sent to another vendor.
4. Run `npm run db:indexes` with the deployment database environment **before accepting traffic**. This creates indexes without dropping existing indexes. The new unique compound index is `(article, day, countryCode, source)`; supporting date/country indexes serve reports.
5. Build and start as usual. Visit `/admin/analytics/geography`. Writer reports are at `/writer/analytics/geography`; article editors and individual writer performance pages include geographic analytics. Publication analytics and the editorial overview include a geographic summary.

The repository does not contain production credentials. Index deployment and trusted-host settings must be applied in your hosting environment. Local development correctly produces `UNKNOWN`.

## Counting and privacy

One accepted view means one anonymous reader cookie per article per UTC day. The existing 24-hour random HttpOnly cookie and two-day hashed receipt prevent ordinary reloads and repeated submissions from increasing totals. This is a **deduplicated page-view metric, not unique visitors**. Clearing cookies, switching browsers and deliberate automation can bypass basic deduplication. User-agent bot filtering is heuristic. All signed-in ADMIN/WRITER reading is excluded, as are private previews. Client collection runs separately after hydration and never blocks article rendering.

Only article ID, UTC day, ISO country or UNKNOWN, a bounded traffic-source category, counts and timestamps are stored in geographic aggregates. Neither raw IPs nor precise locations, device fingerprints, full referrers, campaign strings or request headers are persisted. Existing abuse prevention stores only keyed hashes with expiration. `TRUST_PROXY` applies to rate limiting, not country trust; enable it only behind an ingress that overwrites the forwarded IP header.

Attribution uses the article page's `document.referrer` and UTM source/medium because a fetch request's Referer identifies the current article, not its inbound source. These client reports are unverified attribution hints, never evidence of country or identity. Missing/invalid referrer is `Direct / unknown`; paid Google campaigns are not classified as Google Search. Sources use a fixed vocabulary to prevent unbounded aggregate cardinality.

Country geolocation is approximate. VPNs, proxies, mobile carriers and hosting arrangements can alter it. No location is inferred from language or timezone. ISO codes are validated against a finite allowlist. Browser-submitted countries and untrusted hosting headers are ignored.

## Reporting boundaries

`GET /api/analytics/geography` requires an active database session. Optional `article` and `author` filters are authorized server-side. Writer requests for other writers/articles or their own unpublished articles are denied. The page and API use the same service. Responses are `private, no-store`; React request-local memoization is the only report cache, so reports cannot cross user boundaries or remain accessible after a role/session change.

Date presets: today, 7/30/90 days, custom (maximum 366 days). All dates are inclusive UTC dates; weeks start Monday. Comparison uses the immediately preceding equal-length period. Today and edge week/month buckets can be incomplete. Growth is unavailable for zero baselines. Zero chart buckets indicate no collected views in a queried bucket; they do not imply tracking was enabled for the whole period.

Country distribution always describes all countries in the content/date scope. Selecting a country filters articles, categories, writers, traffic sources and trend. Top-country comparisons exclude UNKNOWN; the distribution denominator includes it. Trends compare the top five recorded locations, or the selected country. Articles use server pagination (10 per page); writers/categories are top ten. MongoDB performs aggregation with bounded ranges and execution deadlines; raw analytics records never reach the browser.

## Map and dependencies

The map loads `d3-geo` lazily and fetches a local asset. Keyboard and pointer interaction select countries; an HTML table and country dropdown cover small/missing territories and UNKNOWN. It is an illustrative country-scale map, not an assertion about disputed boundaries.

`public/maps/countries.geojson` is derived from Natural Earth v5.1.2, 1:110m, public domain. Rebuild with `node scripts/geography-map.mjs`. The script retains geometry and country name/code only and adjusts winding for D3. Sources: [Natural Earth dataset](https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2), [D3 geographic paths](https://d3js.org/d3-geo), [Vercel request headers](https://vercel.com/docs/headers/request-headers).

## Optional future GA4 Data API

No GA4 implementation or credentials existed, so this feature uses first-party MongoDB aggregates exclusively. It neither enables GA4 nor sends events to Google. GA4's event/page-view and user definitions differ from these deduplicated views; never merge their totals or relabel this metric as users.

For a future adapter, keep `GA4_PROPERTY_ID` and Google application credentials server-side (never `NEXT_PUBLIC_*`), grant the reporting service account read access to the property, and call the Google Analytics Data API only after the existing session/ownership checks. Use country/date and a registered article-ID custom dimension to constrain article and writer reports; **country-only GA4 reports must never be exposed to writers**. Map provider country dimensions to ISO codes explicitly. Return a separate provider-labelled report with capability metadata; show estimated users only when a supported provider returns them. Preserve thresholding, attribution, consent, quota and missing-data caveats. Do not load reporting secrets into the browser or enable Google scripts without separate consent/CSP setup.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then `npm run test:integration`. Integration tests launch a temporary MongoDB replica set and a production Next.js server, simulate trusted edge headers, and delete the temporary test database afterward. Fixtures are confined to that database. They cover country detection/spoofing, consent, duplicate submissions, totals and percentages, date bounds, weekly/monthly grouping, article/author scope and anonymous access, plus browser map interaction and responsive layout.
