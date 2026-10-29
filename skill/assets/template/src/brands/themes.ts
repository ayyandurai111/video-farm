// Brand themes only (pure data, no React), so useTheme() can import this without a circular import.
// The scene registries per brand live in brands/scenes.ts.
import { handson } from "./handson/theme";
import { channel } from "./channel/theme";
import type { BrandTheme } from "./types";

export const THEMES = { handson, channel } satisfies Record<string, BrandTheme>;
export type BrandName = keyof typeof THEMES;
export const DEFAULT_BRAND: BrandName = "handson";
export const isBrand = (x: unknown): x is BrandName => typeof x === "string" && x in THEMES;
export const themeOf = (name?: string): BrandTheme => (isBrand(name) ? THEMES[name] : THEMES[DEFAULT_BRAND]);
