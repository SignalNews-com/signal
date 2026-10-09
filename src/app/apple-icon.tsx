import { ImageResponse } from "next/og";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export default function AppleIcon() { return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#14202b", color: "white", fontSize: 120, fontWeight: 900 }}>S<div style={{ width: 40, height: 22, background: "#e98054", transform: "skewX(-20deg)", marginLeft: 13, marginBottom: 48 }} /></div>, size); }
