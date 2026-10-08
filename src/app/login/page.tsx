import Link from "next/link";
import { LoginForm } from "@/components/client-forms";
import { databaseConfigured } from "@/lib/env";
// Read deployment configuration at request time, including builds made without runtime secrets.
export const dynamic = "force-dynamic";
export const metadata = { title: "Newsroom sign in", robots: { index: false, follow: false } };
export default function Login() { return <main id="main" className="login-page"><div className="login-story"><Link href="/" className="wordmark">SIGNAL<span>▰</span></Link><div><span className="eyebrow light">THE NEWSROOM</span><h1>Good stories<br />start here.</h1><p>A space to write, refine, and publish the ideas that move technology forward.</p></div><span className="small">Independent thinking. Clear perspective.</span></div><div className="login-form"><Link href="/" className="muted small">Back to the publication</Link><h2>Welcome back.</h2><p className="muted">Sign in to your editorial workspace.</p><LoginForm configured={databaseConfigured() && Boolean(process.env.AUTH_SECRET)} /></div></main>; }
