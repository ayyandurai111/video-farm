import React from "react";
import * as si from "simple-icons";
import { useTheme } from "../lib/useTheme";

// Brand logos come from the simple-icons package (offline, SVG, 3000+ brands).
// name = slug from https://simpleicons.org, for example "github", "python", "react", "openai".
type SiIcon = { title: string; slug: string; hex: string; path: string };
const all = (Object.values(si) as unknown[]).filter((v): v is SiIcon => !!v && typeof v === "object" && "slug" in (v as object));
const bySlug = new Map(all.map((i) => [i.slug, i]));

export function brand(name: string): SiIcon {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hit = bySlug.get(name.toLowerCase()) ?? all.find((i) => i.slug.replace(/[^a-z0-9]/g, "") === key);
  if (!hit) throw new Error(`Unknown brand logo "${name}". Look up the slug on simpleicons.org.`);
  return hit;
}

// Very light or very dark brand colours vanish on some backgrounds, so fall back to the theme ink.
function lum(hex: string) {
  const n = parseInt(hex, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const BrandLogo: React.FC<{ name: string; size?: number; mono?: boolean; color?: string }> = ({ name, size, mono, color }) => {
  const t = useTheme();
  const i = brand(name);
  const s = size ?? t.px(96);
  const fill = color ?? (mono ? "#1e293b" : lum(i.hex) > 0.85 ? "#1e293b" : `#${i.hex}`);
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" role="img" aria-label={i.title}>
      <path d={i.path} fill={fill} />
    </svg>
  );
};

export const brandTitle = (name: string) => brand(name).title;
