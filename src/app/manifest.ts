import type { MetadataRoute } from "next";
import { site } from "@/lib/seo";
export default function manifest(): MetadataRoute.Manifest { return { name: `${site.name} — ${site.tagline}`, short_name: site.name, description: site.description, start_url: "/", display: "standalone", background_color: "#fafbfc", theme_color: "#14202b", icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }, { src: "/apple-icon", sizes: "180x180", type: "image/png" }, { src: "/logo.png", sizes: "512x512", type: "image/png" }] }; }
