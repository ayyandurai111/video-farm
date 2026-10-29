import React from "react";
import { useTheme } from "../lib/useTheme";

// The green helmet robot from the course thumbnail, drawn as SVG so it stays sharp at any size.
export const Mascot: React.FC<{ size?: number }> = ({ size = 220 }) => {
  const t = useTheme();
  const L = t.c.line;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ filter: "none" }}>
      <ellipse cx="100" cy="188" rx="58" ry="7" fill={t.c.shadowColor} opacity="0.35" />
      <rect x="22" y="78" width="22" height="50" rx="11" fill={t.pastel.accent} stroke={L} strokeWidth="5" />
      <rect x="156" y="78" width="22" height="50" rx="11" fill={t.pastel.accent} stroke={L} strokeWidth="5" />
      <path d="M34 100 C34 40 70 18 100 18 C130 18 166 40 166 100 L166 130 C166 160 140 176 100 176 C60 176 34 160 34 130Z" fill={t.pastel.accent} stroke={L} strokeWidth="5" strokeLinejoin="round" />
      <rect x="84" y="6" width="32" height="34" rx="8" fill={t.pastel.mint} stroke={L} strokeWidth="5" />
      <rect x="46" y="64" width="108" height="86" rx="30" fill="#dcfce7" stroke={L} strokeWidth="5" />
      <circle cx="78" cy="102" r="9" fill="#1e293b" />
      <circle cx="122" cy="102" r="9" fill="#1e293b" />
      <circle cx="81" cy="98" r="3" fill="#fff" />
      <circle cx="125" cy="98" r="3" fill="#fff" />
      <path d="M88 124 Q100 136 112 124" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
};
