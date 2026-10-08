import Link from "next/link";
import {
  geographyReport,
  type GeographyReport,
  type GeographyScope,
  type RankingRow,
} from "@/lib/geography";
import { countryCodes, countryName } from "@/lib/geography-policy";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/lib/permissions";
import type { SearchParams } from "@/types";
import { Stat } from "./ui";
import { GeographyExplorer } from "./geography-explorer";

function Ranking({
  title,
  rows,
  base,
}: {
  title: string;
  rows: RankingRow[];
  base?: string;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {rows.length ? (
        <ol className="ranking">
          {rows.map((row) => (
            <li key={row._id || row.name}>
              {base && row._id ? (
                <Link
                  href={`${base}/${row._id}${base.endsWith("articles") ? "/edit" : ""}`}
                >
                  {row.name}
                </Link>
              ) : (
                row.name
              )}
              <strong>{row.views.toLocaleString()} views</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p>No recorded views for this selection.</p>
      )}
    </section>
  );
}
const colors = ["#bb4925", "#245da2", "#16806a", "#7d449b", "#826315"];
function Trends({ data }: { data: GeographyReport }) {
  // Empty buckets are actual zeroes within the queried range, not sample observations.
  const buckets = new Set<string>();
  for (
    let date = new Date(`${data.from}T00:00:00Z`);
    date <= new Date(`${data.to}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const bucket = new Date(date);
    if (data.interval === "week")
      bucket.setUTCDate(bucket.getUTCDate() - ((bucket.getUTCDay() + 6) % 7));
    if (data.interval === "month") bucket.setUTCDate(1);
    buckets.add(bucket.toISOString().slice(0, 10));
  }
  const dates = [...buckets];
  const values = new Map(
    data.trend.map((p) => [`${p.date}:${p.country}`, p.views]),
  );
  const maximum = Math.max(1, ...data.trend.map((p) => p.views));
  return (
    <section className="panel">
      <h2>Geographic traffic trend</h2>
      <p className="small muted">
        {data.country
          ? countryName(data.country)
          : "Comparison of the top five recorded countries"}{" "}
        · {data.interval} buckets, UTC. Weeks start Monday. Edge buckets may be
        partial.
      </p>
      {data.trend.length ? (
        <>
          <svg
            className="geography-trend"
            viewBox="0 0 900 240"
            role="img"
            aria-label="Country page views over time. Exact values in the table below."
          >
            <text x="2" y="18" fontSize="12">
              {maximum}
            </text>
            <text x="2" y="214" fontSize="12">
              0
            </text>
            <path d="M45 15V210H880" stroke="#ccd3d9" fill="none" />
            {data.trendCountries.map((country, index) => {
              const points = dates.map(
                (date, i) =>
                  `${45 + (i / Math.max(1, dates.length - 1)) * 825},${210 - ((values.get(`${date}:${country}`) || 0) / maximum) * 185}`,
              );
              return (
                <g key={country}>
                  <polyline
                    points={points.join(" ")}
                    stroke={colors[index % colors.length]}
                    strokeWidth="2.5"
                    fill="none"
                  />
                  {points.length === 1 ? (
                    <circle
                      cx={points[0].split(",")[0]}
                      cy={points[0].split(",")[1]}
                      r="4"
                      fill={colors[index % colors.length]}
                    />
                  ) : null}
                </g>
              );
            })}
            <text x="45" y="235" fontSize="12">
              {dates[0]}
            </text>
            <text x="880" y="235" textAnchor="end" fontSize="12">
              {dates.at(-1)}
            </text>
          </svg>
          <div className="actions">
            {data.trendCountries.map((c, i) => (
              <span key={c} style={{ color: colors[i % colors.length] }}>
                ● {countryName(c)}
              </span>
            ))}
          </div>
          <details>
            <summary>View accessible trend table</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Period start (UTC)</th>
                    {data.trendCountries.map((c) => (
                      <th key={c}>{countryName(c)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dates.map((date) => (
                    <tr key={date}>
                      <th>{date}</th>
                      {data.trendCountries.map((c) => (
                        <td key={c}>
                          {(values.get(`${date}:${c}`) || 0).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <p>No recorded views to chart.</p>
      )}
    </section>
  );
}
export async function GeographyPanel({
  actor,
  params,
  scope = {},
  summary = false,
}: {
  actor: Actor;
  params: SearchParams;
  scope?: GeographyScope;
  summary?: boolean;
}) {
  let data: GeographyReport;
  try {
    data = await geographyReport(actor, params, scope);
  } catch (error) {
    if (error instanceof AppError && error.status === 400)
      return (
        <p role="alert" className="notice error">
          {error.message}{" "}
          <Link
            href={
              actor.role === "ADMIN"
                ? "/admin/analytics/geography"
                : "/writer/analytics/geography"
            }
          >
            Reset geographic filters
          </Link>
        </p>
      );
    throw error;
  }
  const base = actor.role === "ADMIN" ? "/admin" : "/writer";
  const top = data.countries.filter((c) => c._id !== "UNKNOWN" && c.views > 0);
  if (summary)
    return (
      <section className="panel">
        <div className="section-heading">
          <h2>
            Geographic audience <small>Last 30 days</small>
          </h2>
          <Link className="text-link" href={`${base}/analytics/geography`}>
            Geographic Analytics
          </Link>
        </div>
        <p>
          Top country:{" "}
          <strong>
            {top[0] ? countryName(top[0]._id) : "No known-country views yet"}
          </strong>
        </p>
        <ol className="ranking">
          {top.slice(0, 5).map((c) => (
            <li key={c._id}>
              <Link href={`${base}/analytics/geography?country=${c._id}`}>
                {countryName(c._id)}
              </Link>
              <strong>
                {c.views.toLocaleString()} views · {c.percentage.toFixed(1)}%
              </strong>
            </li>
          ))}
        </ol>
        <p className="small muted">
          {data.total.toLocaleString()} geographically tracked page views ·{" "}
          {data.unknown.toLocaleString()} unknown-country views. Collection
          begins when this feature is enabled.
        </p>
        <Trends data={data} />
      </section>
    );
  const href = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      if (typeof value === "string") query.set(key, value);
    query.set("geoPage", String(page));
    return `?${query}`;
  };
  const fastest = top
    .filter((c) => c.growth !== null && c.growth > 0)
    .toSorted((a, b) => (b.growth || 0) - (a.growth || 0))
    .slice(0, 5);
  return (
    <div className="geography-panel">
      <h2>Geographic analytics</h2>
      <p className="small muted">
        First-party, deduplicated article page views: one per reader cookie,
        article and UTC day. These are not unique visitors. Historical views
        without country data are excluded. Country estimates can be affected by
        VPNs, proxies and mobile networks.
      </p>
      <form className="filters">
        <label>
          Period
          <select name="range" defaultValue={data.range}>
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="custom">Custom date range</option>
          </select>
        </label>
        <label>
          Custom from · UTC
          <input name="from" type="date" defaultValue={data.from} />
        </label>
        <label>
          Custom through · UTC
          <input name="to" type="date" defaultValue={data.to} />
        </label>
        <label>
          Trend interval
          <select name="interval" defaultValue={data.interval}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </label>
        <label>
          Country
          <select name="country" defaultValue={data.country}>
            <option value="">All countries</option>
            {countryCodes
              .toSorted((a, b) => countryName(a).localeCompare(countryName(b)))
              .map((c) => (
                <option key={c} value={c}>
                  {countryName(c)}
                </option>
              ))}
            <option value="UNKNOWN">Unknown country</option>
          </select>
        </label>
        <button className="button secondary">Update geography</button>
      </form>
      <p className="small">
        {data.from} through {data.to} · Compared with {data.previousFrom}{" "}
        through {data.previousTo}. Current-day data is partial.
      </p>
      <div className="stats-grid compact">
        <Stat label="Total tracked page views" value={data.total} />
        <Stat label="Known-country views" value={data.known} />
        <Stat label="Unknown-country views" value={data.unknown} />
      </div>
      <section className="panel">
        <h2>Top 10 countries · page-view comparison</h2>
        {top.length ? (
          <div className="bar-chart">
            {top.slice(0, 10).map((c) => (
              <div className="bar-row" key={c._id}>
                <span>{countryName(c._id)}</span>
                <div>
                  <span
                    style={{ width: `${(c.views / top[0].views) * 100}%` }}
                  />
                </div>
                <strong>{c.views.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p>No known-country views recorded in this period.</p>
        )}
      </section>
      <GeographyExplorer countries={data.countries} selected={data.country} />
      <Trends data={data} />
      <section className="panel">
        <h2>Fast-growing audiences</h2>
        {fastest.length ? (
          <ul>
            {fastest.map((c) => (
              <li key={c._id}>
                {countryName(c._id)}: +{c.growth?.toFixed(1)}% (
                {c.previous.toLocaleString()} → {c.views.toLocaleString()}{" "}
                views)
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No positive growth with a nonzero previous-period baseline. New
            audiences appear as “No baseline” in the country table.
          </p>
        )}
      </section>
      <h2>
        {data.country ? countryName(data.country) : "All countries"} ·{" "}
        {data.selectedViews.toLocaleString()} views
      </h2>
      <Ranking
        title="Most-read articles"
        rows={data.articles}
        base={`${base}/articles`}
      />
      <nav className="pagination" aria-label="Geographic article pages">
        {data.page > 1 ? (
          <Link href={href(data.page - 1)}>Previous articles</Link>
        ) : (
          <span />
        )}
        <span>
          Page {data.page} of {data.pages}
        </span>
        {data.page < data.pages ? (
          <Link href={href(data.page + 1)}>Next articles</Link>
        ) : (
          <span />
        )}
      </nav>
      <div className="two-column">
        {actor.role === "ADMIN" ? (
          <Ranking
            title="Top writers in this selection"
            rows={data.writers}
            base="/admin/writers"
          />
        ) : null}
        <Ranking
          title="Top categories in this selection"
          rows={data.categories}
        />
        <Ranking
          title="Traffic sources in this selection"
          rows={data.sources}
        />
      </div>
      <p className="small muted">
        Source attribution uses reported referrer and UTM data, which can be
        missing or inaccurate. “Direct / unknown” does not prove a direct visit.
        No raw referrer URLs or UTM values are stored.
      </p>
    </div>
  );
}
