"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export type ApiResult = { error?: string; fields?: Record<string, string[]>; id?: string; redirect?: string; signInAgain?: boolean };
export async function apiRequest(url: string, method = "POST", data?: unknown): Promise<ApiResult> {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) });
  const result: ApiResult = await response.json();
  if (!response.ok) throw new Error(result.fields ? Object.entries(result.fields).map(([name, issues]) => `${name}: ${issues.join(", ")}`).join(" · ") : result.error || "Unable to complete request");
  return result;
}
export function Logout() {
  const router = useRouter(); const [error, setError] = useState("");
  return <><button className="nav-logout" onClick={async () => { try { await apiRequest("/api/auth/logout"); router.replace("/login"); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign out"); } }}>Sign out</button>{error ? <p role="alert">{error}</p> : null}</>;
}
export function LoginForm({ configured }: { configured: boolean }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <form className="form-stack" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget); try { const result = await apiRequest("/api/auth/login", "POST", Object.fromEntries(form)); window.location.assign(result.redirect || "/writer"); } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in"); } finally { setBusy(false); } }}>
    <label>Email address<input name="email" type="email" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label>
    {error ? <p className="notice error" role="alert">{error}</p> : null}<button className="button" disabled={busy || !configured}>{busy ? "Signing in…" : "Sign in to newsroom"}</button>
    {!configured ? <p className="notice">Sign-in is unavailable until the database and authentication secret are configured.</p> : null}<p className="muted small">Accounts are provided by your newsroom administrator.</p>
  </form>;
}
export function ActionButton({ url, method = "POST", data, children, confirm, className = "button secondary" }: { url: string; method?: string; data?: unknown; children: React.ReactNode; confirm?: string; className?: string }) {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <span className="action-control"><button className={className} disabled={busy} onClick={async () => { if (confirm && !window.confirm(confirm)) return; setBusy(true); setError(""); try { await apiRequest(url, method, data); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); } finally { setBusy(false); } }}>{busy ? "Working…" : children}</button>{error ? <span className="error-text" role="alert">{error}</span> : null}</span>;
}
export function DataForm({ url, method = "POST", children, label = "Save changes", transform, onSaved }: { url: string; method?: string; children: React.ReactNode; label?: string; transform?: (data: Record<string, FormDataEntryValue>) => unknown; onSaved?: () => void }) {
  const router = useRouter(); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <form className="form-stack" onSubmit={async e => { e.preventDefault(); setBusy(true); setMessage(""); setError(""); const data = Object.fromEntries(new FormData(e.currentTarget)); try { const result = await apiRequest(url, method, transform ? transform(data) : data); if (result.signInAgain) { router.replace("/login"); router.refresh(); return; } setMessage("Saved successfully"); onSaved?.(); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save"); } finally { setBusy(false); } }}>{children}{error ? <p className="notice error" role="alert">{error}</p> : null}{message ? <p role="status" className="notice success">{message}</p> : null}<button className="button" disabled={busy}>{busy ? "Saving…" : label}</button></form>;
}
