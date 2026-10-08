"use client";
import { useEffect, useState } from "react";
export function ViewTracker({ id }: { id: string }) {
  useEffect(() => {
    let sent = false;
    const send = async () => {
      if (sent || document.visibilityState !== "visible") return;
      sent = true;
      try {
        const url = new URL(window.location.href);
        const response = await fetch(`/api/views/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ referrer: document.referrer.slice(0, 2048), utmSource: url.searchParams.get("utm_source")?.slice(0, 100), utmMedium: url.searchParams.get("utm_medium")?.slice(0, 100) }), keepalive: true });
        if (!response.ok) sent = false;
      } catch { sent = false; }
    };
    const consentChanged = () => { sent = false; void send(); };
    const timer = window.setTimeout(() => void send(), 1500);
    document.addEventListener("visibilitychange", send);
    window.addEventListener("signal-consent-change", consentChanged);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", send); window.removeEventListener("signal-consent-change", consentChanged); };
  }, [id]);
  return null;
}
export function ShareButtons({ title }: { title: string }) { const [copied, setCopied] = useState(false); const [error, setError] = useState(""); return <div className="share-row"><span className="eyebrow">SHARE THIS STORY</span><button className="button secondary" onClick={async () => { try { if (navigator.share) await navigator.share({ title, url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); setCopied(true); } } catch (e) { if (e instanceof Error && e.name !== "AbortError") setError("Sharing is unavailable. Copy the address from your address bar."); } }}>{copied ? "Link copied" : "Share / copy link"}</button>{error ? <p role="status">{error}</p> : null}</div>; }
