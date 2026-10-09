import { ImageResponse } from "next/og";
// Publisher logo referenced by NewsArticle / Organization structured data.
export const dynamic = "force-static";
export function GET() { return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#14202b", color: "white", fontSize: 300, fontWeight: 900 }}>S<div style={{ width: 110, height: 56, background: "#e98054", transform: "skewX(-20deg)", marginLeft: 36, marginBottom: 120 }} /></div>, { width: 512, height: 512 }); }
