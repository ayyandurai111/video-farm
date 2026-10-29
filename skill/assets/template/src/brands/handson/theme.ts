// Brand "handson": the Hands-on AI Courses website.
// Design tokens copied from the website (apps/web/src/styles/globals.css).
// Change a value here and every scene follows. Numbers are for a 1280px wide canvas;
// useTheme() scales them for the real video size.
import type { BrandTheme, Palette, PhysicsColors } from "../types";

export const pastel = {
  pink: "#fbb9ae",
  blue: "#a8d8ea",
  lav: "#e4e4f7",
  mint: "#86efac",
  sun: "#facc15",
  accent: "#22c55e",
} as const;
export type Pastel = keyof typeof pastel;

const light: Palette = {
  bg: "#fff7f0",
  surface: "#ffffff",
  ink: "#1e293b",
  muted: "#475569",
  line: "#1e293b",
  hair: "#eadfd3",
  code: "#ececf9",
  accentSoft: "#dcfce7",
  link: "#15803d",
  shadowColor: "#1e293b",
  shadowSoft: [[0, 2, 4, "rgba(30, 41, 59, 0.04)"], [0, 10, 28, "rgba(30, 41, 59, 0.08)"]],
  onPastel: "#1e293b",
};
const dark: Palette = {
  bg: "#151823",
  surface: "#212638",
  ink: "#f5efe6",
  muted: "#a9b2c6",
  line: "#f5efe6",
  hair: "#323a52",
  code: "#2a3047",
  accentSoft: "#14301f",
  link: "#4ade80",
  shadowColor: "rgba(0,0,0,0.55)",
  shadowSoft: [[0, 10, 28, "rgba(0, 0, 0, 0.35)"]],
  onPastel: "#1e293b",
};

const physicsLight: PhysicsColors = {
  force: "#e5484d", velocity: "#2f7fd1", accel: "#d97706", energy: "#b7791f",
  field: "#7c5cd6", positive: "#e5484d", negative: "#2f7fd1", mass: "#475569",
  axis: "#1e293b", grid: "#eadfd3", trace: "#15803d",
};
const physicsDark: PhysicsColors = {
  force: "#ff7a7f", velocity: "#6cb4f5", accel: "#fbbf24", energy: "#facc15",
  field: "#b39dff", positive: "#ff7a7f", negative: "#6cb4f5", mass: "#a9b2c6",
  axis: "#f5efe6", grid: "#323a52", trace: "#4ade80",
};

export const handson: BrandTheme = {
  id: "handson",
  site: { name: "Hands-on AI Courses", mark: "AI" },
  defaultTheme: "light",
  pastel,
  palettes: { light, dark },
  shape: { bw: 2.5, radius: 18, shadow: 5, shadowSm: 3, shadowCta: 6, iconRadius: 12 },
  // The highlighter-pen colour behind **marked** words (site: --sel). Same in both themes.
  sel: "#86efac",
  // Nunito carries Latin text, Noto Sans Tamil is the fallback for Tamil letters.
  fonts: {
    body: '"Nunito", "Noto Sans Tamil", system-ui, sans-serif',
    display: '"Nunito", "Noto Sans Tamil", system-ui, sans-serif', // the site asks for Fredoka but never loads it, so headings render in Nunito 700
    mono: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
    math: '"STIX Two Math", "Latin Modern Math", "Cambria Math", "Times New Roman", "Liberation Serif", "DejaVu Serif", serif',
  },
  // Type scale (px on a 1280 canvas). The website uses 16px body and 56px h1; video needs bigger.
  type: { h1: 76, h2: 48, h3: 34, body: 30, small: 24, eyebrow: 22, caption: 32, code: 26 },
  physics: { light: physicsLight, dark: physicsDark },
};
