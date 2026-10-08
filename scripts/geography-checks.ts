import assert from "node:assert/strict";
import { Article, DailyArticleCountryMetric, DailyView } from "../src/models";
import type { GeographyReport } from "../src/lib/geography";
export type RequestOptions = {
  method?: string;
  cookie?: string;
  body?: unknown;
  expected?: number;
  origin?: string;
  headers?: Record<string, string>;
};
export async function geographyChecks(
  request: (path: string, options?: RequestOptions) => Promise<Response>,
  cookies: { admin: string; writer: string; other: string },
  articleId: string,
  authorId: string,
  otherAuthorId: string,
) {
  const endpoint = `/api/views/${articleId}`;
  const consent = "signal-analytics-consent=granted";
  assert.equal(
    (await (await request(endpoint, { method: "POST", body: {} })).json())
      .counted,
    false,
  );
  assert.equal(
    (
      await (
        await request(endpoint, {
          method: "POST",
          body: {},
          cookie: consent,
          headers: { "sec-gpc": "1" },
        })
      ).json()
    ).counted,
    false,
  );
  assert.equal(
    (
      await (
        await request(endpoint, {
          method: "POST",
          body: {},
          cookie: `${cookies.admin}; ${consent}`,
        })
      ).json()
    ).counted,
    false,
  );
  const first = await request(endpoint, {
    method: "POST",
    cookie: consent,
    headers: { "x-vercel-ip-country": "LK" },
    body: { countryCode: "US", utmSource: "linkedin" },
  });
  assert.equal((await first.json()).counted, true);
  const reader = first.headers
    .getSetCookie()
    .find((c) => c.startsWith("signal-reader="))!
    .split(";")[0];
  const repeated = await Promise.all(
    Array.from({ length: 5 }, () =>
      request(endpoint, {
        method: "POST",
        cookie: `${reader}; ${consent}`,
        headers: { "x-vercel-ip-country": "IN" },
        body: {},
      }),
    ),
  );
  for (const response of repeated)
    assert.equal((await response.json()).counted, false);
  assert.equal(
    (
      await DailyArticleCountryMetric.findOne({
        article: articleId,
        countryCode: "LK",
      })
    )?.pageViews,
    1,
  );
  assert.equal((await DailyView.findOne({ article: articleId }))?.views, 2); // The original suite's first view + this reader.
  for (const country of [undefined, "ZZ"]) {
    const response = await request(endpoint, {
      method: "POST",
      cookie: consent,
      body: { country: "US" },
      headers: country ? { "x-vercel-ip-country": country } : {},
    });
    assert.equal((await response.json()).counted, true);
  }
  const reportPath = `/api/analytics/geography?article=${articleId}&range=today`;
  await request(reportPath, { expected: 401 });
  await request(reportPath, { cookie: cookies.other, expected: 403 });
  await request(`/api/analytics/geography?author=${otherAuthorId}`, {
    cookie: cookies.writer,
    expected: 403,
  });
  await request("/admin/analytics/geography", { expected: 307 });
  await request("/admin/analytics/geography", {
    cookie: cookies.writer,
    expected: 307,
  });
  const report = (await (
    await request(reportPath, { cookie: cookies.admin })
  ).json()) as GeographyReport;
  assert.equal(report.total, 4);
  assert.equal(report.known, 1);
  assert.equal(report.unknown, 3);
  assert.equal(report.countries.find((c) => c._id === "LK")?.percentage, 25);
  assert.equal(report.uniqueVisitorsSupported, false);
  assert.match(
    (await request(reportPath, { cookie: cookies.admin })).headers.get(
      "cache-control",
    ) || "",
    /no-store/,
  );
  const selected = (await (
    await request(`${reportPath}&country=LK`, { cookie: cookies.admin })
  ).json()) as GeographyReport;
  assert.equal(selected.selectedViews, 1);
  assert.equal(selected.articles[0].views, 1);
  assert.equal(selected.sources[0].name, "LinkedIn");
  assert.equal(selected.writers[0]._id, authorId);
  await request(`${reportPath}&country=ZZ`, {
    cookie: cookies.admin,
    expected: 400,
  });
  await request(
    "/api/analytics/geography?range=custom&from=2026-02-30&to=2026-03-02",
    { cookie: cookies.admin, expected: 400 },
  );
  // Isolated test fixtures exercise historical aggregation and ownership, never production seeding.
  const foreign = await Article.create({
    title: "Geography foreign fixture",
    slug: "geo-foreign-fixture",
    author: otherAuthorId,
    status: "PUBLISHED",
  });
  const draft = await Article.create({
    title: "Geography draft fixture",
    slug: "geo-draft-fixture",
    author: authorId,
    status: "DRAFT",
  });
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  await DailyArticleCountryMetric.create([
    {
      article: foreign._id,
      day: today,
      countryCode: "US",
      source: "Direct / unknown",
      pageViews: 7,
    },
    {
      article: draft._id,
      day: today,
      countryCode: "IN",
      source: "Direct / unknown",
      pageViews: 8,
    },
    {
      article: articleId,
      day: yesterday,
      countryCode: "LK",
      source: "Other referrals",
      pageViews: 2,
    },
  ]);
  const own = (await (
    await request("/api/analytics/geography?range=today", {
      cookie: cookies.writer,
    })
  ).json()) as GeographyReport;
  assert.equal(own.total, 4);
  assert.equal(own.countries.find((c) => c._id === "LK")?.previous, 2);
  assert.equal(own.countries.find((c) => c._id === "LK")?.growth, -50);
  assert.equal(own.writers.length, 0);
  assert.ok(
    !own.articles.some((a) => a._id === foreign.id || a._id === draft.id),
  );
  await request(`/api/analytics/geography?article=${draft.id}`, {
    cookie: cookies.writer,
    expected: 403,
  });
  const past = (await (
    await request(
      `/api/analytics/geography?article=${articleId}&range=custom&from=${yesterday}&to=${yesterday}`,
      { cookie: cookies.admin },
    )
  ).json()) as GeographyReport;
  assert.equal(past.total, 2);
  for (const interval of ["week", "month"]) {
    const grouped = (await (
      await request(
        `/api/analytics/geography?article=${articleId}&range=7&interval=${interval}`,
        { cookie: cookies.admin },
      )
    ).json()) as GeographyReport;
    assert.equal(
      grouped.trend.reduce((sum, p) => sum + p.views, 0),
      6,
    );
  }
  const decline = await request("/api/analytics/consent", {
    method: "POST",
    body: { consent: "denied" },
  });
  assert.ok(
    decline.headers
      .getSetCookie()
      .some((c) => c.startsWith("signal-reader=") && /Max-Age=0/.test(c)),
  );
  console.log(
    "PASS: geography trust, spoofing resistance, consent, atomic deduplication, country/source aggregation, date filtering, trends, ownership and private endpoints",
  );
}
