// Brand "channel": the physics explainer channel.
// EDIT THIS FILE to match the channel: name and mark in `site`, colours in `palettes` and `pastel`, fonts in `fonts`.
// Numbers are for a 1280px wide canvas; useTheme() scales them for the real video size.
// To use another font, add its .woff2 to public/fonts/, list it in lib/fonts.ts, then put its family name first below.
import type { BrandTheme, Palette, PhysicsColors } from "../types";

const pastel = {
  pink: "#ff8fab",
  blue: "#7cc4ff",
  lav: "#c4b5fd",
  mint: "#5eead4",
  sun: "#fde047",
  accent: "#38bdf8",
} as const;

const dark: Palette = {
  bg: "#0b1020",
  surface: "#141b33",
  ink: "#eef2ff",
  muted: "#9aa7c7",
  line: "#3a4676",
  hair: "#222c4d",
  code: "#1a2342",
  accentSoft: "#10304a",
  link: "#7cc4ff",
  shadowColor: "rgba(0,0,0,0.5)",
  shadowSoft: [[0, 12, 32, "rgba(0, 0, 0, 0.45)"]],
  onPastel: "#0b1020",
};
const light: Palette = {
  bg: "#f4f7ff",
  surface: "#ffffff",
  ink: "#0f172a",
  muted: "#475569",
  line: "#0f172a",
  hair: "#dbe3f5",
  code: "#e8edfb",
  accentSoft: "#dbeafe",
  link: "#1d4ed8",
  shadowColor: "#0f172a",
  shadowSoft: [[0, 2, 4, "rgba(15, 23, 42, 0.05)"], [0, 10, 28, "rgba(15, 23, 42, 0.10)"]],
  onPastel: "#0f172a",
};

// One colour per physical quantity, kept the same in every video of the channel.
const physicsDark: PhysicsColors = {
  force: "#ff6b73", velocity: "#5eb8ff", accel: "#ffb454", energy: "#fde047",
  field: "#b39dff", positive: "#ff6b73", negative: "#5eb8ff", mass: "#9aa7c7",
  axis: "#cfd8f6", grid: "#222c4d", trace: "#5eead4",
};
const physicsLight: PhysicsColors = {
  force: "#d92d3a", velocity: "#1f6fd1", accel: "#c76a00", energy: "#a16207",
  field: "#6d4fd6", positive: "#d92d3a", negative: "#1f6fd1", mass: "#475569",
  axis: "#0f172a", grid: "#dbe3f5", trace: "#0f766e",
};

export const channel: BrandTheme = {
  id: "channel",
  site: { name: "Your Channel Name", mark: "Φ" },
  defaultTheme: "dark",
  pastel,
  palettes: { light, dark },
  // Thinner outlines and no hard shadow: a calmer look than the website, so graphs and equations stay the hero.
  shape: { bw: 2, radius: 16, shadow: 0, shadowSm: 0, shadowCta: 0, iconRadius: 12 },
  sel: "#5eead4",
  fonts: {
    body: '"Nunito", "Noto Sans Tamil", system-ui, sans-serif',
    display: '"Nunito", "Noto Sans Tamil", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
    math: '"STIX Two Math", "Latin Modern Math", "Cambria Math", "Times New Roman", "Liberation Serif", "DejaVu Serif", serif',
  },
  type: { h1: 72, h2: 46, h3: 34, body: 30, small: 24, eyebrow: 22, caption: 32, code: 26 },
  physics: { light: physicsLight, dark: physicsDark },
};
