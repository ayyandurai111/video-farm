import { useContext } from "react";
import { useVideoConfig } from "remotion";
import { themeOf } from "../brands/themes";
import { MetaContext } from "./meta";

// One hook gives scenes everything: colours, a size helper and the shape tokens.
// The brand (meta.brandTheme: "handson" or "channel") decides which tokens are used.
export function useTheme() {
  const { width, height } = useVideoConfig();
  const meta = useContext(MetaContext);
  const b = themeOf(meta.brandTheme);
  const name: "light" | "dark" = meta.theme ?? b.defaultTheme;
  const portrait = height > width;
  const k = portrait ? width / 720 : width / 1280; // scale from the 1280px design canvas
  const px = (n: number) => n * k;
  const c = b.palettes[name];
  const { shape, type } = b;
  return {
    simple: meta.audience !== "expert", c, pastel: b.pastel, fonts: b.fonts, name, portrait, width, height, px, sel: b.sel, brandId: b.id,
    physics: b.physics[name],
    brand: { name: meta.brand?.name ?? b.site.name, mark: meta.brand?.mark ?? b.site.mark },
    shadowCta: `${px(shape.shadowCta)}px ${px(shape.shadowCta)}px 0 ${c.line}`,
    shadowSoft: c.shadowSoft.map(([x, y, bl, col]) => `${px(x as number)}px ${px(y as number)}px ${px(bl as number)}px ${col}`).join(", "),
    iconRadius: px(shape.iconRadius),
    bw: px(shape.bw), radius: px(shape.radius),
    shadow: `${px(shape.shadow)}px ${px(shape.shadow)}px 0 ${c.shadowColor}`,
    shadowSm: `${px(shape.shadowSm)}px ${px(shape.shadowSm)}px 0 ${c.shadowColor}`,
    fs: Object.fromEntries(Object.entries(type).map(([key, v]) => [key, px(v)])) as Record<keyof typeof type, number>,
    pad: px(64),
  };
}
