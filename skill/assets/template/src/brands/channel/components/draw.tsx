import React from "react";
import { useTheme } from "../../../lib/useTheme";
import { Tex } from "./Tex";
import { clamp } from "../lib/plot";

type T = ReturnType<typeof useTheme>;

// A colour can be a physics name ("force", "velocity"...), a pastel name ("blue") or a hex code.
export function col(t: T, key?: string, fallback?: string): string {
  if (!key) return fallback ?? t.c.ink;
  if (key in t.physics) return (t.physics as Record<string, string>)[key];
  if (key in t.pastel) return (t.pastel as Record<string, string>)[key];
  return key;
}

// The drawing board for a graph or simulation: a card with an SVG inside. Landscape and portrait get different shapes.
export function useStageSize() {
  const t = useTheme();
  return t.portrait ? { w: 720, h: 900 } : { w: 1280, h: 440 };
}
export const Stage: React.FC<{ w: number; h: number; children: React.ReactNode }> = ({ w, h, children }) => {
  const t = useTheme();
  return (
    <div style={{ flex: 1, minHeight: 0, background: t.c.surface, border: `${t.bw}px solid ${t.c.line}`, borderRadius: t.radius, boxShadow: t.shadow, overflow: "hidden" }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ display: "block", overflow: "visible" }}>{children}</svg>
    </div>
  );
};

// World (y up, any units) to screen (y down) with the same scale in both directions.
export function fit(b: { x0: number; x1: number; y0: number; y1: number }, w: number, h: number, m = 60) {
  const s = Math.min((w - 2 * m) / (b.x1 - b.x0), (h - 2 * m) / (b.y1 - b.y0));
  const ox = (w - (b.x1 - b.x0) * s) / 2 - b.x0 * s;
  const oy = (h + (b.y1 - b.y0) * s) / 2 + b.y0 * s;
  return { s, X: (x: number) => ox + x * s, Y: (y: number) => oy - y * s };
}

// A formula inside an SVG (foreignObject), centred or left/right aligned on (x, y).
export const SvgTex: React.FC<{ x: number; y: number; tex: string; size?: number; color?: string; anchor?: "start" | "middle" | "end"; w?: number }> = ({
  x, y, tex, size = 30, color, anchor = "middle", w = 360,
}) => {
  const h = size * 2;
  const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  return (
    <foreignObject x={left} y={y - h / 2} width={w} height={h} style={{ overflow: "visible", pointerEvents: "none" }}>
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: anchor === "middle" ? "center" : anchor === "end" ? "flex-end" : "flex-start" }}>
        <Tex tex={tex} size={size} color={color} plain={useTheme().simple} />
      </div>
    </foreignObject>
  );
};

// An arrow from (x1,y1) to (x2,y2). p (0..1) grows it from the tail. label sits beside the tip.
export const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color: string; width?: number; p?: number; label?: string; labelSize?: number; dashed?: boolean }> = ({
  x1, y1, x2, y2, color, width = 6, p = 1, label, labelSize = 30, dashed,
}) => {
  const dx = (x2 - x1) * p, dy = (y2 - y1) * p;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const ux = dx / len, uy = dy / len;
  const head = Math.min(len * 0.6, width * 3.4);
  const bx = x1 + dx - ux * head, by = y1 + dy - uy * head;
  const tx = x1 + dx, ty = y1 + dy;
  const nx = -uy, ny = ux;
  const lx = tx + ux * labelSize * 0.9 + nx * labelSize * 0.35, ly = ty + uy * labelSize * 0.9 + ny * labelSize * 0.35;
  return (
    <g>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? `${width * 2} ${width * 1.6}` : undefined} />
      <polygon points={`${tx},${ty} ${bx + nx * head * 0.5},${by + ny * head * 0.5} ${bx - nx * head * 0.5},${by - ny * head * 0.5}`} fill={color} />
      {label && p > 0.55 && <SvgTex x={lx} y={ly} tex={label} size={labelSize} color={color} anchor={ux < -0.3 ? "end" : ux > 0.3 ? "start" : "middle"} w={260} />}
    </g>
  );
};

// Small value pills in a corner of the stage: "Speed 14 m/s". They update with the animation.
// For everyone: say(simple, expertTex, plainTex) picks the plain-words version unless the video is for experts.
export const say = <T,>(simple: boolean, expert: T, plain: T): T => (simple ? plain : expert);
export const Readouts: React.FC<{ items: { tex: string; color?: string }[]; x?: number; y?: number; size?: number }> = ({ items, x = 40, y = 44, size }) => {
  const t = useTheme();
  const sz = size ?? (t.simple ? 38 : 30);
  return (
    <g>
      {items.map((it, i) => {
        const chars = it.tex.replace(/\\[a-zA-Z]+|[{}\\^_]/g, "").length;
        const w = Math.max(sz * 6, chars * sz * (t.simple ? 0.56 : 0.5) + sz * 1.2);
        return (
          <g key={i}>
            <rect x={x} y={y + i * sz * 1.75 - sz * 0.8} width={w} height={sz * 1.5} rx={sz * 0.5} fill={t.c.bg} stroke={col(t, it.color, t.c.line)} strokeWidth={2.5} />
            <SvgTex x={x + sz * 0.6} y={y + i * sz * 1.75} tex={it.tex} size={sz * 0.9} color={col(t, it.color, t.c.ink)} anchor="start" w={w} />
          </g>
        );
      })}
    </g>
  );
};

export const fmt = (v: number, d = 1) => (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d).replace("-", "\\text{−}");
export const prog = (frame: number, from: number, len = 12) => clamp((frame - from) / len, 0, 1);
