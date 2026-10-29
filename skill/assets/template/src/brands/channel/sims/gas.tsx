import React from "react";
import { useTheme } from "../../../lib/useTheme";
import { Readouts, fmt } from "../components/draw";
import { gas } from "../lib/physics";
import { lerp } from "../lib/plot";
import { num, type SimProps } from "./common";

// ---------------------------------------------------------------- ideal gas: temperature changes how fast the particles move
export const Gas: React.FC<SimProps> = ({ t, w, h, dur, params }) => {
  const th = useTheme(); const S = th.simple;
  const n = Math.round(num(params, "n", 60)), T1 = num(params, "T", 1), T2 = num(params, "T2", T1), seed = num(params, "seed", 7), speed = num(params, "speed", 1.6);
  const g = gas(n, 1, seed);
  const D = 0.9 * dur, u = Math.min(t, D) / D;
  const Tnow = lerp(T1, T2, u);
  // time warp so the particles speed up smoothly (no jumps) when the temperature changes: tau = integral of sqrt(T) dt
  const tau = Math.abs(T2 - T1) < 1e-9 ? Math.sqrt(T1) * t : t <= D ? ((2 * D) / (3 * (T2 - T1))) * (Math.pow(Tnow, 1.5) - Math.pow(T1, 1.5)) : ((2 * D) / (3 * (T2 - T1))) * (Math.pow(T2, 1.5) - Math.pow(T1, 1.5)) + Math.sqrt(T2) * (t - D);
  const ps = g.at(tau * speed);
  const tall = w < h;
  const bw = tall ? w - 140 : Math.min(h - 120, w * 0.46), bx = tall ? 70 : (w - bw) / 2 - 120, by = tall ? 90 : (h - bw) / 2;
  const hot = Math.min(1, Math.max(0, (Tnow - 0.5) / 3));
  return (
    <g>
      <rect x={bx} y={by} width={bw} height={bw} rx={14} fill="none" stroke={th.physics.axis} strokeWidth={6} />
      {ps.map((p, i) => <circle key={i} cx={bx + 14 + p.x * (bw - 28)} cy={by + 14 + p.y * (bw - 28)} r={Math.max(7, bw * 0.017)} fill={hot > 0.5 ? th.physics.force : th.physics.velocity} opacity={0.55 + 0.45 * hot} />)}
      <Readouts x={tall ? 70 : bx + bw + 60} y={tall ? by + bw + 70 : by + 40} items={S ? [{ tex: Tnow < 1.5 ? "\\text{Cool: slow}" : Tnow < 2.7 ? "\\text{Warm: faster}" : "\\text{Hot: very fast}", color: "accel" }] : [{ tex: `T = ${fmt(Tnow, 1)}\\ \\text{(units)}`, color: "accel" }, { tex: `N = ${n}` }]} />
    </g>
  );
};
