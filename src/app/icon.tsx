import { ImageResponse } from "next/og";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export default function Icon() { return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#14202b", color: "white", fontSize: 46, fontWeight: 900, borderRadius: 12 }}>S<div style={{ width: 14, height: 8, background: "#e98054", transform: "skewX(-20deg)", marginLeft: 4, marginBottom: 14 }} /></div>, size); }
