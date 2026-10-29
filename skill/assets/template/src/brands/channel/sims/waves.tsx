import React from "react";
import { useTheme } from "../../../lib/useTheme";
import { SvgTex, Readouts, fmt, say } from "../components/draw";
import { refract, wave, type WaveMode } from "../lib/physics";
import { lerp, rad } from "../lib/plot";
import { num, on, str, type SimProps } from "./common";

// ---------------------------------------------------------------- waves: travelling, standing, superposition
export const Wave: React.FC<SimProps> = ({ t, w, h, params, show }) => {
  const th = useTheme(); const S = th.simple;
  const mode = str(params, "mode", "travel") as WaveMode;
  const A = num(params, "A", 1), lam = num(params, "wavelength", 4), freq = num(params, "freq", 0.5);
  const k = (2 * Math.PI) / lam, om = 2 * Math.PI * freq;
  const f = wave(mode, A, k, om);
  const X0 = 90, W = w - 180, xmax = lam * 4, midY = h * 0.5, sc = (h * 0.5 - 135) / (mode === "superposition" ? 2 * A : mode === "standing" ? 2 * A : A);
  const X = (x: number) => X0 + (x / xmax) * W;
  const path = (idx: number) => Array.from({ length: 241 }, (_, i) => { const x = (xmax * i) / 240; return `${i ? "L" : "M"}${X(x).toFixed(1)} ${(midY - f(x, t)[idx] * sc).toFixed(1)}`; }).join(" ");
  const dotX = lam * 1.5, dot = f(dotX, t);
  return (
    <g>
      <line x1={X0} x2={X0 + W} y1={midY} y2={midY} stroke={th.physics.axis} strokeWidth={3} />
      {mode === "superposition" && (
        <>
          <path d={path(1)} fill="none" stroke={th.physics.velocity} strokeWidth={4} opacity={0.55} />
          <path d={path(2)} fill="none" stroke={th.physics.force} strokeWidth={4} opacity={0.55} />
        </>
      )}
      <path d={path(0)} fill="none" stroke={mode === "superposition" ? th.physics.trace : th.physics.velocity} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      {on(show, "particle", true) && (
        <g>
          <line x1={X(dotX)} x2={X(dotX)} y1={midY - A * sc * 1.2} y2={midY + A * sc * 1.2} stroke={th.physics.grid} strokeWidth={3} strokeDasharray="10 8" />
          <circle cx={X(dotX)} cy={midY - dot[0] * sc} r={15} fill={th.pastel.sun} stroke={th.c.line} strokeWidth={3} />
        </g>
      )}
      {on(show, "wavelength", mode === "travel") && (
        <g>
          <line x1={X(lam * 0.25)} x2={X(lam * 1.25)} y1={midY + A * sc + 56} y2={midY + A * sc + 56} stroke={th.physics.accel} strokeWidth={4} />
          <line x1={X(lam * 0.25)} x2={X(lam * 0.25)} y1={midY + A * sc + 42} y2={midY + A * sc + 70} stroke={th.physics.accel} strokeWidth={4} />
          <line x1={X(lam * 1.25)} x2={X(lam * 1.25)} y1={midY + A * sc + 42} y2={midY + A * sc + 70} stroke={th.physics.accel} strokeWidth={4} />
          <SvgTex x={X(lam * 0.75)} y={midY + A * sc + 100} tex={S ? "\\text{One wave}" : "\\lambda"} size={S ? 38 : 36} w={260} color={th.physics.accel} />
        </g>
      )}
      <Readouts items={S ? [{ tex: `${fmt(freq, 1)}\\ \\text{waves every second}`, color: "velocity" }] : [{ tex: `f = ${fmt(freq, 2)}\\ \\text{Hz}`, color: "velocity" }, { tex: `v = ${fmt(lam * freq, 2)}\\ \\text{m/s}`, color: "accel" }]} />
    </g>
  );
};

// ---------------------------------------------------------------- refraction (Snell's law)
export const Optics: React.FC<SimProps> = ({ t, w, h, dur, params }) => {
  const th = useTheme(); const S = th.simple;
  const n1 = num(params, "n1", 1), n2 = num(params, "n2", 1.5), to = num(params, "angle", 40), from = num(params, "from", to);
  const a1 = lerp(from, to, Math.min(1, t / (0.8 * dur)));
  const r = refract(n1, n2, a1);
  const cx = w / 2, cy = h / 2, R = Math.min(h * 0.42, 250);
  const d1 = rad(a1);
  const inc = { x: cx - Math.sin(d1) * R, y: cy - Math.cos(d1) * R };
  const ref = { x: cx + Math.sin(d1) * R, y: cy - Math.cos(d1) * R };
  const d2 = rad(r.total ? 0 : r.theta2);
  const tr = { x: cx + Math.sin(d2) * R, y: cy + Math.cos(d2) * R };
  const ray = (x: number, y: number, c: string, o = 1) => <line x1={cx} y1={cy} x2={x} y2={y} stroke={c} strokeWidth={8} strokeLinecap="round" opacity={o} />;
  return (
    <g>
      <rect x={-w} y={cy} width={3 * w} height={h} fill={th.physics.velocity} opacity={0.13} />
      <line x1={0} x2={w} y1={cy} y2={cy} stroke={th.physics.axis} strokeWidth={4} />
      <line x1={cx} x2={cx} y1={cy - R * 1.1} y2={cy + R * 1.1} stroke={th.physics.grid} strokeWidth={3} strokeDasharray="12 10" />
      {ray(inc.x, inc.y, th.physics.energy)}
      {ray(ref.x, ref.y, th.physics.energy, r.total ? 1 : 0.3)}
      {!r.total && ray(tr.x, tr.y, th.physics.energy)}
      <SvgTex x={cx - Math.sin(d1 / 2) * R * 0.5 - 40} y={cy - Math.cos(d1 / 2) * R * 0.5} tex={S ? "\\text{In}" : "\\theta_1"} size={S ? 36 : 30} color={th.physics.accel} w={90} />
      {!r.total && <SvgTex x={cx + Math.sin(d2 / 2) * R * 0.5 - 40} y={cy + Math.cos(d2 / 2) * R * 0.5 + 10} tex={S ? "\\text{Out}" : "\\theta_2"} size={S ? 36 : 30} color={th.physics.accel} w={90} />}
      <SvgTex x={60} y={cy - 40} tex={S ? (n1 <= 1.05 ? "\\text{Air}" : n1 < 1.4 ? "\\text{Water}" : "\\text{Glass}") : `n_1 = ${fmt(n1, 2)}`} size={S ? 38 : 30} color={th.c.muted} anchor="start" w={240} />
      <SvgTex x={60} y={cy + 40} tex={S ? (n2 <= 1.05 ? "\\text{Air}" : n2 < 1.4 ? "\\text{Water}" : "\\text{Glass}") : `n_2 = ${fmt(n2, 2)}`} size={S ? 38 : 30} color={th.c.muted} anchor="start" w={240} />
      <Readouts x={w - (S ? 520 : 460)} items={S ? [{ tex: r.total ? "\\text{It bounces back inside!}" : "\\text{The light bends}", color: "accel" }] : [{ tex: `\\theta_1 = ${fmt(a1, 0)}^\\circ`, color: "accel" }, { tex: r.total ? "\\text{total internal reflection}" : `\\theta_2 = ${fmt(r.theta2, 1)}^\\circ`, color: "accel" }]} />
    </g>
  );
};
