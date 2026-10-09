"use client";
import { useState } from "react";
import type { SeriesPoint } from "@/lib/analytics";
const W = 800, H = 240, pad = { top: 16, right: 16, bottom: 28, left: 44 };
const fmt = (n: number) => new Intl.NumberFormat("en", { notation: n >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
const day = (iso: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
function niceMax(value: number) { if (value <= 4) return 4; const step = 10 ** Math.floor(Math.log10(value)); return Math.ceil(value / step) * step; }
// Single-series daily views: 2px line, light area, recessive grid, crosshair tooltip, and a table view.
export function ViewsChart({ data, label = "Daily article views, UTC" }: { data: SeriesPoint[]; label?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return null;
  const max = niceMax(Math.max(...data.map(d => d.count))); const innerW = W - pad.left - pad.right, innerH = H - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW); const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.count).toFixed(1)}`).join(""); const area = `${line}L${x(data.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
  const ticks = [0, max / 2, max]; const labelEvery = Math.max(1, Math.ceil(data.length / 6)); const point = hover === null ? null : data[hover];
  return <figure className="views-chart"><div className="views-chart-plot"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseLeave={() => setHover(null)} onMouseMove={event => { const box = event.currentTarget.getBoundingClientRect(); const px = ((event.clientX - box.left) / box.width) * W; setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - pad.left) / innerW) * (data.length - 1))))); }}>{ticks.map(t => <g key={t}><line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} className="grid" /><text x={pad.left - 8} y={y(t) + 4} textAnchor="end" className="axis">{fmt(t)}</text></g>)}{data.map((d, i) => i % labelEvery === 0 || i === data.length - 1 ? <text key={d._id} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="axis">{day(d._id)}</text> : null)}<path d={area} className="area" /><path d={line} className="line" />{point && hover !== null ? <g><line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={y(0)} className="crosshair" /><circle cx={x(hover)} cy={y(point.count)} r={5} className="marker" /></g> : null}</svg>{point && hover !== null ? <div className="chart-tooltip" style={{ left: `${(x(hover) / W) * 100}%` }}><strong>{fmt(point.count)} views</strong><span>{day(point._id)}</span></div> : null}</div><details className="chart-table"><summary>Show as table</summary><div className="table-scroll"><table><thead><tr><th>Day (UTC)</th><th>Views</th></tr></thead><tbody>{data.map(d => <tr key={d._id}><td>{d._id}</td><td>{fmt(d.count)}</td></tr>)}</tbody></table></div></details></figure>;
}
