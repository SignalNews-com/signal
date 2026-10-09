"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
const noop = () => () => {};
// Decided client-side so article pages stay fully static (ISR); privacy signals always win.
function needsPrompt() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl || navigator.doNotTrack === "1") return false;
  return !document.cookie.split("; ").some(c => c.startsWith("signal-analytics-consent="));
}
export function AnalyticsConsentPrompt({ enabled }: { enabled: boolean }) {
  const pending = useSyncExternalStore(noop, needsPrompt, () => false);
  const [done, setDone] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  if (!enabled || !pending || done) return null;
  async function save(consent: "granted" | "denied") {
    setBusy(true); setError("");
    try { const response = await fetch("/api/analytics/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent }) }); if (!response.ok) throw new Error(); setDone(true); window.dispatchEvent(new Event("signal-consent-change")); }
    catch { setError("Couldn't save your choice. Please try again."); } finally { setBusy(false); }
  }
  return <section className="consent-banner" aria-label="Article analytics preference"><p>We count article views with a short-lived, first-party cookie — no ads, no cross-site tracking. <Link className="text-link" href="/privacy">Privacy notice</Link></p><div className="actions"><button className="button" disabled={busy} onClick={() => save("granted")}>Allow</button><button className="button secondary" disabled={busy} onClick={() => save("denied")}>Decline</button></div>{error ? <p role="alert" className="error-text">{error}</p> : null}</section>;
}
