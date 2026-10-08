import test from "node:test";
import assert from "node:assert/strict";
import {
  collectionAllowed,
  detectCountry,
  geographyFilters,
  normalizeCountry,
  trafficSource,
} from "../src/lib/geography-policy";
const env = {
  ANALYTICS_GEO_PROVIDER: "vercel",
  VERCEL: "1",
  NODE_ENV: "test" as const,
};
test("trusted hosting country is normalized", () =>
  assert.equal(
    detectCountry(new Headers({ "x-vercel-ip-country": "lk" }), env),
    "LK",
  ));
test("untrusted headers and browser country cannot establish country", () => {
  assert.equal(
    detectCountry(new Headers({ "x-vercel-ip-country": "US", country: "IN" }), {
      ...env,
      VERCEL: "0",
    }),
    "UNKNOWN",
  );
  assert.equal(
    detectCountry(new Headers({ "x-vercel-ip-country": "US" }), {
      ...env,
      ANALYTICS_GEO_PROVIDER: "unknown",
    }),
    "UNKNOWN",
  );
});
test("missing, reserved and malformed country values become UNKNOWN", () => {
  for (const code of [undefined, "", "ZZ", "XX", "USA", "123", "<script>"])
    assert.equal(normalizeCountry(code), "UNKNOWN");
  assert.equal(detectCountry(new Headers(), env), "UNKNOWN");
});
test("consent defaults to required and privacy signals win", () => {
  assert.equal(collectionAllowed(new Headers(), undefined, env), false);
  assert.equal(collectionAllowed(new Headers(), "granted", env), true);
  for (const header of ["sec-gpc", "dnt"])
    assert.equal(
      collectionAllowed(new Headers({ [header]: "1" }), "granted", env),
      false,
    );
  assert.equal(
    collectionAllowed(new Headers(), "denied", {
      ...env,
      ANALYTICS_CONSENT_MODE: "optional",
    }),
    false,
  );
  assert.equal(
    collectionAllowed(new Headers(), "granted", {
      ...env,
      ANALYTICS_ENABLED: "false",
    }),
    false,
  );
});
test("source classification uses bounded categories and never invents direct attribution", () => {
  assert.equal(trafficSource({}, "https://signal.test"), "Direct / unknown");
  assert.equal(
    trafficSource(
      { referrer: "https://google.com/search?q=secret" },
      "https://signal.test",
    ),
    "Google Search",
  );
  assert.equal(
    trafficSource(
      { referrer: "https://google.com.evil.test" },
      "https://signal.test",
    ),
    "Other referrals",
  );
  assert.equal(
    trafficSource(
      { utmSource: "google", utmMedium: "cpc" },
      "https://signal.test",
    ),
    "Other campaign",
  );
  assert.equal(
    trafficSource({ utmSource: "linkedin" }, "https://signal.test"),
    "LinkedIn",
  );
  assert.equal(
    trafficSource(
      { referrer: "https://signal.test/article/x" },
      "https://signal.test",
    ),
    "Internal",
  );
});
const now = new Date("2026-10-08T10:00:00Z");
test("UTC preset dates and preceding period are inclusive", () => {
  const filters = geographyFilters({ range: "7" }, now);
  assert.equal(filters.from, "2026-10-02");
  assert.equal(filters.to, "2026-10-08");
  assert.equal(filters.previousFrom, "2026-09-25");
  assert.equal(filters.previousTo, "2026-10-01");
  assert.equal(geographyFilters({ range: "today" }, now).from, "2026-10-08");
});
test("custom dates reject rollover, reversed, future and unbounded ranges", () => {
  for (const [from, to] of [
    ["2026-02-30", "2026-03-01"],
    ["2026-10-08", "2026-10-07"],
    ["2026-10-08", "2026-10-09"],
    ["2020-01-01", "2026-10-08"],
  ])
    assert.throws(() => geographyFilters({ range: "custom", from, to }, now));
  assert.equal(
    geographyFilters(
      { range: "custom", from: "2024-02-29", to: "2024-03-01" },
      now,
    ).from,
    "2024-02-29",
  );
  assert.throws(() => geographyFilters({ country: "ZZ" }, now));
  assert.throws(() => geographyFilters({ interval: "year" }, now));
});
