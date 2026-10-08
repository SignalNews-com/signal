// Rebuild the local public-domain map asset; no third-party requests in the dashboard.
import { mkdir, writeFile } from "node:fs/promises";
import { geoArea } from "d3-geo";
const source =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson";
const response = await fetch(source);
if (!response.ok) throw new Error(`Map download failed: ${response.status}`);
const data = await response.json();
for (const feature of data.features) {
  feature.properties = {
    code: feature.properties.ISO_A2_EH,
    name: feature.properties.NAME_EN,
  };
  // d3-geo expects clockwise exterior rings, unlike RFC 7946.
  if (geoArea(feature) > 2 * Math.PI) {
    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    for (const polygon of polygons) for (const ring of polygon) ring.reverse();
  }
}
await mkdir("public/maps", { recursive: true });
await writeFile("public/maps/countries.geojson", JSON.stringify(data));
console.log(`Saved ${data.features.length} Natural Earth country shapes.`);
