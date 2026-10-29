import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Body, Card, Eyebrow, H, Num, Pop } from "../../components/ui";
import { IconTile } from "../../components/AnimIcon";
import { Sfx, pitch } from "../../lib/sfx";
import { useTheme } from "../../lib/useTheme";
import { Tex } from "./components/Tex";
import { GraphSvg } from "./components/Graph";
import { Arrow, Stage, col, useStageSize } from "./components/draw";
import { SIMS } from "./sims";
import type { ChannelScene } from "./types";
import type { Pastel } from "../handson/theme";

type P<L extends ChannelScene["layout"]> = Extract<ChannelScene, { layout: L }> & { total: number };
const cycle: Pastel[] = ["blue", "pink", "lav", "sun", "mint"];
const stagger = (n: number, total: number) => { const gap = Math.max(8, Math.floor((total * 0.7) / Math.max(n, 1))); return (i: number) => 10 + i * gap; };
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

const Col: React.FC<{ center?: boolean; children: React.ReactNode }> = ({ center, children }) => {
  const t = useTheme();
  return <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: t.px(18), justifyContent: center ? "center" : "flex-start" }}>{children}</div>;
};
const Head: React.FC<{ eyebrow?: string; title?: string; accent?: Pastel; inline?: boolean }> = ({ eyebrow, title, accent = "blue", inline }) => {
  const t = useTheme();
  const row = inline && !t.portrait;
  return (
    <div style={row ? { display: "flex", alignItems: "center", gap: t.px(20) } : undefined}>
      {eyebrow && <Pop><Eyebrow color={accent}>{eyebrow}</Eyebrow></Pop>}
      {title && <Pop delay={3}><H level={2}>{title}</H></Pop>}
    </div>
  );
};

// ---------------------------------------------------------------- equation
export const EquationScene: React.FC<P<"equation">> = ({ eyebrow, title, tex, note, size = "l", accent = "blue" }) => {
  const t = useTheme();
  const fs = (t.portrait ? 0.62 : 1) * (size === "xl" ? t.fs.h1 * 1.5 : size === "l" ? t.fs.h1 * 1.15 : t.fs.h2 * 1.1);
  return (
    <Col center>
      <Head eyebrow={eyebrow} title={title} accent={accent} />
      <Pop delay={8} sfx="drop"><Card style={{ textAlign: "center", padding: `${t.px(34)}px ${t.px(40)}px`, overflow: "hidden" }}><Tex tex={tex} size={fs} hlStart={34} /></Card></Pop>
      {note && <Pop delay={20}><Body style={{ textAlign: "center", fontSize: t.fs.h3 }}>{note}</Body></Pop>}
    </Col>
  );
};

// ---------------------------------------------------------------- derivation: one line at a time
export const DerivationScene: React.FC<P<"derivation">> = ({ title, lines, total, accent = "lav" }) => {
  const t = useTheme();
  const at = stagger(lines.length, total);
  return (
    <Col center>
      {title && <Pop><H level={2}>{title}</H></Pop>}
      {lines.map((ln, i) => {
        const o = typeof ln === "string" ? { tex: ln, note: undefined } : ln;
        const last = i === lines.length - 1;
        return (
          <Pop key={i} delay={at(i)} sfx="snap" pitch={pitch(i)}>
            <Card color={last ? accent : "surface"} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: t.px(24), padding: `${t.px(14)}px ${t.px(28)}px` }}>
              <Tex tex={o.tex} size={t.fs.h2 * (t.portrait ? 0.8 : 1)} color={last ? t.c.onPastel : undefined} />
              {o.note && <span style={{ fontSize: t.fs.small, fontWeight: 700, color: last ? t.c.onPastel : t.c.muted, textAlign: "right" }}>{o.note}</span>}
            </Card>
          </Pop>
        );
      })}
    </Col>
  );
};

// ---------------------------------------------------------------- graph
export const GraphScene: React.FC<P<"graph">> = ({ eyebrow, title, series, xLabel, yLabel, xRange, yRange, marker = true, caption, total, accent = "blue" }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { w, h } = useStageSize();
  const p = ease((frame - 14) / Math.max(20, total * 0.62));
  return (
    <Col>
      <Head eyebrow={eyebrow} title={title} accent={accent} inline />
      <Sfx cue="snap" delay={14} />
      <Stage w={w} h={h}><GraphSvg w={w} h={h} series={series} xLabel={xLabel} yLabel={yLabel} xRange={xRange} yRange={yRange} p={p} marker={marker} /></Stage>
      {caption && <Pop delay={24}><Body style={{ textAlign: "center" }}>{caption}</Body></Pop>}
      <span style={{ display: "none" }}>{t.name}</span>
    </Col>
  );
};

// ---------------------------------------------------------------- free body diagram
export const FreeBodyScene: React.FC<P<"freebody">> = ({ eyebrow, title, body = "block", forces, net = false, caption, total, accent = "pink" }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { w, h } = useStageSize();
  const at = stagger(forces.length + (net ? 1 : 0), total);
  const maxMag = Math.max(1e-9, ...forces.map((f) => Math.abs(f.mag)));
  const r0 = 56, cx = w / 2, cy = h / 2;
  const dir = (deg: number) => [Math.cos((deg * Math.PI) / 180), -Math.sin((deg * Math.PI) / 180)];
  // one scale for all arrows, small enough that the longest one still fits the stage in its own direction
  const scale = Math.min(...forces.map((f) => { const [dx, dy] = dir(f.angle); return Math.min(Math.abs(dx) > 1e-6 ? (w / 2 - r0 - 70) / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-6 ? (h / 2 - r0 - 46) / Math.abs(dy) : 1e9) / Math.max(1e-9, Math.abs(f.mag)); }), 1e9);
  const sum = forces.reduce((s, f) => { const d = dir(f.angle); return [s[0] + d[0] * f.mag, s[1] + d[1] * f.mag]; }, [0, 0]);
  const sumMag = Math.hypot(sum[0], sum[1]);
  return (
    <Col>
      <Head eyebrow={eyebrow} title={title} accent={accent} inline />
      <Stage w={w} h={h}>
        {body === "ball" ? <circle cx={cx} cy={cy} r={r0} fill={t.pastel.sun} stroke={t.c.line} strokeWidth={4} /> : <rect x={cx - r0 * 1.1} y={cy - r0 * 0.8} width={r0 * 2.2} height={r0 * 1.6} rx={14} fill={t.pastel.lav} stroke={t.c.line} strokeWidth={4} />}
        {forces.map((f, i) => {
          const [dx, dy] = dir(f.angle), p = ease((frame - at(i)) / 14);
          return <Arrow key={i} x1={cx + dx * r0} y1={cy + dy * r0} x2={cx + dx * (r0 + Math.abs(f.mag) * scale)} y2={cy + dy * (r0 + Math.abs(f.mag) * scale)} color={col(t, f.color, t.physics.force)} p={p} label={f.label} labelSize={34} />;
        })}
        {net && sumMag > 1e-6 && (
          <Arrow x1={cx} y1={cy} x2={cx + (sum[0] / sumMag) * sumMag * scale} y2={cy + (sum[1] / sumMag) * sumMag * scale} color={t.physics.accel} width={9} dashed p={ease((frame - at(forces.length)) / 16)} label={t.simple ? "\\text{All together}" : "\\vec{F}_{\\text{net}}"} labelSize={34} />
        )}
      </Stage>
      {forces.map((_, i) => <Sfx key={i} cue="drop" delay={at(i)} rate={pitch(i)} />)}
      {caption && <Pop delay={at(forces.length) + 6}><Body style={{ textAlign: "center" }}>{caption}</Body></Pop>}
    </Col>
  );
};

// ---------------------------------------------------------------- one quantity with its unit
export const QuantityScene: React.FC<P<"quantity">> = ({ eyebrow, name, symbol, value, unit, note, accent = "sun" }) => {
  const t = useTheme();
  const s = t.px(t.portrait ? 120 : 150);
  return (
    <Col center>
      <div style={{ textAlign: "center" }}>
        {eyebrow && <Pop><Eyebrow color={accent}>{eyebrow}</Eyebrow></Pop>}
        <Pop delay={4}><H level={2}>{name}</H></Pop>
        <Pop delay={10} sfx="success"><div style={{ marginTop: t.px(10), display: "inline-flex", alignItems: "baseline", gap: t.px(22) }}>
          {symbol && <Tex tex={`${symbol} =`} size={s * 0.6} color={t.c.muted} />}
          <Tex tex={value} size={s} color={col(t, accent, t.c.ink)} hlStart={9999} />
          <Tex tex={unit} size={s * 0.5} color={t.c.muted} />
        </div></Pop>
        {note && <Pop delay={18}><Body style={{ marginTop: t.px(14) }}>{note}</Body></Pop>}
      </div>
    </Col>
  );
};

// ---------------------------------------------------------------- units table
export const UnitsScene: React.FC<P<"units">> = ({ title, rows, total, accent = "mint" }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const at = stagger(rows.length, total);
  const cols = "1.4fr 0.8fr 1fr";
  const cell: React.CSSProperties = { padding: `${t.px(12)}px ${t.px(24)}px`, display: "flex", alignItems: "center" };
  return (
    <Col center>
      {title && <Pop><H level={2}>{title}</H></Pop>}
      <Pop delay={4}>
        <div style={{ background: t.c.surface, border: `${t.bw}px solid ${t.c.line}`, borderRadius: t.radius, boxShadow: t.shadow, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: cols, background: t.pastel[accent], color: t.c.onPastel, fontFamily: t.fonts.display, fontWeight: 800, fontSize: t.fs.small }}>
            {["Quantity", "Symbol", "SI unit"].map((x) => <div key={x} style={cell}>{x}</div>)}
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: cols, borderTop: `${t.px(2)}px solid ${t.c.hair}`, opacity: Math.min(1, Math.max(0, (frame - at(i)) / 8)) }}>
              <Sfx cue="snap" delay={at(i)} rate={pitch(i)} />
              <div style={{ ...cell, fontSize: t.fs.body, fontWeight: 700, color: t.c.ink }}>{r.name}</div>
              <div style={cell}><Tex tex={r.symbol} size={t.fs.h3} /></div>
              <div style={cell}><Tex tex={r.unit} size={t.fs.h3} color={t.c.link} /></div>
            </div>
          ))}
        </div>
      </Pop>
    </Col>
  );
};

// ---------------------------------------------------------------- a question, then the answer
export const QuestionScene: React.FC<P<"question">> = ({ eyebrow, question, answer, total, accent = "sun" }) => {
  const t = useTheme();
  const showAt = Math.round(total * 0.5);
  const frame = useCurrentFrame();
  const a = interpolate(frame, [showAt, showAt + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Col center>
      <div style={{ textAlign: t.portrait ? "center" : "left" }}>
        <Pop><Eyebrow color={accent}>{eyebrow ?? "Think about it"}</Eyebrow></Pop>
        <Pop delay={5}><H level={1}>{question}</H></Pop>
        {answer && (
          <div style={{ marginTop: t.px(34), opacity: a, transform: `translateY(${(1 - a) * 24}px)` }}>
            <Sfx cue="success" delay={showAt} />
            <Card color={accent} style={{ display: "inline-block" }}><div style={{ fontSize: t.fs.h3, fontWeight: 800, color: t.c.onPastel }}>{answer}</div></Card>
          </div>
        )}
      </div>
    </Col>
  );
};

// ---------------------------------------------------------------- analogy: "this is like that"
export const AnalogyScene: React.FC<P<"analogy">> = ({ title, left, right, sign = "≈", accent = "lav" }) => {
  const t = useTheme();
  const side = (s: typeof left, delay: number, color: Pastel) => (
    <Pop delay={delay} sfx="drop" style={{ flex: 1 }}>
      <Card style={{ height: "100%", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: t.px(14) }}>
        {s.icon && <IconTile name={s.icon} anim={s.anim ?? "float"} color={color} size={t.px(110)} delay={delay + 4} />}
        <H level={3}>{s.title}</H>
        {s.text && <Body style={{ fontSize: t.fs.small + t.px(2) }}>{s.text}</Body>}
      </Card>
    </Pop>
  );
  return (
    <Col center>
      {title && <Pop><H level={2}>{title}</H></Pop>}
      <div style={{ display: "flex", flexDirection: t.portrait ? "column" : "row", alignItems: "stretch", gap: t.px(26) }}>
        {side(left, 8, "blue")}
        <Pop delay={20} style={{ alignSelf: "center" }}><Num color={accent} size={t.px(78)}>{sign}</Num></Pop>
        {side(right, 28, "pink")}
      </div>
    </Col>
  );
};

// ---------------------------------------------------------------- timeline
export const TimelineScene: React.FC<P<"timeline">> = ({ title, events, total, accent = "sun" }) => {
  const t = useTheme();
  const at = stagger(events.length, total);
  return (
    <Col center>
      {title && <Pop><H level={2}>{title}</H></Pop>}
      <div style={{ display: "flex", flexDirection: t.portrait ? "column" : "row", gap: t.px(22) }}>
        {events.map((e, i) => (
          <Pop key={i} delay={at(i)} sfx="select" pitch={pitch(i)} style={{ flex: 1 }}>
            <Card style={{ height: t.portrait ? "auto" : "100%" }}>
              <div style={{ display: "inline-block", background: t.pastel[cycle[i % cycle.length]], color: t.c.onPastel, border: `${t.px(2)}px solid ${t.c.line}`, borderRadius: 999, padding: `${t.px(4)}px ${t.px(18)}px`, fontWeight: 800, fontSize: t.fs.small, marginBottom: t.px(12) }}>{e.year}</div>
              <div style={{ fontSize: t.fs.body, fontWeight: 700, color: t.c.ink, lineHeight: 1.3 }}>{e.text}</div>
            </Card>
          </Pop>
        ))}
      </div>
      <span style={{ display: "none" }}>{accent}</span>
    </Col>
  );
};

// ---------------------------------------------------------------- simulation
export const SimScene: React.FC<P<"sim">> = ({ eyebrow, title, sim, params = {}, show = [], equation, caption, total, accent = "mint" }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { w, h } = useStageSize();
  const Sim = SIMS[sim];
  if (!Sim) throw new Error(`unknown simulation '${sim}'`);
  return (
    <Col>
      <div style={{ display: "flex", flexDirection: t.portrait ? "column" : "row", alignItems: t.portrait ? "flex-start" : "center", justifyContent: "space-between", gap: t.px(t.portrait ? 6 : 24) }}>
        <Head eyebrow={eyebrow} title={title} accent={accent} inline />
        {equation && <Pop delay={10}><Tex tex={equation} size={t.fs.h2 * (t.portrait ? 0.75 : 0.95)} hlStart={40} /></Pop>}
      </div>
      <Sfx cue="open" delay={2} />
      <Stage w={w} h={h}><Sim t={frame / fps} frame={frame} fps={fps} dur={total / fps} w={w} h={h} params={params} show={show} /></Stage>
      {caption && <Pop delay={20}><Body style={{ textAlign: "center" }}>{caption}</Body></Pop>}
    </Col>
  );
};

export const channelRegistry = {
  equation: EquationScene, derivation: DerivationScene, graph: GraphScene, freebody: FreeBodyScene, quantity: QuantityScene,
  units: UnitsScene, question: QuestionScene, analogy: AnalogyScene, timeline: TimelineScene, sim: SimScene,
};
export const CHANNEL_LAYOUTS = Object.keys(channelRegistry);
