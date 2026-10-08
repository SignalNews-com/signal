"use client";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { countryName } from "@/lib/geography-policy";
import type { CountryRow } from "@/lib/geography";
const Map = dynamic(() => import("./geography-map"), {
  ssr: false,
  loading: () => <p>Loading world map…</p>,
});
export function GeographyExplorer({
  countries,
  selected,
}: {
  countries: CountryRow[];
  selected: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  function select(country: string) {
    const query = new URLSearchParams(params);
    query.set("country", country);
    query.delete("geoPage");
    router.push(`${pathname}?${query}`, { scroll: false });
  }
  return (
    <section className="panel">
      <h2>Country distribution</h2>
      <Map countries={countries} selected={selected} onSelect={select} />
      <div className="table-scroll">
        <table>
          <caption>
            All recorded countries, ranked by page views. Percentages include
            unknown locations.
          </caption>
          <thead>
            <tr>
              <th>Country</th>
              <th>Page views</th>
              <th>Share</th>
              <th>Previous period</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {countries
              .filter((c) => c.views || c.previous)
              .map((c) => (
                <tr key={c._id}>
                  <td>
                    <button
                      type="button"
                      className="country-select"
                      aria-pressed={selected === c._id}
                      onClick={() => select(c._id)}
                    >
                      {countryName(c._id)}
                    </button>
                  </td>
                  <td>{c.views.toLocaleString()}</td>
                  <td>{c.percentage.toFixed(1)}%</td>
                  <td>{c.previous.toLocaleString()}</td>
                  <td>
                    {c.growth === null
                      ? "No baseline"
                      : `${c.growth > 0 ? "+" : ""}${c.growth.toFixed(1)}%`}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!countries.length ? (
        <p>No country views collected in these periods.</p>
      ) : null}
    </section>
  );
}
