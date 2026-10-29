import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../../../lib/useTheme";
import { parseTex, type Node } from "../lib/tex";
import { Sfx } from "../../../lib/sfx";

const REL = new Set("=≈∝≠≤≥→←≪≫".split(""));
const BIN = new Set("+−×·±∓÷".split(""));
const GREEK_LOWER = /[α-ωħℓ∂]/;

type Ctx = { hlStart: number; hlStep: number; color: string; hlColor: string; plain?: boolean };

const Ch: React.FC<{ s: string; plain?: boolean }> = ({ s, plain }) => {
  const th = useTheme();
  if (plain && /[0-9.%°Ω]/.test(s)) return <span style={{ fontFamily: th.fonts.body, fontWeight: 700, fontStyle: "normal", fontSize: "0.92em" }}>{s}</span>;
  const italic = /[a-zA-Z]/.test(s) || GREEK_LOWER.test(s);
  const gap = REL.has(s) ? "0.28em" : BIN.has(s) ? "0.2em" : 0;
  return <span style={{ fontStyle: italic ? "italic" : "normal", margin: gap ? `0 ${gap}` : undefined }}>{s}</span>;
};

const Hl: React.FC<{ node: Extract<Node, { k: "hl" }>; ctx: Ctx }> = ({ node, ctx }) => {
  const frame = useCurrentFrame();
  if (node.id < 0) return <Run list={node.c} ctx={ctx} />;
  const at = ctx.hlStart + node.id * ctx.hlStep;
  const a = interpolate(frame, [at, at + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <span style={{ background: ctx.hlColor, backgroundSize: `${a * 100}% 100%`, backgroundRepeat: "no-repeat", borderRadius: "0.12em", padding: "0 0.08em", margin: "0 -0.04em", color: a > 0.6 ? "#0b1020" : ctx.color }}>
      <Sfx cue="focus" delay={at} />
      <Run list={node.c} ctx={ctx} />
    </span>
  );
};

const One: React.FC<{ node: Node; ctx: Ctx }> = ({ node: n, ctx }) => {
  const th = useTheme();
  switch (n.k) {
    case "ch": return <Ch s={n.s} plain={ctx.plain} />;
    case "fn": return <span style={{ fontStyle: "normal", marginLeft: "0.1em" }}>{n.s}</span>;
    case "text": return <span style={{ fontStyle: "normal", fontFamily: th.fonts.body, fontWeight: th.simple ? 700 : 600, fontSize: "0.92em" }}>{n.s}</span>;
    case "space": return <span style={{ display: "inline-block", width: `${n.w}em` }} />;
    case "hl": return <Hl node={n} ctx={ctx} />;
    case "frac":
      return (
        <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "middle", margin: "0 0.12em", fontSize: "0.92em" }}>
          <span style={{ padding: "0 0.12em 0.06em", borderBottom: "0.055em solid currentColor" }}><Run list={n.n} ctx={ctx} /></span>
          <span style={{ padding: "0.06em 0.12em 0" }}><Run list={n.d} ctx={ctx} /></span>
        </span>
      );
    case "sqrt":
      return (
        <span style={{ display: "inline-flex", alignItems: "stretch" }}>
          <span style={{ fontSize: "1.15em", lineHeight: 1, transform: "translateY(0.04em)" }}>√</span>
          <span style={{ borderTop: "0.055em solid currentColor", padding: "0.04em 0.08em 0" }}><Run list={n.c} ctx={ctx} /></span>
        </span>
      );
    case "acc":
      return (
        <span style={{ position: "relative", display: "inline-block", borderTop: n.kind === "bar" ? "0.05em solid currentColor" : undefined }}>
          {n.kind !== "bar" && <span style={{ position: "absolute", left: 0, right: 0, top: n.kind === "vec" ? "-0.72em" : "-0.4em", textAlign: "center", fontSize: "0.9em", lineHeight: 1, fontStyle: "normal" }}>{n.kind === "vec" ? "→" : "^"}</span>}
          <Run list={n.c} ctx={ctx} />
        </span>
      );
    case "scripts": {
      const base = n.base ? <One node={n.base} ctx={ctx} /> : null;
      if (n.sup && n.sub) {
        return (
          <>
            {base}
            <span style={{ display: "inline-flex", flexDirection: "column", verticalAlign: "0.5em", fontSize: "0.7em", lineHeight: 1.05, marginLeft: "0.05em" }}>
              <span><Run list={n.sup} ctx={ctx} /></span>
              <span style={{ marginTop: "0.15em" }}><Run list={n.sub} ctx={ctx} /></span>
            </span>
          </>
        );
      }
      return (
        <>
          {base}
          <span style={{ fontSize: "0.7em", lineHeight: 0, marginLeft: "0.05em", verticalAlign: n.sup ? "0.6em" : "-0.4em" }}>
            <Run list={(n.sup ?? n.sub)!} ctx={ctx} />
          </span>
        </>
      );
    }
  }
};

const Run: React.FC<{ list: Node[]; ctx: Ctx }> = ({ list, ctx }) => (
  <>{list.map((n, i) => <One key={i} node={n} ctx={ctx} />)}</>
);

// A formula in the maths font. hlStart/hlStep (frames) control when each \hl{...} part lights up.
export const Tex: React.FC<{ tex: string; size?: number; color?: string; hlStart?: number; hlStep?: number; plain?: boolean; style?: React.CSSProperties }> = ({
  tex, size, color, hlStart = 20, hlStep = 18, plain, style,
}) => {
  const t = useTheme();
  const nodes = React.useMemo(() => parseTex(tex), [tex]);
  const ctx: Ctx = { hlStart, hlStep, color: color ?? t.c.ink, hlColor: t.sel, plain };
  return (
    <span style={{ fontFamily: t.fonts.math, fontSize: size ?? t.fs.h2, color: color ?? t.c.ink, lineHeight: 1.5, whiteSpace: "nowrap", ...style }} aria-label={tex}>
      <Run list={nodes} ctx={ctx} />
    </span>
  );
};
