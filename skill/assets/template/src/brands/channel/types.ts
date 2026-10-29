import type { Pastel } from "../handson/theme";
import type { IconAnim } from "../../components/AnimIcon";
import type { Series } from "./components/Graph";
import type { SimKind } from "./sims";

type Base = { id: string; start: number; end: number; accent?: Pastel; band?: "bg" | "surface" | Pastel };
export type Force = { label: string; angle: number; mag: number; color?: string };

// Layouts that only the "channel" brand has (physics). The shared layouts (title, bullets, steps...) work in both brands.
export type ChannelScene =
  | (Base & { layout: "equation"; eyebrow?: string; title?: string; tex: string; note?: string; size?: "m" | "l" | "xl" })
  | (Base & { layout: "derivation"; title?: string; lines: (string | { tex: string; note?: string })[] })
  | (Base & { layout: "graph"; eyebrow?: string; title?: string; xLabel?: string; yLabel?: string; xRange?: [number, number]; yRange?: [number, number]; series: Series[]; marker?: boolean; caption?: string })
  | (Base & { layout: "freebody"; eyebrow?: string; title?: string; body?: "block" | "ball"; forces: Force[]; net?: boolean; caption?: string })
  | (Base & { layout: "quantity"; eyebrow?: string; name: string; symbol?: string; value: string; unit: string; note?: string })
  | (Base & { layout: "units"; title?: string; rows: { name: string; symbol: string; unit: string }[] })
  | (Base & { layout: "question"; eyebrow?: string; question: string; answer?: string })
  | (Base & { layout: "analogy"; title?: string; sign?: string; left: { title: string; text?: string; icon?: string; anim?: IconAnim }; right: { title: string; text?: string; icon?: string; anim?: IconAnim } })
  | (Base & { layout: "timeline"; title?: string; events: { year: string; text: string }[] })
  | (Base & { layout: "sim"; eyebrow?: string; title?: string; sim: SimKind; params?: Record<string, number | string>; show?: string[]; equation?: string; caption?: string });
