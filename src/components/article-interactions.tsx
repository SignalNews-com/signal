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
const networks = [["X", "https://x.com/intent/post?text={title}&url={url}"], ["Facebook", "https://www.facebook.com/sharer/sharer.php?u={url}"], ["LinkedIn", "https://www.linkedin.com/sharing/share-offsite/?url={url}"], ["WhatsApp", "https://wa.me/?text={title}%20{url}"]] as const;
export function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false); const [error, setError] = useState("");
  const shareLink = (template: string) => template.replace("{title}", encodeURIComponent(title)).replace("{url}", encodeURIComponent(url));
  return <div className="share-row"><span className="eyebrow">SHARE THIS STORY</span><div className="share-actions">{networks.map(([name, template]) => <a key={name} className="button secondary" href={shareLink(template)} target="_blank" rel="noopener noreferrer">{name}</a>)}<button className="button secondary" onClick={async () => { try { if (navigator.share) await navigator.share({ title, url }); else { await navigator.clipboard.writeText(url); setCopied(true); } } catch (e) { if (e instanceof Error && e.name !== "AbortError") setError("Sharing is unavailable. Copy the address from your address bar."); } }}>{copied ? "Link copied" : "Copy link"}</button></div>{error ? <p role="status">{error}</p> : null}</div>;
}
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; const body = document.querySelector(".article-body"); if (!body) return; const rect = body.getBoundingClientRect(); const total = rect.height - window.innerHeight; setProgress(total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1); };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    frame = window.requestAnimationFrame(update); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);
  return <div className="reading-progress" aria-hidden="true" style={{ transform: `scaleX(${progress})` }} />;
}
