import type { Pastel, ThemeName } from "../theme";
import type { IconAnim } from "../components/AnimIcon";
import type { BrandName } from "../brands/themes";
import type { ChannelScene } from "../brands/channel/types";

export type IconRef = { icon: string; anim?: IconAnim };

export type Word = { text: string; start: number; end: number };
export type Caption = { id: number; start: number; end: number; text: string; words?: Word[] };

export type Band = "bg" | "surface" | Pastel;
export type SceneBase = { id: string; start: number; end: number; accent?: Pastel; band?: Band };
export type Scene =
  | (SceneBase & { layout: "title"; icon?: string; anim?: IconAnim; eyebrow?: string; title: string; subtitle?: string })
  | (SceneBase & { layout: "bullets"; eyebrow?: string; title?: string; items: (string | { text: string; icon?: string; anim?: IconAnim })[] })
  | (SceneBase & { layout: "logos"; eyebrow?: string; title?: string; items: { brand: string; label?: string }[]; mono?: boolean })
  | (SceneBase & { layout: "features"; eyebrow?: string; title?: string; items: { icon: string; title: string; text?: string; anim?: IconAnim; color?: Pastel }[] })
  | (SceneBase & { layout: "facts"; eyebrow?: string; title?: string; items: { value: string; text: string }[] })
  | (SceneBase & { layout: "table"; eyebrow?: string; title?: string; head: [string, string, string]; rows: [string, string, string][] })
  | (SceneBase & { layout: "stat"; eyebrow?: string; value: string; label: string; note?: string })
  | (SceneBase & { layout: "quote"; text: string; who?: string })
  | (SceneBase & { layout: "code"; title?: string; code: string })
  | (SceneBase & { layout: "steps"; title?: string; steps: string[] })
  | (SceneBase & {
      layout: "compare";
      left: { title: string; items: string[] };
      right: { title: string; items: string[] };
    })
  | (SceneBase & { layout: "outro"; title: string; cta: string; url?: string; tagline?: string });

export type Meta = {
  title: string;
  duration: number; // seconds
  fps?: number;
  aspect?: "16:9" | "9:16" | "1:1";
  audience?: "everyone" | "expert"; // everyone (default): plain words on screen. expert: symbols, vectors, formulas
  brandTheme?: BrandName; // which brand look and which layouts: "handson" (default) or "channel"
  theme?: ThemeName; // light or dark; defaults to the brand's own default
  captions?: "bar" | "off";
  mascot?: boolean;
  brand?: { name: string; mark?: string }; // top bar, defaults to theme.ts site
  topbar?: boolean; // default true
  sfx?: { pack: string; volume?: number } | "off"; // sound effects from uisfx, default off here, build_video.py turns on "minimal"
  audio?: string; // file name inside public/, for example "audio.mp3"
};
// A scene from the shared layouts, or from the extra layouts of the channel brand.
export type AnyScene = Scene | ChannelScene;
export type ScenesFile = { meta: Meta; scenes: AnyScene[] };
