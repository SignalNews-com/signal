import { AppError } from "./errors";
import type { SearchParams } from "@/types";

// ISO 3166-1 alpha-2, deliberately excludes user-assigned and reserved codes.
export const countryCodes =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );
const countries = new Set(countryCodes);
export function normalizeCountry(value: string | null | undefined) {
  const code = value?.trim().toUpperCase() || "";
  return countries.has(code) ? code : "UNKNOWN";
}
const names = new Intl.DisplayNames(["en"], { type: "region" });
export const countryName = (code: string) =>
  code === "UNKNOWN" ? "Unknown country" : names.of(code) || code;

export function detectCountry(
  headers: Headers,
  env: NodeJS.ProcessEnv = process.env,
) {
  // Never infer trust from an incoming header. Both switches are server configuration.
  if (env.ANALYTICS_GEO_PROVIDER === "vercel" && env.VERCEL === "1") {
    return normalizeCountry(headers.get("x-vercel-ip-country"));
  }
  return "UNKNOWN";
}
export function collectionAllowed(
  headers: Headers,
  consent?: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (
    env.ANALYTICS_ENABLED === "false" ||
    headers.get("sec-gpc") === "1" ||
    headers.get("dnt") === "1" ||
    consent === "denied"
  )
    return false;
  return env.ANALYTICS_CONSENT_MODE === "optional" || consent === "granted";
}
export const trafficSources = [
  "Google Search",
  "Facebook",
  "X",
  "LinkedIn",
  "Other campaign",
  "Other referrals",
  "Internal",
  "Direct / unknown",
] as const;
export function trafficSource(
  input: { referrer?: string; utmSource?: string; utmMedium?: string },
  origin: string,
): (typeof trafficSources)[number] {
  const source = input.utmSource?.toLowerCase();
  const medium = input.utmMedium?.toLowerCase();
  if (source) {
    if (source === "google" && medium === "organic") return "Google Search";
    if (["facebook", "fb"].includes(source)) return "Facebook";
    if (["x", "twitter"].includes(source)) return "X";
    if (source === "linkedin") return "LinkedIn";
    return "Other campaign";
  }
  try {
    const url = new URL(input.referrer || "");
    if (!["https:", "http:"].includes(url.protocol)) return "Direct / unknown";
    if (url.origin === new URL(origin).origin) return "Internal";
    const host = url.hostname.toLowerCase();
    const is = (domain: string) =>
      host === domain || host.endsWith(`.${domain}`);
    if (
      /^(www\.)?google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(host)
    )
      return "Google Search";
    if (is("facebook.com") || is("fb.com")) return "Facebook";
    if (is("x.com") || is("twitter.com") || is("t.co")) return "X";
    if (is("linkedin.com")) return "LinkedIn";
    return "Other referrals";
  } catch {
    return "Direct / unknown";
  }
}
const dayMs = 86400000;
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const scalar = (v: SearchParams[string]) => (typeof v === "string" ? v : "");
function validDay(value: string) {
  const ms = Date.parse(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(ms) &&
    day(ms) === value
  );
}
export function geographyFilters(params: SearchParams, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const todayMs = Date.parse(today);
  const range =
    scalar(params.range) || (params.from || params.to ? "custom" : "30");
  if (!["today", "7", "30", "90", "custom"].includes(range))
    throw new AppError(400, "Invalid date preset");
  const from =
    range === "custom"
      ? scalar(params.from)
      : day(todayMs - (range === "today" ? 0 : Number(range) - 1) * dayMs);
  const to = range === "custom" ? scalar(params.to) : today;
  if (!validDay(from) || !validDay(to) || from > to || to > today)
    throw new AppError(
      400,
      "Choose valid dates, in order, no later than today (UTC).",
    );
  const days = (Date.parse(to) - Date.parse(from)) / dayMs + 1;
  if (days > 366) throw new AppError(400, "Select at most 366 days.");
  const country = scalar(params.country).toUpperCase();
  if (country && country !== "UNKNOWN" && !countries.has(country))
    throw new AppError(400, "Invalid country code");
  const interval = scalar(params.interval) || "day";
  if (!["day", "week", "month"].includes(interval))
    throw new AppError(400, "Invalid trend interval");
  return {
    from,
    to,
    range,
    country,
    interval: interval as "day" | "week" | "month",
    previousFrom: day(Date.parse(from) - days * dayMs),
    previousTo: day(Date.parse(from) - dayMs),
    page: Math.max(
      1,
      Math.min(10000, Number.parseInt(scalar(params.geoPage)) || 1),
    ),
  };
}
