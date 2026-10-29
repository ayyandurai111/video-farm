import React from "react";
import { useTheme } from "../../../lib/useTheme";
import { prog, Readouts, SvgTex, fmt, say } from "../components/draw";
import { circuit, field } from "../lib/physics";
import { num, on, str, type SimProps } from "./common";

type Pt = [number, number];
// A point a distance s along a closed polyline (s wraps around).
function along(path: Pt[], s: number): Pt {
  const segs = path.map((p, i) => { const q = path[(i + 1) % path.length]; return { p, q, len: Math.hypot(q[0] - p[0], q[1] - p[1]) }; });
  const total = segs.reduce((a, b) => a + b.len, 0);
  let d = ((s % total) + total) % total;
  for (const sg of segs) { if (d <= sg.len) { const u = sg.len ? d / sg.len : 0; return [sg.p[0] + (sg.q[0] - sg.p[0]) * u, sg.p[1] + (sg.q[1] - sg.p[1]) * u]; } d -= sg.len; }
  return path[0];
}

// ---------------------------------------------------------------- DC circuit, two resistors, electrons drift
export const Circuit: React.FC<SimProps> = ({ t, w, h, params }) => {
  const th = useTheme(); const S = th.simple;
  const V = num(params, "V", 12), R1 = num(params, "R1", 4), R2 = num(params, "R2", 2), mode = str(params, "mode", "series") as "series" | "parallel";
  const c = circuit({ V, R1, R2, mode });
  const side = w < h;                                    // portrait: readouts go under the circuit
  const L = 130, Rt = side ? w - 70 : w - (S ? 600 : 470), T = 120, B = side ? h * 0.55 : h - 100, mid = (T + B) / 2;
  const box = (cx: number, cy: number, ww: number, hh: number, fill: string) => <rect x={cx - ww / 2} y={cy - hh / 2} width={ww} height={hh} rx={10} fill={fill} stroke={th.c.line} strokeWidth={4} />;
  const wire = (pts: Pt[]) => <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={th.physics.axis} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />;
  const dots = (path: Pt[], I: number, n: number) => Array.from({ length: n }, (_, i) => {
    const q = along(path, (i * 2000) / n + t * I * 45); // drift speed follows the current
    return <circle key={i} cx={q[0]} cy={q[1]} r={7} fill={th.physics.negative} />;
  });
  const battery = (
    <g>
      <rect x={L - 40} y={mid - 34} width={80} height={68} fill={th.c.surface} />
      <line x1={L - 34} x2={L + 34} y1={mid - 22} y2={mid - 22} stroke={th.physics.axis} strokeWidth={8} strokeLinecap="round" />
      <line x1={L - 18} x2={L + 18} y1={mid + 20} y2={mid + 20} stroke={th.physics.axis} strokeWidth={8} strokeLinecap="round" />
      <SvgTex x={L + 52} y={mid} tex={`${fmt(V, 0)}\\ \\text{V}`} size={30} color={th.physics.energy} anchor="start" w={160} />
    </g>
  );
  let body: React.ReactNode, electrons: React.ReactNode;
  if (mode === "series") {
    const loop: Pt[] = [[L, T], [Rt, T], [Rt, B], [L, B]];
    const x1 = L + (Rt - L) * 0.32, x2 = L + (Rt - L) * 0.7;
    body = (<>
      {wire([[L, mid - 22], [L, T], [Rt, T], [Rt, B], [L, B], [L, mid + 20]])}
      {box(x1, T, 130, 54, th.pastel.pink)}{box(x2, T, 130, 54, th.pastel.sun)}
      {S ? (<>
        <SvgTex x={x1} y={T} tex={`${R1}\\ \\Omega`} size={30} color={th.c.onPastel} w={120} />
        <SvgTex x={x2} y={T} tex={`${R2}\\ \\Omega`} size={30} color={th.c.onPastel} w={120} />
        <SvgTex x={x1} y={T - 52} tex={"\\text{Resistor 1}"} size={28} w={220} />
        <SvgTex x={x2} y={T - 52} tex={"\\text{Resistor 2}"} size={28} w={220} />
      </>) : (<>
        <SvgTex x={x1} y={T - 52} tex={`R_1 = ${R1}\\ \\Omega`} size={28} />
        <SvgTex x={x2} y={T - 52} tex={`R_2 = ${R2}\\ \\Omega`} size={28} />
      </>)}
    </>);
    electrons = dots(loop, c.I, 26);
  } else {
    const x1 = L + (Rt - L) * 0.45, x2 = Rt;
    const loop1: Pt[] = [[L, T], [x1, T], [x1, B], [L, B]];
    const loop2: Pt[] = [[L, T], [x2, T], [x2, B], [L, B]];
    body = (<>
      {wire([[L, mid - 22], [L, T], [x2, T], [x2, B], [L, B], [L, mid + 20]])}
      {wire([[x1, T], [x1, B]])}
      {box(x1, mid, S ? 84 : 54, 120, th.pastel.pink)}{box(x2, mid, S ? 84 : 54, 120, th.pastel.sun)}
      {S ? (<>
        <SvgTex x={x1} y={mid} tex={`${R1}\\ \\Omega`} size={30} color={th.c.onPastel} w={120} />
        <SvgTex x={x2} y={mid} tex={`${R2}\\ \\Omega`} size={30} color={th.c.onPastel} w={120} />
        <SvgTex x={x1} y={T - 44} tex={"\\text{Resistor 1}"} size={28} w={220} />
        <SvgTex x={x2} y={T - 44} tex={"\\text{Resistor 2}"} size={28} w={220} />
      </>) : (<>
        <SvgTex x={x1 - 44} y={mid} tex={`R_1 = ${R1}\\ \\Omega`} size={28} anchor="end" w={220} />
        <SvgTex x={x2 - 44} y={mid} tex={`R_2 = ${R2}\\ \\Omega`} size={28} anchor="end" w={220} />
      </>)}
    </>);
    electrons = (<>{dots(loop1, c.I1, 14)}{dots(loop2, c.I2, 20)}</>);
  }
  return (
    <g>
      {body}
      {battery}
      {electrons}
      <Readouts x={side ? 40 : w - (S ? 470 : 430)} y={side ? h * 0.7 : T + 10} items={S ? [{ tex: `\\text{Flow}\\ ${fmt(c.I, 1)}\\ \\text{A}`, color: "velocity" }, { tex: `\\text{Resistance}\\ ${fmt(c.R, 1)}\\ \\Omega`, color: "accel" }] : [{ tex: `I = ${fmt(c.I, 2)}\\ \\text{A}`, color: "velocity" }, { tex: `R = ${fmt(c.R, 2)}\\ \\Omega`, color: "accel" }]} />
    </g>
  );
};

// ---------------------------------------------------------------- electric field of two charges (arrow grid)
export const Field: React.FC<SimProps> = ({ frame, w, h, params, show }) => {
  const th = useTheme(); const S = th.simple;
  const q1 = num(params, "q1", 1), q2 = num(params, "q2", -1), d = num(params, "d", 2.4);
  const charges = [{ x: -d, y: 0, q: q1 }, { x: d, y: 0, q: q2 }];
  const cols = 21, rows = 8, sx = (w - 160) / (cols - 1), sy = (h - 140) / (rows - 1);
  const wx = (px: number) => ((px - w / 2) / (w - 160)) * (2 * d * 2.4), wy = (py: number) => -((py - h / 2) / (h - 140)) * (2 * d * 2.4 * ((h - 140) / (w - 160)));
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const px = 80 + i * sx, py = 70 + j * sy;
    const e = field(charges, wx(px), wy(py));
    if (e.mag < 1e-6) continue;
    const len = Math.min(sx * 0.9, 16 + 30 * Math.log10(1 + e.mag * 6));
    const ux = e.ex / e.mag, uy = -e.ey / e.mag, a = prog(frame, 4 + i * 1.5, 14);
    const x2 = px + ux * len * a, y2 = py + uy * len * a, hx = -uy, hy = ux;
    const c = th.physics.field;
    cells.push(<g key={`${i}-${j}`} opacity={0.35 + 0.65 * Math.min(1, e.mag * 0.8)}>
      <line x1={px} y1={py} x2={x2 - ux * 8} y2={y2 - uy * 8} stroke={c} strokeWidth={4} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${x2 - ux * 14 + hx * 6},${y2 - uy * 14 + hy * 6} ${x2 - ux * 14 - hx * 6},${y2 - uy * 14 - hy * 6}`} fill={c} /></g>);
  }
  return (
    <g>
      {cells}
      {charges.map((c, i) => {
        const px = w / 2 + (c.x / (2 * d * 2.4)) * (w - 160), py = h / 2;
        return (<g key={i}><circle cx={px} cy={py} r={34} fill={c.q > 0 ? th.physics.positive : th.physics.negative} stroke={th.c.line} strokeWidth={4} />
          <SvgTex x={px} y={py} tex={c.q > 0 ? "+" : "−"} size={44} color="#fff" w={80} />
          {S && <SvgTex x={px} y={py + 70} tex={c.q > 0 ? "\\text{Positive}" : "\\text{Negative}"} size={34} color={c.q > 0 ? th.physics.positive : th.physics.negative} /> }</g>);
      })}
      {on(show, "labels", !S) && <Readouts items={[{ tex: `q_1 = ${q1 > 0 ? "+" : "\\text{−}"}${Math.abs(q1)}`, color: q1 > 0 ? "positive" : "negative" }, { tex: `q_2 = ${q2 > 0 ? "+" : "\\text{−}"}${Math.abs(q2)}`, color: q2 > 0 ? "positive" : "negative" }]} />}
    </g>
  );
};
