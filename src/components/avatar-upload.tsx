"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./ui";
import { uploadAvatar } from "./editor/upload";
export function AvatarUpload({ name, avatar }: { name: string; avatar?: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  return <div className="avatar-upload"><Avatar person={{ name, avatar }} large /><div><label className="file-label">{busy ? "Uploading…" : avatar ? "Change profile photo" : "Add profile photo"}<input type="file" accept="image/*" disabled={busy} onChange={async event => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setBusy(true); setError(""); setMessage(""); try { await uploadAvatar(file); setMessage("Profile photo updated"); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); } finally { setBusy(false); } }} /></label><p className="small muted">Shown on your stories and author page. Square photos work best.</p>{message ? <p role="status" className="small">{message}</p> : null}{error ? <p role="alert" className="error-text">{error}</p> : null}</div></div>;
}
