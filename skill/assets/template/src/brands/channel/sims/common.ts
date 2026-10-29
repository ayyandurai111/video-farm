// Shared bits for the simulations. A simulation is a React component that draws SVG for one moment in time.
export type Params = Record<string, number | string | undefined>;
export type SimProps = {
  t: number;      // seconds since the scene started
  frame: number;  // frames since the scene started (for fade-ins)
  fps: number;
  dur: number;    // scene length in seconds
  w: number; h: number; // SVG size
  params: Params;
  show: string[];  // extra things to draw; "-name" hides something that is on by default
};
export const num = (p: Params, k: string, d: number): number => (typeof p[k] === "number" ? (p[k] as number) : d);
export const str = (p: Params, k: string, d: string): string => (typeof p[k] === "string" ? (p[k] as string) : d);
export const on = (show: string[], k: string, d = false): boolean => (show.includes(`-${k}`) ? false : show.includes(k) ? true : d);
