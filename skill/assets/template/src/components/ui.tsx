import React, { useContext } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../lib/useTheme";
import { usePop } from "../lib/anim";
import { BandContext } from "../lib/meta";
import { Sfx, type Cue } from "../lib/sfx";
import type { Pastel } from "../theme";

// Pop wraps anything and lands it with a spring. delay is in frames.
// sfx = cue to play when it lands (off by default so nested pops stay quiet); pitch varies the sample.
export const Pop: React.FC<{ delay?: number; rotate?: number; sfx?: Cue; pitch?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  delay = 0, rotate = 0, sfx, pitch = 1, style, children,
}) => {
  const { style: s } = usePop(delay, rotate);
  return <div style={{ ...s, ...style }}>{sfx && <Sfx cue={sfx} delay={delay} rate={pitch} />}{children}</div>;
};

// .card on the website: surface, bold outline, hard offset shadow.
export const Card: React.FC<{ color?: Pastel | "surface"; style?: React.CSSProperties; children: React.ReactNode }> = ({
  color = "surface", style, children,
}) => {
  const t = useTheme();
  const band = useContext(BandContext);
  // On the white band the site's problem and feature cards are cream, borderless, with a soft shadow.
  const soft = color === "surface" && band === "surface";
  return (
    <div
      style={{
        background: soft ? t.c.bg : color === "surface" ? t.c.surface : t.pastel[color],
        color: color === "surface" ? t.c.ink : t.c.onPastel,
        border: `${t.bw}px solid ${soft ? "transparent" : t.c.line}`,
        borderRadius: t.radius,
        boxShadow: soft ? t.shadowSoft : t.shadow,
        padding: `${t.px(28)}px ${t.px(32)}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// .eyebrow: small pill above a heading.
export const Eyebrow: React.FC<{ color?: Pastel; children: React.ReactNode }> = ({ color = "mint", children }) => {
  const t = useTheme();
  return (
    <span
      style={{
        display: "inline-block",
        background: t.pastel[color],
        color: t.c.onPastel,
        border: `${t.px(2)}px solid ${t.c.line}`,
        borderRadius: 999,
        padding: `${t.px(5)}px ${t.px(20)}px`,
        fontSize: t.fs.eyebrow,
        fontWeight: 800,
        marginBottom: t.px(18),
      }}
    >
      {children}
    </span>
  );
};

// .num: the small square number badge used in lesson lists.
export const Num: React.FC<{ color?: Pastel; children: React.ReactNode; size?: number }> = ({ color = "blue", children, size }) => {
  const t = useTheme();
  const s = size ?? t.px(48);
  return (
    <span
      style={{
        display: "inline-grid", placeItems: "center", minWidth: s, height: s, flex: "none",
        background: t.pastel[color], color: t.c.onPastel,
        border: `${t.px(2)}px solid ${t.c.line}`, borderRadius: t.px(10),
        fontSize: s * 0.5, fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
};

// .primary button, drawn flat for a call to action.
export const Button: React.FC<{ color?: Pastel; children: React.ReactNode }> = ({ color = "accent", children }) => {
  const t = useTheme();
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: t.px(10),
        background: t.pastel[color], color: t.c.onPastel,
        border: `${t.bw}px solid ${t.c.line}`, borderRadius: t.px(14),
        boxShadow: t.shadowSm, padding: `${t.px(16)}px ${t.px(34)}px`,
        fontSize: t.fs.h3, fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
};

export const H: React.FC<{ level?: 1 | 2 | 3; style?: React.CSSProperties; children: React.ReactNode }> = ({ level = 1, style, children }) => {
  const t = useTheme();
  const size = level === 1 ? t.fs.h1 : level === 2 ? t.fs.h2 : t.fs.h3;
  return (
    <div style={{ fontFamily: t.fonts.display, fontWeight: 700, fontSize: size, lineHeight: 1.15, letterSpacing: "-0.02em", color: t.c.ink, ...style }}>
      {rich(children)}
    </div>
  );
};

export const Body: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => {
  const t = useTheme();
  return <div style={{ fontFamily: t.fonts.body, fontSize: t.fs.body, lineHeight: 1.45, color: t.c.muted, fontWeight: 600, ...style }}>{rich(children)}</div>;
};

// .mark on the site: a highlighter pen sweeps behind the key words. delay in frames.
export const Mark: React.FC<{ delay?: number; children: React.ReactNode }> = ({ delay = 14, children }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = interpolate(frame - delay, [0, 0.9 * fps], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eased = 100 * (1 - Math.pow(1 - w / 100, 3));
  return (
    <span style={{
      background: `linear-gradient(${t.sel}, ${t.sel}) no-repeat 0 50% / ${eased}% 100%`,
      color: eased > 85 ? t.c.onPastel : "inherit", borderRadius: "0.2em", padding: "0 0.2em", margin: "0 -0.1em",
      WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone",
    }}><Sfx cue="focus" delay={delay} />{children}</span>
  );
};

// Text with **marked** words. "Learn AI by **building your own agent.**" highlights the bold part.
export const Rich: React.FC<{ text: string; delay?: number }> = ({ text, delay = 14 }) => (
  <>
    {text.split("**").map((part, i) => (i % 2 ? <Mark key={i} delay={delay + Math.floor(i / 2) * 12}>{part}</Mark> : <React.Fragment key={i}>{part}</React.Fragment>))}
  </>
);
const rich = (c: React.ReactNode) => (typeof c === "string" ? <Rich text={c} /> : c);
