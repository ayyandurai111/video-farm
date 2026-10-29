import React from "react";
import { useTheme } from "../../../lib/useTheme";
import { fmtTick, lerp, niceRange, niceTicks } from "../lib/plot";
import { compile } from "../lib/expr";
import { col } from "./draw";

export type Series = { label?: string; color?: string; points?: [number, number][]; expr?: string; dashed?: boolean; fill?: boolean };
export type GraphProps = {
  w: number; h: number; series: Series[]; xLabel?: string; yLabel?: string; xRange?: [number, number]; yRange?: [number, number];
  p?: number;      // 0..1 how much of each line is drawn
  marker?: boolean; // a dot rides the end of the line
};

export function resolveSeries(series: Series[], xr?: [number, number]): { pts: [number, number][]; s: Series }[] {
  return series.map((s) => {
    if (s.points && s.points.length) return { pts: s.points, s };
    if (s.expr) {
      const f = compile(s.expr), [a, b] = xr ?? [0, 10];
      const pts: [number, number][] = [];
      for (let i = 0; i <= 160; i++) { const x = a + ((b - a) * i) / 160, y = f(x); if (Number.isFinite(y)) pts.push([x, y]); }
      return { pts, s };
    }
    return { pts: [], s };
  });
}
const span = (vals: number[], given?: [number, number]): [number, number] => {
  if (given) return given;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return lo >= 0 ? niceRange(0, hi) : hi <= 0 ? niceRange(lo, 0) : niceRange(lo, hi);
};
export function pointAt(pts: [number, number][], p: number): [number, number] {
  if (!pts.length) return [0, 0];
  const f = Math.min(pts.length - 1, Math.max(0, p * (pts.length - 1)));
  const i = Math.floor(f), j = Math.min(pts.length - 1, i + 1), w = f - i;
  return [lerp(pts[i][0], pts[j][0], w), lerp(pts[i][1], pts[j][1], w)];
}

export const GraphSvg: React.FC<GraphProps> = ({ w, h, series, xLabel, yLabel, xRange, yRange, p = 1, marker }) => {
  const t = useTheme();
  const L = 120, R = 50, T = 40, B = 100;
  const xr0 = xRange ?? (series.some((s) => s.expr && !s.points) ? [0, 10] as [number, number] : undefined);
  const data = resolveSeries(series, xr0);
  const all = data.flatMap((d) => d.pts);
  const [x0, x1] = span(all.map((q) => q[0]), xRange ?? xr0);
  const [y0, y1] = span(all.map((q) => q[1]), yRange);
  const X = (x: number) => L + ((x - x0) / (x1 - x0)) * (w - L - R);
  const Y = (y: number) => h - B - ((y - y0) / (y1 - y0)) * (h - T - B);
  const xt = niceTicks(x0, x1, 6), yt = niceTicks(y0, y1, 5);
  const fs = t.simple ? 32 : 26;
  const axisY = Y(Math.min(Math.max(0, y0), y1)), axisX = X(Math.min(Math.max(0, x0), x1));
  return (
    <g>
      {xt.map((v) => <line key={`gx${v}`} x1={X(v)} x2={X(v)} y1={T} y2={h - B} stroke={t.physics.grid} strokeWidth={2} />)}
      {yt.map((v) => <line key={`gy${v}`} x1={L} x2={w - R} y1={Y(v)} y2={Y(v)} stroke={t.physics.grid} strokeWidth={2} />)}
      <line x1={L} x2={w - R} y1={axisY} y2={axisY} stroke={t.physics.axis} strokeWidth={3.5} strokeLinecap="round" />
      <line x1={axisX} x2={axisX} y1={T} y2={h - B} stroke={t.physics.axis} strokeWidth={3.5} strokeLinecap="round" />
      {xt.map((v) => <text key={`tx${v}`} x={X(v)} y={h - B + fs * 1.4} fontSize={fs} textAnchor="middle" fill={t.c.muted} fontFamily={t.fonts.body} fontWeight={700}>{fmtTick(v)}</text>)}
      {yt.map((v) => <text key={`ty${v}`} x={L - 16} y={Y(v) + fs * 0.35} fontSize={fs} textAnchor="end" fill={t.c.muted} fontFamily={t.fonts.body} fontWeight={700}>{fmtTick(v)}</text>)}
      {xLabel && <text x={(L + w - R) / 2} y={h - 18} fontSize={fs * 1.15} textAnchor="middle" fill={t.c.ink} fontFamily={t.simple ? t.fonts.body : t.fonts.math} fontWeight={t.simple ? 800 : 400} fontStyle={t.simple ? "normal" : "italic"}>{xLabel}</text>}
      {yLabel && <text transform={`translate(34 ${(T + h - B) / 2}) rotate(-90)`} fontSize={fs * 1.15} textAnchor="middle" fill={t.c.ink} fontFamily={t.simple ? t.fonts.body : t.fonts.math} fontWeight={t.simple ? 800 : 400} fontStyle={t.simple ? "normal" : "italic"}>{yLabel}</text>}
      {data.map(({ pts, s }, i) => {
        if (pts.length < 2) return null;
        const c = col(t, s.color, [t.physics.velocity, t.physics.force, t.physics.energy, t.physics.field][i % 4]);
        const d = pts.map((q, k) => `${k ? "L" : "M"}${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join(" ");
        const [mx, my] = pointAt(pts, p);
        const fillId = `gf${i}`;
        return (
          <g key={i}>
            {s.fill && (
              <>
                <clipPath id={fillId}><rect x={L} y={0} width={Math.max(0, X(mx) - L)} height={h} /></clipPath>
                <path d={`${d} L${X(pts[pts.length - 1][0]).toFixed(1)} ${Y(0)} L${X(pts[0][0]).toFixed(1)} ${Y(0)} Z`} fill={c} opacity={0.22} clipPath={`url(#${fillId})`} />
              </>
            )}
            <path d={d} fill="none" stroke={c} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round"
              {...(s.dashed ? { strokeDasharray: "18 14", opacity: Math.min(1, p * 2) } : { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - p })} />
            {marker && p > 0 && <circle cx={X(mx)} cy={Y(my)} r={13} fill={c} stroke={t.c.surface} strokeWidth={4} />}
            {s.label && p > 0.3 && <text x={X(pts[Math.floor(pts.length * 0.9)][0]) } y={Y(pts[Math.floor(pts.length * 0.9)][1]) - 20} fontSize={fs * 1.1} fill={c} fontWeight={800} fontFamily={t.fonts.math} fontStyle="italic" textAnchor="end">{s.label}</text>}
          </g>
        );
      })}
    </g>
  );
};
