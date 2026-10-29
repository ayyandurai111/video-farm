import React from "react";
import { useTheme } from "../../../lib/useTheme";
import { Arrow, Readouts, SvgTex, col, fit, fmt, prog, say } from "../components/draw";
import { G, collision, incline, orbit, pendulum, projectile, spring } from "../lib/physics";
import { clamp, rad } from "../lib/plot";
import { num, on, type SimProps } from "./common";

// ---------------------------------------------------------------- projectile
export const Projectile: React.FC<SimProps> = ({ t, frame, w, h, dur, params, show }) => {
  const th = useTheme(); const S = th.simple;
  const v0 = num(params, "v0", 20), angle = num(params, "angle", 45), g = num(params, "g", G), h0 = num(params, "h0", 0);
  const pr = projectile({ v0, angle, g, h0 });
  const tt = t * (num(params, "speed", 1)) * (pr.tFlight / (0.78 * dur));
  const s = pr.at(tt);
  const f = fit({ x0: -1, x1: Math.max(pr.range * 1.08, 4), y0: -0.8, y1: Math.max(pr.hMax * 1.35, 3) }, w, h, 70);
  const trail: React.ReactNode[] = [];
  for (let k = 0; k * 0.06 < s.t; k++) { const q = pr.at(k * 0.06); trail.push(<circle key={k} cx={f.X(q.x)} cy={f.Y(q.y)} r={5} fill={th.physics.trace} opacity={0.85} />); }
  const A = 7; // pixels of arrow per m/s
  const px = f.X(s.x), py = f.Y(s.y);
  return (
    <g>
      <rect x={-w} y={f.Y(0)} width={3 * w} height={h} fill={th.c.hair} opacity={0.55} />
      <line x1={0} x2={w} y1={f.Y(0)} y2={f.Y(0)} stroke={th.physics.axis} strokeWidth={4} />
      {h0 > 0 && <rect x={f.X(-1)} y={f.Y(h0)} width={f.X(0) - f.X(-1)} height={f.Y(0) - f.Y(h0)} fill={th.c.hair} stroke={th.physics.axis} strokeWidth={3} />}
      {on(show, "trail", true) && trail}
      {on(show, "components") && <Arrow x1={px} y1={py} x2={px + s.vx * A} y2={py} color={th.physics.velocity} width={4} dashed label={say(S, "v_x", "\\text{Sideways}")} labelSize={S ? 34 : 26} />}
      {on(show, "components") && <Arrow x1={px} y1={py} x2={px} y2={py - s.vy * A} color={th.physics.accel} width={4} dashed label={say(S, "v_y", "\\text{Up and down}")} labelSize={S ? 34 : 26} />}
      {on(show, "velocity", true) && <Arrow x1={px} y1={py} x2={px + s.vx * A} y2={py - s.vy * A} color={th.physics.velocity} label={say(S, "\\vec{v}", "\\text{Speed}")} labelSize={S ? 36 : 30} />}
      {on(show, "gravity") && <Arrow x1={px} y1={py} x2={px} y2={py + 110} color={th.physics.force} label={say(S, "m\\vec{g}", "\\text{Gravity}")} labelSize={S ? 36 : 30} />}
      <circle cx={px} cy={py} r={S ? 22 : 17} fill={th.pastel.sun} stroke={th.c.line} strokeWidth={3} />
      <Readouts items={S ? [{ tex: `\\text{Time}\\ ${fmt(s.t, 1)}\\ \\text{s}` }, { tex: `\\text{Height}\\ ${fmt(s.y, 0)}\\ \\text{m}`, color: "trace" }] : [{ tex: `t = ${fmt(s.t, 2)}\\ \\text{s}` }, { tex: `v = ${fmt(Math.hypot(s.vx, s.vy))}\\ \\text{m/s}`, color: "velocity" }, { tex: `y = ${fmt(s.y)}\\ \\text{m}`, color: "trace" }]} />
      {on(show, "range") && prog(frame, 0, 1) > 0 && <SvgTex x={f.X(pr.range / 2)} y={f.Y(0) + 40} tex={S ? `\\text{It lands ${fmt(pr.range, 0)} m away}` : `R = ${fmt(pr.range)}\\ \\text{m}`} size={S ? 38 : 30} />}
    </g>
  );
};

// ---------------------------------------------------------------- pendulum
export const Pendulum: React.FC<SimProps> = ({ t, w, h, params, show }) => {
  const th = useTheme(); const S = th.simple;
  const length = num(params, "length", 1), theta0 = num(params, "theta0", 40), damping = num(params, "damping", 0), g = num(params, "g", G);
  const p = pendulum({ length, theta0, damping, g, duration: 60 });
  const tt = t * num(params, "speed", 1);
  const s = p.at(tt), en = p.energy(tt);
  const tall = w < h;                                    // portrait: energy bars lie along the bottom
  const showE = on(show, "energy", true);
  const swing = Math.max(0.3, Math.sin(rad(Math.min(theta0, 90))));
  const L = Math.min(tall ? h * 0.5 : h * 0.72, 420, (w / 2 - 70) / swing), pivot = { x: tall || !showE ? w * 0.5 : w * 0.46, y: 70 };
  const bx = pivot.x + (s.x / length) * L, by = pivot.y - (s.y / length) * L;
  const r0 = rad(theta0), emax = g * length * (1 - Math.cos(r0)) || 1;
  const arcR = L * 0.38, a = Math.atan2(bx - pivot.x, by - pivot.y); // angle from the straight-down line
  const arc = `M ${pivot.x} ${pivot.y + arcR} A ${arcR} ${arcR} 0 0 ${a > 0 ? 0 : 1} ${pivot.x + arcR * Math.sin(a)} ${pivot.y + arcR * Math.cos(a)}`;
  const bh = h - 200;
  const vbar = (x: number, v: number, c: string, name: string) => (
    <g key={name}>
      <rect x={x} y={100} width={60} height={bh} rx={10} fill="none" stroke={th.c.hair} strokeWidth={3} />
      <rect x={x} y={100 + bh * (1 - clamp(v / emax, 0, 1))} width={60} height={bh * clamp(v / emax, 0, 1)} rx={10} fill={c} />
      <SvgTex x={x + 30} y={100 + bh + 34} tex={name} size={28} color={c} w={120} />
    </g>
  );
  const hbar = (y: number, v: number, c: string, name: string) => (
    <g key={name}>
      <rect x={110} y={y} width={w - 170} height={26} rx={13} fill="none" stroke={th.c.hair} strokeWidth={3} />
      <rect x={110} y={y} width={(w - 170) * clamp(v / emax, 0, 1)} height={26} rx={13} fill={c} />
      <SvgTex x={96} y={y + 13} tex={name} size={26} color={c} anchor="end" w={90} />
    </g>
  );
  return (
    <g>
      <line x1={pivot.x - 90} x2={pivot.x + 90} y1={pivot.y} y2={pivot.y} stroke={th.physics.axis} strokeWidth={8} strokeLinecap="round" />
      <line x1={pivot.x} x2={pivot.x} y1={pivot.y} y2={pivot.y + L} stroke={th.physics.grid} strokeWidth={3} strokeDasharray="12 10" />
      <path d={arc} fill="none" stroke={th.physics.accel} strokeWidth={4} />
      <line x1={pivot.x} y1={pivot.y} x2={bx} y2={by} stroke={th.physics.axis} strokeWidth={5} strokeLinecap="round" />
      <circle cx={bx} cy={by} r={32} fill={th.pastel.pink} stroke={th.c.line} strokeWidth={4} />
      <circle cx={pivot.x} cy={pivot.y} r={9} fill={th.physics.axis} />
      {on(show, "force") && <Arrow x1={bx} y1={by} x2={bx} y2={by + 110} color={th.physics.force} label={say(S, "m\\vec{g}", "\\text{Gravity}")} labelSize={S ? 36 : 30} />}
      <Readouts items={S ? [{ tex: `\\text{One swing takes}\\ ${fmt(p.period, 1)}\\ \\text{s}`, color: "accel" }] : [{ tex: `\\theta = ${fmt((s.theta * 180) / Math.PI, 0)}^\\circ`, color: "accel" }, { tex: `T = ${fmt(p.period, 2)}\\ \\text{s}` }]} />
      {showE && (tall ? <g>{hbar(h - 120, en.ke, th.physics.velocity, S ? "\\text{Motion}" : "KE")}{hbar(h - 70, en.pe, th.physics.energy, S ? "\\text{Height}" : "PE")}</g>
        : <g transform={`translate(${w - 330} 0)`}>{vbar(30, en.ke, th.physics.velocity, S ? "\\text{Motion}" : "KE")}{vbar(180, en.pe, th.physics.energy, S ? "\\text{Height}" : "PE")}</g>)}
    </g>
  );
};

// ---------------------------------------------------------------- mass on a spring
export const Spring: React.FC<SimProps> = ({ t, w, h, params, show }) => {
  const th = useTheme(); const S = th.simple;
  const m = num(params, "m", 1), k = num(params, "k", 4), c = num(params, "c", 0.25), x0 = num(params, "x0", 1);
  const sp = spring({ m, k, c, x0 });
  const tt = t * num(params, "speed", 1);
  const s = sp.at(tt);
  const tall = w < h;
  const wall = 90, eq = w * (tall || on(show, "-graph") ? 0.5 : 0.3), amp = Math.min(150, w * (tall ? 0.2 : 0.12)), y = tall ? h * 0.2 : h * 0.58;
  const bx = eq + (s.x / x0) * amp, bw = 120;
  const coils = 9, sx0 = wall + 20, sx1 = bx - bw / 2;
  const zig = Array.from({ length: coils * 2 + 1 }, (_, i) => `${sx0 + ((sx1 - sx0) * i) / (coils * 2)},${y + (i === 0 || i === coils * 2 ? 0 : i % 2 ? -26 : 26)}`).join(" ");
  const gx0 = tall ? 70 : w * 0.55, gw = tall ? w - 140 : w * 0.4, gy = tall ? h * 0.5 : h * 0.4, gh = tall ? h * 0.12 : h * 0.2, win = 8;
  const t0 = Math.max(0, tt - win);
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) { const q = t0 + ((tt - t0) * i) / 120; pts.push(`${gx0 + (((q - t0) / win) * gw)},${gy - (sp.at(q).x / x0) * gh}`); }
  const e = sp.energy(tt), emax = 0.5 * k * x0 * x0 || 1;
  const ex = tall ? 110 : w * 0.55, ew = tall ? w - 170 : w * 0.4;
  return (
    <g>
      <rect x={wall - 30} y={y - 90} width={30} height={180} fill={th.c.hair} stroke={th.physics.axis} strokeWidth={3} />
      <line x1={0} x2={w} y1={y + 62} y2={y + 62} stroke={th.physics.axis} strokeWidth={4} />
      <line x1={eq} x2={eq} y1={y - 110} y2={y + 110} stroke={th.physics.grid} strokeWidth={3} strokeDasharray="12 10" />
      <polyline points={zig} fill="none" stroke={th.physics.axis} strokeWidth={5} strokeLinejoin="round" />
      <rect x={bx - bw / 2} y={y - 50} width={bw} height={100} rx={12} fill={th.pastel.blue} stroke={th.c.line} strokeWidth={4} />
      {on(show, "force", true) && <Arrow x1={bx} y1={y - 70} x2={bx - (s.x / x0) * 130} y2={y - 70} color={th.physics.force} label={say(S, "\\vec{F}", "\\text{Pull}")} labelSize={S ? 36 : 30} />}
      {on(show, "graph", true) && (
        <g>
          <line x1={gx0} x2={gx0 + gw} y1={gy} y2={gy} stroke={th.physics.axis} strokeWidth={3} />
          <polyline points={pts.join(" ")} fill="none" stroke={th.physics.velocity} strokeWidth={6} strokeLinejoin="round" />
          <SvgTex x={gx0 + gw / 2} y={gy - gh - 34} tex={S ? "\\text{Position over time}" : "x\\ \\text{against}\\ t"} size={S ? 34 : 28} color={th.c.muted} />
        </g>
      )}
      {on(show, "energy", true) && (
        <g>
          <rect x={ex} y={h - 96} width={ew} height={24} rx={12} fill="none" stroke={th.c.hair} strokeWidth={3} />
          <rect x={ex} y={h - 96} width={ew * clamp(e.ke / emax, 0, 1)} height={24} rx={12} fill={th.physics.velocity} />
          <rect x={ex} y={h - 56} width={ew} height={24} rx={12} fill="none" stroke={th.c.hair} strokeWidth={3} />
          <rect x={ex} y={h - 56} width={ew * clamp(e.pe / emax, 0, 1)} height={24} rx={12} fill={th.physics.energy} />
          <SvgTex x={ex - 14} y={h - 84} tex={S ? "\\text{Motion}" : "KE"} size={S ? 30 : 26} anchor="end" w={190} color={th.physics.velocity} />
          <SvgTex x={ex - 14} y={h - 44} tex={S ? "\\text{Stretch}" : "PE"} size={S ? 30 : 26} anchor="end" w={190} color={th.physics.energy} />
        </g>
      )}
      <Readouts items={S ? [{ tex: `\\text{One bounce takes}\\ ${fmt(sp.period, 1)}\\ \\text{s}`, color: "accel" }] : [{ tex: `x = ${fmt(s.x, 2)}\\ \\text{m}` }, { tex: `T = ${fmt(sp.period, 2)}\\ \\text{s}`, color: "accel" }]} />
    </g>
  );
};

// ---------------------------------------------------------------- block on an incline
export const Incline: React.FC<SimProps> = ({ t, frame, w, h, dur, params, show }) => {
  const th = useTheme(); const S = th.simple;
  const angle = num(params, "angle", 30), mu = num(params, "mu", 0.2), m = num(params, "m", 1), len = 8;
  const inc = incline({ angle, mu, m, length: len });
  const a = rad(angle), ca = Math.cos(a), sa = Math.sin(a);
  const tt = t * (Number.isFinite(inc.tEnd) ? inc.tEnd / (0.75 * dur) : 1) * num(params, "speed", 1);
  const s = len - 1 - inc.s(tt);                          // distance from the bottom of the slope, block starts at the top
  const f = fit({ x0: -0.5, x1: len * ca + 0.5, y0: -0.5, y1: len * sa + 1.6 }, w, h, 60);
  const sx = (d: number) => f.X(d * ca - sa * 0.5), sy = (d: number) => f.Y(d * sa + ca * 0.5); // block centre at distance d along the slope
  const cx = sx(s + 0.5), cy = sy(s + 0.5);
  const K = 11; // pixels per newton
  const up = (n: number) => ({ dx: n * K * ca, dy: -n * K * sa });
  const fade = (i: number) => prog(frame, 10 + i * 10, 12);
  return (
    <g>
      <polygon points={`${f.X(0)},${f.Y(0)} ${f.X(len * ca)},${f.Y(0)} ${f.X(len * ca)},${f.Y(len * sa)}`} fill={th.c.hair} stroke={th.physics.axis} strokeWidth={4} strokeLinejoin="round" />
      <g transform={`translate(${cx} ${cy}) rotate(${-angle})`}>
        <rect x={-f.s * 0.5} y={-f.s * 0.5} width={f.s} height={f.s} rx={8} fill={th.pastel.lav} stroke={th.c.line} strokeWidth={4} />
      </g>
      {on(show, "forces", true) && (
        <g>
          <Arrow x1={cx} y1={cy} x2={cx} y2={cy + inc.weight * K} color={th.physics.force} p={fade(0)} label={say(S, "m\\vec{g}", "\\text{Gravity}")} labelSize={S ? 36 : 30} />
          <Arrow x1={cx} y1={cy} x2={cx - sa * inc.normal * K} y2={cy - ca * inc.normal * K} color={th.physics.velocity} p={fade(1)} label={say(S, "\\vec{N}", "\\text{Ramp pushes back}")} labelSize={S ? 36 : 30} />
          {mu > 0 && <Arrow x1={cx} y1={cy} x2={cx + up(inc.friction).dx} y2={cy + up(inc.friction).dy} color={th.physics.accel} p={fade(2)} label={say(S, "\\vec{f}", "\\text{Friction}")} labelSize={S ? 36 : 30} />}
        </g>
      )}
      <SvgTex x={f.X(1.2)} y={f.Y(0) - 26} tex={S ? `${fmt(angle, 0)}^\\circ\\ \\text{slope}` : `\\theta = ${fmt(angle, 0)}^\\circ`} size={S ? 36 : 30} color={th.physics.accel} anchor="start" />
      <Readouts items={S ? [{ tex: inc.moving ? `\\text{Faster by}\\ ${fmt(inc.a, 1)}\\ \\text{m/s every second}` : "\\text{Friction holds it still}", color: "accel" }] : [{ tex: `a = ${fmt(inc.a, 2)}\\ \\text{m/s}^2`, color: "accel" }, { tex: `\\mu = ${fmt(mu, 2)}` }]} />
    </g>
  );
};

// ---------------------------------------------------------------- collision of two blocks
export const Collision: React.FC<SimProps> = ({ t, w, h, dur, params, show }) => {
  const th = useTheme(); const S = th.simple;
  const m1 = num(params, "m1", 2), m2 = num(params, "m2", 1), v1 = num(params, "v1", 3), v2 = num(params, "v2", -1), e = num(params, "e", 1);
  const x1 = num(params, "x1", -5), x2 = num(params, "x2", 4);
  const c = collision({ m1, m2, v1, v2, x1, x2, e });
  const tt = t * (Number.isFinite(c.tc) ? c.tc / (0.4 * dur) : 1) * num(params, "speed", 1);
  const s = c.at(tt);
  const xm = w < h ? 6.6 : 8;
  const f = fit({ x0: -xm, x1: xm, y0: -0.6, y1: 3.4 }, w, h, w < h ? 24 : 50);
  const bw = f.s * (w < h ? 1.3 : 1), sz = (m: number) => bw * (0.7 + 0.35 * Math.cbrt(m));
  const px1 = f.X(clamp(s.x1, -xm + 0.2, xm - 1.4)), px2 = f.X(clamp(s.x2, -xm + 0.2, xm - 1.4));
  const y0 = f.Y(0);
  const post = tt >= c.tc;
  return (
    <g>
      <line x1={0} x2={w} y1={y0} y2={y0} stroke={th.physics.axis} strokeWidth={4} />
      <rect x={px1} y={y0 - sz(m1)} width={sz(m1)} height={sz(m1)} rx={8} fill={th.pastel.blue} stroke={th.c.line} strokeWidth={4} />
      <rect x={px2} y={y0 - sz(m2)} width={sz(m2)} height={sz(m2)} rx={8} fill={th.pastel.pink} stroke={th.c.line} strokeWidth={4} />
      <SvgTex x={px1 + sz(m1) / 2} y={y0 - sz(m1) / 2} tex={`${m1}\\ \\text{kg}`} size={28} color={th.c.onPastel} w={160} />
      <SvgTex x={px2 + sz(m2) / 2} y={y0 - sz(m2) / 2} tex={`${m2}\\ \\text{kg}`} size={28} color={th.c.onPastel} w={160} />
      <Arrow x1={px1 + sz(m1) / 2} y1={y0 - sz(m1) - 34} x2={px1 + sz(m1) / 2 + s.v1 * 26} y2={y0 - sz(m1) - 34} color={th.physics.velocity} label={say(S, "\\vec{v}_1", "\\text{Speed}")} labelSize={S ? 34 : 30} />
      <Arrow x1={px2 + sz(m2) / 2} y1={y0 - sz(m2) - 34} x2={px2 + sz(m2) / 2 + s.v2 * 26} y2={y0 - sz(m2) - 34} color={th.physics.velocity} label={say(S, "\\vec{v}_2", "\\text{Speed}")} labelSize={S ? 34 : 30} />
      <Readouts items={S ? [{ tex: `\\text{Total motion}\\ ${fmt(c.momentum(tt), 1)}`, color: "energy" }] : [{ tex: `p = ${fmt(c.momentum(tt), 1)}\\ \\text{kg m/s}`, color: "energy" }, ...(on(show, "energy", true) ? [{ tex: `KE = ${fmt(c.kinetic(tt), 1)}\\ \\text{J}`, color: "velocity" }] : [])]} />
      {post && <SvgTex x={w / 2} y={h - 40} tex={e >= 1 ? (S ? "\\text{They bounce off. Nothing is lost.}" : "\\text{elastic: KE kept}") : e <= 0 ? (S ? "\\text{They stick together}" : "\\text{stick together: KE lost}") : (S ? "\\text{They bounce, some motion is lost}" : "\\text{partly elastic}")} size={S ? 38 : 30} color={th.c.muted} />}
    </g>
  );
};

// ---------------------------------------------------------------- orbit
export const Orbit: React.FC<SimProps> = ({ t, w, h, dur, params, show }) => {
  const th = useTheme(); const S = th.simple;
  const speed = num(params, "speed", 1);
  const o = orbit({ speed, duration: 90 });
  const tt = t * (Number.isFinite(o.period) ? o.period / (0.6 * dur) : 1.4) * num(params, "rate", 1);
  const s = o.at(tt);
  let rmax = 1;
  for (let i = 0; i <= 90; i++) rmax = Math.max(rmax, o.at((i * Math.min(Number.isFinite(o.period) ? o.period : 14, 60)) / 90).r);
  const f = fit({ x0: -rmax * 1.1, x1: rmax * 1.1, y0: -rmax * 1.1, y1: rmax * 1.1 }, w, h, 40);
  const trail = o.trail(tt, 160, Number.isFinite(o.period) ? o.period * 0.9 : 10).map((q) => `${f.X(q[0])},${f.Y(q[1])}`).join(" ");
  const px = f.X(s.x), py = f.Y(s.y), vs = 120;
  const vl = Math.hypot(s.vx, s.vy);
  return (
    <g>
      <polyline points={trail} fill="none" stroke={th.physics.trace} strokeWidth={5} strokeLinecap="round" opacity={0.9} />
      <circle cx={f.X(0)} cy={f.Y(0)} r={34} fill={th.pastel.sun} stroke={th.c.line} strokeWidth={4} />
      {on(show, "gravity", !S) && <Arrow x1={px} y1={py} x2={px + ((f.X(0) - px) / Math.max(1, Math.hypot(f.X(0) - px, f.Y(0) - py))) * 90} y2={py + ((f.Y(0) - py) / Math.max(1, Math.hypot(f.X(0) - px, f.Y(0) - py))) * 90} color={th.physics.force} label={say(S, "\\vec{F}", "\\text{Pull}")} labelSize={S ? 36 : 30} />}
      {on(show, "velocity", true) && <Arrow x1={px} y1={py} x2={px + (s.vx / vl) * vs} y2={py - (s.vy / vl) * vs} color={th.physics.velocity} label={say(S, "\\vec{v}", "\\text{Speed}")} labelSize={S ? 36 : 30} />}
      <circle cx={px} cy={py} r={16} fill={th.pastel.blue} stroke={th.c.line} strokeWidth={3} />
      <Readouts items={S ? [{ tex: s.r < 0.9 ? "\\text{Close: moving fast}" : s.r > 1.15 ? "\\text{Far: moving slow}" : "\\text{Steady speed}", color: "trace" }] : [{ tex: `r = ${fmt(s.r, 2)}`, color: "trace" }, { tex: `v = ${fmt(vl, 2)}`, color: "velocity" }]} />
    </g>
  );
};
