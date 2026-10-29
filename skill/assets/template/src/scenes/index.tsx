import React from "react";
import { useCurrentFrame } from "remotion";
import { Body, Button, Card, Eyebrow, H, Num, Pop, Rich } from "../components/ui";
import { Mascot } from "../components/Mascot";
import { AnimIcon, IconTile } from "../components/AnimIcon";
import { BrandLogo, brandTitle } from "../components/Logo";
import { Sfx, pitch } from "../lib/sfx";
import { useTheme } from "../lib/useTheme";
import type { Scene } from "../lib/types";
import type { Pastel } from "../theme";

type P<L extends Scene["layout"]> = Extract<Scene, { layout: L }> & { total: number };
const cycle: Pastel[] = ["blue", "pink", "lav", "sun", "mint"];

// Spread n items across the first 70% of the scene so the last item lands before the scene ends.
function useStagger(n: number, total: number) {
  const gap = Math.max(6, Math.floor((total * 0.7) / Math.max(n, 1)));
  return (i: number) => 8 + i * gap;
}

export const Title: React.FC<P<"title">> = ({ eyebrow, title, subtitle, icon, anim = "float", accent = "mint" }) => {
  const t = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: t.px(48), flexDirection: t.portrait ? "column" : "row", textAlign: t.portrait ? "center" : "left" }}>
      <div style={{ flex: 1 }}>
        {eyebrow && <Pop><Eyebrow color={accent}>{eyebrow}</Eyebrow></Pop>}
        <Pop delay={4}><H level={1}>{title}</H></Pop>
        {subtitle && <Pop delay={10}><Body style={{ marginTop: t.px(18), fontSize: t.fs.h3 }}>{subtitle}</Body></Pop>}
      </div>
      {icon ? (
        <Pop delay={8}><IconTile name={icon} anim={anim} color={accent} size={t.px(t.portrait ? 240 : 280)} delay={10} /></Pop>
      ) : (
        <Pop delay={8} rotate={-4}><Mascot size={t.px(t.portrait ? 260 : 300)} /></Pop>
      )}
    </div>
  );
};

export const Bullets: React.FC<P<"bullets">> = ({ eyebrow, title, items, total, accent = "blue" }) => {
  const t = useTheme();
  const at = useStagger(items.length, total);
  return (
    <div>
      {eyebrow && <Pop><Eyebrow color={accent}>{eyebrow}</Eyebrow></Pop>}
      {title && <Pop delay={3}><H level={2} style={{ marginBottom: t.px(26) }}>{title}</H></Pop>}
      <div style={{ display: "grid", gap: t.px(18) }}>
        {items.map((it, i) => (
          <Pop key={i} delay={at(i)} sfx="drop" pitch={pitch(i)} rotate={i % 2 ? 0.6 : -0.6}>
            <Card style={{ display: "flex", alignItems: "center", gap: t.px(22), padding: `${t.px(18)}px ${t.px(26)}px` }}>
              {typeof it !== "string" && it.icon ? (
                <IconTile name={it.icon} anim={it.anim ?? "pop"} delay={at(i) + 4} color={cycle[i % cycle.length]} size={t.px(60)} />
              ) : (
                <Num color={cycle[i % cycle.length]}>{i + 1}</Num>
              )}
              <div style={{ fontSize: t.fs.body, fontWeight: 700, lineHeight: 1.3, color: t.c.ink }}><Rich text={typeof it === "string" ? it : it.text} delay={at(i) + 10} /></div>
            </Card>
          </Pop>
        ))}
      </div>
    </div>
  );
};

export const Stat: React.FC<P<"stat">> = ({ eyebrow, value, label, note, accent = "sun" }) => {
  const t = useTheme();
  return (
    <div style={{ textAlign: "center" }}>
      {eyebrow && <Pop><Eyebrow color={accent}>{eyebrow}</Eyebrow></Pop>}
      <Pop delay={4} rotate={-2} sfx="success">
        <Card color={accent} style={{ display: "inline-block", padding: `${t.px(24)}px ${t.px(64)}px` }}>
          <div style={{ fontSize: t.px(t.portrait ? 150 : 170), fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: t.c.onPastel }}>{value}</div>
        </Card>
      </Pop>
      <Pop delay={12}><H level={2} style={{ marginTop: t.px(30) }}>{label}</H></Pop>
      {note && <Pop delay={16}><Body style={{ marginTop: t.px(10) }}>{note}</Body></Pop>}
    </div>
  );
};

export const Quote: React.FC<P<"quote">> = ({ text, who, accent = "lav" }) => {
  const t = useTheme();
  return (
    <Pop rotate={-1}>
      <Card color={accent} style={{ padding: `${t.px(44)}px ${t.px(52)}px` }}>
        <div style={{ fontSize: t.fs.h2, fontWeight: 800, lineHeight: 1.25, color: t.c.onPastel }}>“{text}”</div>
        {who && <div style={{ marginTop: t.px(20), fontSize: t.fs.small, fontWeight: 700, color: t.c.onPastel, opacity: 0.8 }}>{who}</div>}
      </Card>
    </Pop>
  );
};

export const Code: React.FC<P<"code">> = ({ title, code, total }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const lines = code.split("\n");
  const show = Math.min(lines.length, Math.floor(((frame - 6) / (total * 0.7)) * lines.length) + 1);
  return (
    <Pop>
      {title && <H level={3} style={{ marginBottom: t.px(16) }}>{title}</H>}
      <div style={{ background: t.c.code, border: `${t.px(2)}px solid ${t.c.line}`, borderRadius: t.px(12), boxShadow: t.shadow, padding: `${t.px(26)}px ${t.px(30)}px` }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily: t.fonts.mono, fontSize: t.fs.code, lineHeight: 1.55, color: t.c.ink, whiteSpace: "pre-wrap", opacity: i < show ? 1 : 0 }}>
            {l || " "}
          </div>
        ))}
      </div>
    </Pop>
  );
};

// Steps reuse the website's lesson list: done = mint, current = green, upcoming = dashed.
export const Steps: React.FC<P<"steps">> = ({ title, steps, total }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const per = (total * 0.85) / steps.length;
  const current = Math.min(steps.length - 1, Math.max(0, Math.floor((frame - 6) / per)));
  return (
    <div>
      {steps.map((_, i) => <Sfx key={i} cue="progress-step" delay={6 + i * per} rate={pitch(i)} />)}
      {title && <Pop><H level={2} style={{ marginBottom: t.px(26) }}>{title}</H></Pop>}
      <Card style={{ padding: `${t.px(14)}px ${t.px(30)}px` }}>
        {steps.map((s, i) => {
          const done = i < current, now = i === current;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: t.px(22), padding: `${t.px(18)}px 0`, borderTop: i ? `${t.px(2)}px dashed ${t.c.hair}` : "none", opacity: i > current ? 0.55 : 1 }}>
              <span style={{
                display: "inline-grid", placeItems: "center", width: t.px(48), height: t.px(48), flex: "none",
                borderRadius: t.px(10), border: `${t.px(2)}px ${i > current ? "dashed" : "solid"} ${t.c.line}`,
                background: done ? t.pastel.mint : now ? t.pastel.accent : t.c.surface, color: i > current ? t.c.muted : t.c.onPastel,
                fontSize: t.px(24), fontWeight: 800,
              }}>{done ? "✓" : i + 1}</span>
              <div style={{ fontSize: t.fs.body, fontWeight: now ? 800 : 700, color: i > current ? t.c.muted : t.c.ink }}>{s}</div>
              {now && <span style={{ marginLeft: "auto", background: t.pastel.accent, color: t.c.onPastel, border: `${t.px(2)}px solid ${t.c.line}`, borderRadius: 999, padding: `0 ${t.px(16)}px`, fontSize: t.px(20), fontWeight: 800 }}>Now</span>}
            </div>
          );
        })}
      </Card>
    </div>
  );
};

export const Compare: React.FC<P<"compare">> = ({ left, right }) => {
  const t = useTheme();
  const col = (side: { title: string; items: string[] }, color: Pastel, delay: number, rot: number) => (
    <Pop delay={delay} rotate={rot} style={{ flex: 1 }}>
      <Card style={{ height: "100%" }}>
        <div style={{ display: "inline-block", background: t.pastel[color], color: t.c.onPastel, border: `${t.px(2)}px solid ${t.c.line}`, borderRadius: 999, padding: `${t.px(4)}px ${t.px(20)}px`, fontSize: t.fs.eyebrow, fontWeight: 800, marginBottom: t.px(18) }}>{side.title}</div>
        {side.items.map((it, i) => (
          <div key={i} style={{ fontSize: t.fs.small + t.px(2), fontWeight: 700, color: t.c.ink, padding: `${t.px(8)}px 0`, lineHeight: 1.35 }}>• {it}</div>
        ))}
      </Card>
    </Pop>
  );
  return <div style={{ display: "flex", gap: t.px(30), flexDirection: t.portrait ? "column" : "row" }}>{col(left, "pink", 4, -1)}{col(right, "mint", 12, 1)}</div>;
};

export const Outro: React.FC<P<"outro">> = ({ title, cta, url, tagline }) => {
  const t = useTheme();
  // .cta-band: the band is painted by Frame (blue). The card is white with a 6px hard shadow.
  return (
    <Pop>
      <div style={{ margin: "0 auto", maxWidth: t.px(1040), textAlign: "center", display: "grid", justifyItems: "center", gap: t.px(12), background: t.c.surface, border: `${t.bw}px solid ${t.c.line}`, borderRadius: t.radius, boxShadow: t.shadowCta, padding: `${t.px(24)}px ${t.px(32)}px` }}>
        <Pop delay={2} rotate={4}><Mascot size={t.px(96)} /></Pop>
        <Pop delay={4}><H level={1} style={{ fontSize: t.fs.h1 * 0.78 }}>{title}</H></Pop>
        {tagline && <Pop delay={8}><Body>{tagline}</Body></Pop>}
        <Pop delay={12} sfx="success"><Button color="accent">{cta}</Button></Pop>
        {url && <Pop delay={16}><div style={{ fontFamily: t.fonts.mono, fontSize: t.fs.small, background: t.c.code, border: `${t.px(2)}px solid ${t.c.line}`, borderRadius: t.px(10), padding: `${t.px(8)}px ${t.px(18)}px`, color: t.c.ink }}>{url}</div></Pop>}
      </div>
    </Pop>
  );
};

// Grid of brand logos on white tiles so every brand colour stays readable in both themes.
export const Logos: React.FC<P<"logos">> = ({ eyebrow, title, items, mono, total, accent = "lav" }) => {
  const t = useTheme();
  const at = useStagger(items.length, total);
  const cols = t.portrait ? 2 : items.length <= 3 ? items.length : items.length === 4 ? 4 : 3;
  const rows = Math.ceil(items.length / cols);
  return (
    <div style={{ textAlign: "center" }}>
      {eyebrow && <Pop><Eyebrow color={accent}>{eyebrow}</Eyebrow></Pop>}
      {title && <Pop delay={3}><H level={2} style={{ marginBottom: t.px(rows > 1 ? 18 : 28) }}>{title}</H></Pop>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: t.px(rows > 1 ? 16 : 24) }}>
        {items.map((it, i) => (
          <Pop key={i} delay={at(i)} sfx="select" pitch={pitch(i)} rotate={i % 2 ? 1 : -1}>
            <Card style={{ background: "#ffffff", color: "#1e293b", display: "grid", justifyItems: "center", gap: t.px(8), padding: `${t.px(rows > 1 ? 14 : 26)}px ${t.px(16)}px` }}>
              <BrandLogo name={it.brand} mono={mono} size={t.px(t.portrait ? 84 : rows > 1 ? 72 : 110)} />
              <div style={{ fontSize: t.fs.small, fontWeight: 800 }}>{it.label ?? brandTitle(it.brand)}</div>
            </Card>
          </Pop>
        ))}
      </div>
    </div>
  );
};

// Icon cards: animated icon tile, title and one short line.
export const Features: React.FC<P<"features">> = ({ eyebrow, title, items, total, accent = "blue" }) => {
  const t = useTheme();
  const at = useStagger(items.length, total);
  const cols = t.portrait ? 1 : Math.min(items.length, 3);
  return (
    <div>
      {eyebrow && <Pop><Eyebrow color={accent}>{eyebrow}</Eyebrow></Pop>}
      {title && <Pop delay={3}><H level={2} style={{ marginBottom: t.px(20) }}>{title}</H></Pop>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: t.px(20) }}>
        {items.map((it, i) => (
          <Pop key={i} delay={at(i)} sfx="drop" pitch={pitch(i)} rotate={i % 2 ? 0.8 : -0.8}>
            <Card style={{ display: "grid", gap: t.px(10), height: "100%", padding: `${t.px(20)}px ${t.px(24)}px` }}>
              <IconTile name={it.icon} anim={it.anim ?? "pop"} delay={at(i) + 4} color={it.color ?? cycle[i % cycle.length]} size={t.px(title ? 68 : 88)} />
              <div style={{ fontSize: t.fs.h3, fontWeight: 800, color: t.c.ink, lineHeight: 1.15 }}>{it.title}</div>
              {it.text && <div style={{ fontSize: t.fs.small, fontWeight: 600, color: t.c.muted, lineHeight: 1.35 }}>{it.text}</div>}
            </Card>
          </Pop>
        ))}
      </div>
    </div>
  );
};

// .facts on the site: pastel cards with a big display number and one line.
export const Facts: React.FC<P<"facts">> = ({ eyebrow, title, items, total, accent = "blue" }) => {
  const t = useTheme();
  const at = useStagger(items.length, total);
  const tones: Pastel[] = ["blue", "pink", "lav", "mint"];
  return (
    <div>
      {eyebrow && <Pop><Eyebrow color={accent}>{eyebrow}</Eyebrow></Pop>}
      {title && <Pop delay={3}><H level={2} style={{ marginBottom: t.px(26) }}>{title}</H></Pop>}
      <div style={{ display: "grid", gap: t.px(22) }}>
        {items.map((it, i) => (
          <Pop key={i} delay={at(i)} sfx="drop" pitch={pitch(i)} rotate={i % 2 ? 0.6 : -0.6}>
            <Card color={tones[i % tones.length]} style={{ display: "flex", alignItems: "center", gap: t.px(28), padding: `${t.px(20)}px ${t.px(30)}px` }}>
              <div style={{ fontFamily: t.fonts.display, fontSize: t.px(t.portrait ? 64 : 76), fontWeight: 700, lineHeight: 1, flex: "none", minWidth: t.px(190) }}>{it.value}</div>
              <div style={{ fontSize: t.fs.body, fontWeight: 700, lineHeight: 1.3 }}>{it.text}</div>
            </Card>
          </Pop>
        ))}
      </div>
    </div>
  );
};

// .compare on the site: blue header row, grey "old way" column, green "us" column with a tick.
export const Table: React.FC<P<"table">> = ({ eyebrow, title, head, rows, total, accent = "pink" }) => {
  const t = useTheme();
  const at = useStagger(rows.length, total);
  const frame = useCurrentFrame();
  const cols = "0.8fr 1fr 1fr";
  const cell: React.CSSProperties = { fontSize: t.fs.small + t.px(2), padding: `${t.px(14)}px ${t.px(24)}px` };
  return (
    <div>
      {eyebrow && <Pop><Eyebrow color={accent}>{eyebrow}</Eyebrow></Pop>}
      {title && <Pop delay={3}><H level={2} style={{ marginBottom: t.px(24) }}>{title}</H></Pop>}
      <Pop delay={6}>
        <div style={{ background: t.c.surface, border: `${t.bw}px solid ${t.c.line}`, borderRadius: t.radius, boxShadow: t.shadow, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: cols, background: t.pastel.blue, color: t.c.onPastel, borderBottom: `${t.bw}px solid ${t.c.line}`, fontFamily: t.fonts.display, fontWeight: 700 }}>
            {head.map((h, i) => <div key={i} style={cell}>{h}</div>)}
          </div>
          {rows.map((r, i) => {
            const show = Math.min(1, Math.max(0, (frame - at(i)) / 8));
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: cols, borderTop: i ? `${t.px(2)}px solid ${t.c.hair}` : "none", opacity: show }}>
                <Sfx cue="snap" delay={at(i)} rate={pitch(i)} />
                <div style={{ ...cell, fontWeight: 700, color: t.c.ink }}>{r[0]}</div>
                <div style={{ ...cell, color: t.c.muted, fontWeight: 600 }}>{r[1]}</div>
                <div style={{ ...cell, color: t.c.link, fontWeight: 800 }}>✓ {r[2]}</div>
              </div>
            );
          })}
        </div>
      </Pop>
    </div>
  );
};

export const registry: Record<Scene["layout"], React.FC<any>> = {
  title: Title, bullets: Bullets, logos: Logos, features: Features, facts: Facts, table: Table, stat: Stat, quote: Quote, code: Code, steps: Steps, compare: Compare, outro: Outro,
};
