// Axis helpers: pick tidy tick values and map data to pixels.
export function niceStep(range: number, target = 5): number {
  const raw = range / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * mag;
}
export function niceTicks(min: number, max: number, target = 5): number[] {
  if (!(max > min)) return [min];
  const step = niceStep(max - min, target);
  const start = Math.ceil(min / step - 1e-9) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
  return out;
}
export function niceRange(lo: number, hi: number): [number, number] {
  if (lo === hi) { lo -= 1; hi += 1; }
  const step = niceStep(hi - lo, 5);
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}
export const fmtTick = (v: number): string => (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(0) : String(+v.toPrecision(6))).replace("-", "−");
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const rad = (d: number) => (d * Math.PI) / 180;
