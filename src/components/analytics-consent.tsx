"use client";
import { useState } from "react";
export function AnalyticsConsent() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(consent: "granted" | "denied") {
    setBusy(true);
    try {
      const response = await fetch("/api/analytics/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent }),
      });
      if (!response.ok) throw new Error();
      setMessage(
        consent === "granted"
          ? "Article analytics allowed. Your browser privacy signals still take priority."
          : "Article analytics declined.",
      );
      window.dispatchEvent(new Event("signal-consent-change"));
    } catch {
      setMessage("Unable to save your preference. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="notice">
      <p>
        Help us understand which countries read our articles. Optional analytics
        use a short-lived cookie and country-level counts.
      </p>
      <div className="actions">
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => save("granted")}
        >
          Allow article analytics
        </button>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => save("denied")}
        >
          Decline article analytics
        </button>
      </div>
      <p role="status">{message}</p>
    </div>
  );
}
