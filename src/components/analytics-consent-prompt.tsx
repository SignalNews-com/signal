import { cookies, headers } from "next/headers";
import Link from "next/link";
import { AnalyticsConsent } from "./analytics-consent";
export async function AnalyticsConsentPrompt() {
  const [jar, requestHeaders] = await Promise.all([cookies(), headers()]);
  if (
    process.env.ANALYTICS_ENABLED === "false" ||
    process.env.ANALYTICS_CONSENT_MODE === "optional" ||
    jar.has("signal-analytics-consent") ||
    requestHeaders.get("sec-gpc") === "1" ||
    requestHeaders.get("dnt") === "1"
  )
    return null;
  return (
    <section aria-label="Article analytics preference">
      <AnalyticsConsent />
      <Link className="text-link" href="/privacy">
        Read our privacy notice and manage preferences
      </Link>
    </section>
  );
}
