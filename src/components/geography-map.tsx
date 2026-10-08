"use client";
import { useEffect, useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { countryName, normalizeCountry } from "@/lib/geography-policy";
import type { CountryRow } from "@/lib/geography";
type MapData = FeatureCollection<Geometry, { code: string; name: string }>;
const path = geoPath(
  geoNaturalEarth1().fitExtent(
    [
      [8, 8],
      [952, 492],
    ],
    { type: "Sphere" },
  ),
);
export default function GeographyMap({
  countries,
  selected,
  onSelect,
}: {
  countries: CountryRow[];
  selected: string;
  onSelect: (country: string) => void;
}) {
  const [data, setData] = useState<MapData | null>(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/maps/countries.geojson", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<MapData>;
      })
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);
  const values = useMemo(
    () => new Map(countries.map((c) => [c._id, c])),
    [countries],
  );
  const max = Math.max(
    1,
    ...countries.filter((c) => c._id !== "UNKNOWN").map((c) => c.views),
  );
  if (failed)
    return <p role="status">Map unavailable. Use the country table below.</p>;
  if (!data) return <p role="status">Loading world map…</p>;
  const description = (code: string) =>
    `${countryName(code)}: ${values.get(code)?.views.toLocaleString() || "0"} recorded views (${(values.get(code)?.percentage || 0).toFixed(1)}% of total)`;
  return (
    <>
      <svg
        className="geography-map"
        viewBox="0 0 960 500"
        role="group"
        aria-label="World map of recorded article page views"
      >
        <path d={path({ type: "Sphere" }) || ""} fill="#f3f6f8" />
        {data.features.map((feature, index) => {
          const code = normalizeCountry(feature.properties.code);
          const views = values.get(code)?.views || 0;
          const selectable = code !== "UNKNOWN";
          return (
            <path
              key={`${code}-${index}`}
              d={path(feature) || ""}
              fill={
                selectable && views
                  ? `hsl(18 65% ${85 - Math.sqrt(views / max) * 50}%)`
                  : "#dce1e5"
              }
              stroke={selected === code ? "#14202b" : "white"}
              strokeWidth={selected === code ? 2 : 0.6}
              role={selectable ? "button" : undefined}
              tabIndex={selectable ? 0 : undefined}
              aria-label={
                selectable ? description(code) : feature.properties.name
              }
              aria-pressed={selectable ? selected === code : undefined}
              onMouseEnter={() =>
                setHover(
                  selectable
                    ? description(code)
                    : `${feature.properties.name}: not mapped to an ISO country`,
                )
              }
              onFocus={() => setHover(description(code))}
              onClick={() => selectable && onSelect(code)}
              onKeyDown={(event) => {
                if (selectable && ["Enter", " "].includes(event.key)) {
                  event.preventDefault();
                  onSelect(code);
                }
              }}
            >
              <title>
                {selectable ? description(code) : feature.properties.name}
              </title>
            </path>
          );
        })}
      </svg>
      <p className="small" role="status">
        {hover ||
          "Hover or focus a country for details; select it to explore its articles."}
      </p>
      <p className="small muted">
        Gray: no recorded views. Darker orange: more views. Unknown locations
        are listed in the table. Small territories may be omitted at this scale.
        Map: Natural Earth, public domain.
      </p>
    </>
  );
}
