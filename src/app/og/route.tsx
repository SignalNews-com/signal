import { ImageResponse } from "next/og";
// Branded 1200×630 share image used when a page or story has no cover image.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const title = (params.get("title") || "SIGNAL — Technology in perspective").slice(0, 140); const kicker = (params.get("kicker") || "Technology in perspective").slice(0, 40);
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#14202b", color: "white", borderBottom: "14px solid #c44922" }}><div style={{ display: "flex", alignItems: "center", fontSize: 54, fontWeight: 900, letterSpacing: -3 }}>SIGNAL<div style={{ width: 30, height: 16, background: "#e98054", transform: "skewX(-20deg)", marginLeft: 10, marginBottom: 20 }} /></div><div style={{ display: "flex", flexDirection: "column" }}><div style={{ fontSize: 26, letterSpacing: 4, color: "#eda37e", textTransform: "uppercase", marginBottom: 22 }}>{kicker}</div><div style={{ fontSize: title.length > 80 ? 52 : 66, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2 }}>{title}</div></div></div>, { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" } });
}
