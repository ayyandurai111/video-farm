// What every brand has to provide. Each brand lives in its own folder under src/brands/<name>/.
// Keep the six pastel keys the same in every brand so shared components (Card, Eyebrow, IconTile) work everywhere.
export type PastelMap = { pink: string; blue: string; lav: string; mint: string; sun: string; accent: string };

export type Palette = {
  bg: string; surface: string; ink: string; muted: string; line: string; hair: string; code: string;
  accentSoft: string; link: string; shadowColor: string; shadowSoft: (string | number)[][]; onPastel: string;
};

// Colours with a fixed meaning in physics videos: a force is always the same colour, in every scene and every video.
export type PhysicsColors = {
  force: string; velocity: string; accel: string; energy: string; field: string;
  positive: string; negative: string; mass: string; axis: string; grid: string; trace: string;
};

export type BrandTheme = {
  id: string;
  site: { name: string; mark: string };
  defaultTheme: "light" | "dark";
  pastel: PastelMap;
  palettes: { light: Palette; dark: Palette };
  shape: { bw: number; radius: number; shadow: number; shadowSm: number; shadowCta: number; iconRadius: number };
  sel: string;
  fonts: { body: string; display: string; mono: string; math: string };
  type: { h1: number; h2: number; h3: number; body: number; small: number; eyebrow: number; caption: number; code: number };
  physics: { light: PhysicsColors; dark: PhysicsColors };
};
