import React from "react";
import { icons } from "lucide-react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../lib/useTheme";

// Animated icons: any Lucide icon (1500+, https://lucide.dev/icons) plus a motion preset.
// name accepts "rocket", "Rocket", "git-branch" or "GitBranch".
export type IconAnim = "pop" | "bounce" | "spin" | "pulse" | "float" | "wiggle" | "draw" | "none";

function pascal(n: string) {
  return n.replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase());
}

export const AnimIcon: React.FC<{ name: string; anim?: IconAnim; size?: number; delay?: number; color?: string; stroke?: number }> = ({
  name, anim = "pop", size, delay = 0, color, stroke = 2.4,
}) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Cmp = (icons as Record<string, React.FC<any>>)[pascal(name)];
  if (!Cmp) throw new Error(`Unknown icon "${name}". Search names at lucide.dev/icons.`);
  const s = size ?? t.px(72);
  const f = Math.max(0, frame - delay);
  const enter = spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 160 } });
  const sec = f / fps;

  let transform = "";
  let extra: React.CSSProperties = {};
  switch (anim) {
    case "pop": transform = `scale(${enter}) rotate(${(1 - enter) * -25}deg)`; break;
    case "bounce": transform = `translateY(${-Math.abs(Math.sin(sec * 4.2)) * s * 0.22 * enter}px) scale(${enter})`; break;
    case "spin": transform = `rotate(${f * 4}deg) scale(${enter})`; break;
    case "pulse": transform = `scale(${enter * (1 + 0.1 * Math.sin(sec * 6))})`; break;
    case "float": transform = `translateY(${Math.sin(sec * 2.6) * s * 0.08}px) scale(${enter})`; break;
    case "wiggle": transform = `rotate(${Math.sin(sec * 9) * 9 * Math.max(0, 1 - sec / 2.2)}deg) scale(${enter})`; break;
    case "draw": {
      // Strokes draw themselves in over ~0.7s. pathLength=1 on every child lets us use one dash value.
      const d = interpolate(f, [0, 0.7 * fps], [1, 0], { extrapolateRight: "clamp" });
      extra = { strokeDasharray: 1, strokeDashoffset: d };
      break;
    }
    default: break;
  }
  return (
    <span style={{ display: "inline-flex", transform, transformOrigin: "50% 60%", opacity: anim === "draw" ? 1 : Math.min(1, enter * 1.5) }}>
      <Cmp size={s} strokeWidth={stroke} color={color ?? t.c.onPastel} {...(anim === "draw" ? { pathLength: 1 } : {})} style={extra} />
    </span>
  );
};

// Icon inside a rounded pastel tile with the site's bold outline and hard shadow.
export const IconTile: React.FC<{ name: string; anim?: IconAnim; delay?: number; color?: keyof ReturnType<typeof useTheme>["pastel"]; size?: number }> = ({
  name, anim = "pop", delay = 0, color = "mint", size,
}) => {
  const t = useTheme();
  const box = size ?? t.px(96);
  return (
    <span style={{
      display: "inline-grid", placeItems: "center", width: box, height: box, flex: "none",
      background: t.pastel[color], border: `${t.bw}px solid ${t.c.line}`, borderRadius: t.px(20), boxShadow: t.shadowSm,
    }}>
      <AnimIcon name={name} anim={anim} delay={delay} size={box * 0.56} />
    </span>
  );
};
