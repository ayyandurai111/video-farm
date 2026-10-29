// The physics behind every simulation. Pure functions of time: give a time in seconds, get the state.
// Remotion draws video frames in any order (and in several browser tabs at once), so nothing here keeps hidden state.
// Where a formula exists we use it. Where we must integrate (pendulum, orbit) we step with RK4 from t = 0 once, cache the samples and look them up.
import { clamp, rad } from "./plot";

export const G = 9.81;

// ---------- seeded random (the same numbers in every tab and every render) ----------
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- projectile ----------
export type ProjectileIn = { v0: number; angle: number; g?: number; h0?: number };
export function projectile({ v0, angle, g = G, h0 = 0 }: ProjectileIn) {
  const vx = v0 * Math.cos(rad(angle)), vy0 = v0 * Math.sin(rad(angle));
  // time when y returns to 0: h0 + vy0 t - g t^2 / 2 = 0
  const tFlight = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
  const at = (t0: number) => {
    const t = clamp(t0, 0, tFlight);
    return { t, x: vx * t, y: h0 + vy0 * t - 0.5 * g * t * t, vx, vy: vy0 - g * t };
  };
  return { at, tFlight, range: vx * tFlight, hMax: h0 + (vy0 > 0 ? (vy0 * vy0) / (2 * g) : 0), vx, vy0 };
}

// ---------- RK4 helper ----------
type Vec = number[];
export function rk4(f: (s: Vec, t: number) => Vec, s0: Vec, dt: number, steps: number, every: number): Vec[] {
  const out: Vec[] = [s0.slice()];
  let s = s0.slice(), t = 0;
  const add = (a: Vec, b: Vec, k: number) => a.map((v, i) => v + b[i] * k);
  for (let n = 1; n <= steps; n++) {
    const k1 = f(s, t), k2 = f(add(s, k1, dt / 2), t + dt / 2), k3 = f(add(s, k2, dt / 2), t + dt / 2), k4 = f(add(s, k3, dt), t + dt);
    s = s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    t += dt;
    if (n % every === 0) out.push(s.slice());
  }
  return out;
}
const cache = new Map<string, unknown>();
function memo<T>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
}
// Linear look-up in a table sampled every 1/rate seconds.
function look(table: Vec[], rate: number, t: number): Vec {
  const f = clamp(t * rate, 0, table.length - 1);
  const i = Math.floor(f), j = Math.min(table.length - 1, i + 1), w = f - i;
  return table[i].map((v, k) => v + (table[j][k] - v) * w);
}

// ---------- pendulum (nonlinear, with optional damping) ----------
export type PendulumIn = { length: number; theta0: number; damping?: number; g?: number; duration?: number };
export function pendulum({ length, theta0, damping = 0, g = G, duration = 60 }: PendulumIn) {
  const rate = 120; // samples per second in the table
  const table = memo(`pend:${length}:${theta0}:${damping}:${g}:${duration}`, () =>
    rk4((s) => [s[1], -(g / length) * Math.sin(s[0]) - damping * s[1]], [rad(theta0), 0], 1 / 960, Math.round(duration * 960), 8));
  return {
    at: (t: number) => { const [th, w] = look(table, rate, t); return { theta: th, omega: w, x: length * Math.sin(th), y: -length * Math.cos(th) }; },
    energy: (t: number) => { const [th, w] = look(table, rate, t); return { ke: 0.5 * length * length * w * w, pe: g * length * (1 - Math.cos(th)) }; },
    period: 2 * Math.PI * Math.sqrt(length / g),
  };
}

// ---------- mass on a spring (formula, any damping) ----------
export type SpringIn = { m: number; k: number; c?: number; x0: number };
export function spring({ m, k, c = 0, x0 }: SpringIn) {
  const w0 = Math.sqrt(k / m), gam = c / (2 * m);
  const x = (t: number): { x: number; v: number } => {
    if (gam < w0 - 1e-9) {                              // under-damped: it oscillates
      const wd = Math.sqrt(w0 * w0 - gam * gam), e = Math.exp(-gam * t);
      const xs = x0 * e * (Math.cos(wd * t) + (gam / wd) * Math.sin(wd * t));
      const v = x0 * e * (-(wd * wd + gam * gam) / wd) * Math.sin(wd * t);
      return { x: xs, v };
    }
    if (gam < w0 + 1e-9) { const e = Math.exp(-gam * t); return { x: x0 * e * (1 + gam * t), v: -x0 * e * gam * gam * t }; } // critical
    const s = Math.sqrt(gam * gam - w0 * w0), r1 = -gam + s, r2 = -gam - s;           // over-damped
    const c1 = (x0 * -r2) / (r1 - r2), c2 = (x0 * r1) / (r1 - r2);
    return { x: c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t), v: c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t) };
  };
  const energy = (t: number) => { const s = x(t); return { ke: 0.5 * m * s.v * s.v, pe: 0.5 * k * s.x * s.x }; };
  return { at: x, energy, period: 2 * Math.PI / w0 };
}

// ---------- waves ----------
export type WaveMode = "travel" | "standing" | "superposition";
export function wave(mode: WaveMode, A: number, k: number, w: number, k2 = k * 1.15, w2 = w * 1.15) {
  return (x: number, t: number): number[] => {
    if (mode === "travel") return [A * Math.sin(k * x - w * t)];
    if (mode === "standing") return [2 * A * Math.sin(k * x) * Math.cos(w * t)];
    const a = A * Math.sin(k * x - w * t), b = A * Math.sin(k2 * x - w2 * t);
    return [a + b, a, b];
  };
}

// ---------- orbit around a fixed star (GM = 1, start at r = 1) ----------
export type OrbitIn = { speed: number; duration?: number }; // speed 1 = circular orbit
export function orbit({ speed, duration = 60 }: OrbitIn) {
  const rate = 60;
  const table = memo(`orbit:${speed}:${duration}`, () =>
    rk4((s) => { const r3 = Math.pow(s[0] * s[0] + s[1] * s[1], 1.5); return [s[2], s[3], -s[0] / r3, -s[1] / r3]; }, [1, 0, 0, speed], 1 / 960, Math.round(duration * 960), 16));
  const e = 0.5 * speed * speed - 1;                    // energy per unit mass
  return {
    at: (t: number) => { const [x, y, vx, vy] = look(table, rate, t); return { x, y, vx, vy, r: Math.hypot(x, y) }; },
    energy: e,
    period: e < 0 ? 2 * Math.PI * Math.pow(1 / (-2 * e), 1.5) : Infinity,
    semiMajor: e < 0 ? 1 / (-2 * e) : Infinity,
    trail: (t: number, n = 120, span = 6): [number, number][] => Array.from({ length: n }, (_, i) => { const s = look(table, rate, Math.max(0, t - span * (1 - i / (n - 1)))); return [s[0], s[1]] as [number, number]; }),
  };
}

// ---------- 1D collision of two blocks ----------
export type CollisionIn = { m1: number; m2: number; v1: number; v2: number; x1?: number; x2?: number; e?: number };
export function collision({ m1, m2, v1, v2, x1 = -3, x2 = 3, e = 1 }: CollisionIn) {
  const gap = x2 - x1 - 1;                              // blocks are 1 unit wide
  const tc = v1 > v2 ? gap / (v1 - v2) : Infinity;
  const u1 = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / (m1 + m2);
  const u2 = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / (m1 + m2);
  return {
    tc, u1, u2,
    at: (t: number) => t < tc
      ? { x1: x1 + v1 * t, x2: x2 + v2 * t, v1, v2 }
      : { x1: x1 + v1 * tc + u1 * (t - tc), x2: x2 + v2 * tc + u2 * (t - tc), v1: u1, v2: u2 },
    momentum: (t: number) => { const s = t < tc ? [v1, v2] : [u1, u2]; return m1 * s[0] + m2 * s[1]; },
    kinetic: (t: number) => { const s = t < tc ? [v1, v2] : [u1, u2]; return 0.5 * m1 * s[0] * s[0] + 0.5 * m2 * s[1] * s[1]; },
  };
}

// ---------- block on an incline ----------
export type InclineIn = { angle: number; mu?: number; m?: number; length?: number; g?: number };
export function incline({ angle, mu = 0, m = 1, length = 8, g = G }: InclineIn) {
  const th = rad(angle);
  const slide = g * Math.sin(th) - mu * g * Math.cos(th);
  const a = Math.max(0, slide);
  const sMax = length - 1;                              // the block is 1 unit long
  return {
    a, moving: a > 0,
    weight: m * g, normal: m * g * Math.cos(th), alongSlope: m * g * Math.sin(th),
    friction: a > 0 ? mu * m * g * Math.cos(th) : Math.min(mu * m * g * Math.cos(th), m * g * Math.sin(th)),
    s: (t: number) => clamp(0.5 * a * t * t, 0, sMax),
    v: (t: number) => (0.5 * a * t * t >= sMax ? 0 : a * t),
    tEnd: a > 0 ? Math.sqrt((2 * sMax) / a) : Infinity,
  };
}

// ---------- DC circuit with two resistors ----------
export type CircuitIn = { V: number; R1: number; R2: number; mode: "series" | "parallel" };
export function circuit({ V, R1, R2, mode }: CircuitIn) {
  if (mode === "series") {
    const R = R1 + R2, I = V / R;
    return { R, I, I1: I, I2: I, V1: I * R1, V2: I * R2 };
  }
  const R = (R1 * R2) / (R1 + R2);
  return { R, I: V / R, I1: V / R1, I2: V / R2, V1: V, V2: V };
}

// ---------- refraction (Snell's law) ----------
export function refract(n1: number, n2: number, theta1Deg: number) {
  const s = (n1 / n2) * Math.sin(rad(theta1Deg));
  if (Math.abs(s) > 1) return { total: true as const, theta2: NaN, critical: Math.asin(n2 / n1) * 180 / Math.PI };
  return { total: false as const, theta2: Math.asin(s) * 180 / Math.PI, critical: n1 > n2 ? Math.asin(n2 / n1) * 180 / Math.PI : NaN };
}

// ---------- electric field of point charges (units: k = 1) ----------
export type Charge = { x: number; y: number; q: number };
export function field(charges: Charge[], x: number, y: number): { ex: number; ey: number; mag: number } {
  let ex = 0, ey = 0;
  for (const c of charges) {
    const dx = x - c.x, dy = y - c.y, r2 = dx * dx + dy * dy + 0.04, r3 = Math.pow(r2, 1.5); // 0.04 softens the point itself
    ex += (c.q * dx) / r3; ey += (c.q * dy) / r3;
  }
  return { ex, ey, mag: Math.hypot(ex, ey) };
}

// ---------- ideal gas in a box (particles do not hit each other, only the walls) ----------
export function gas(n: number, temperature: number, seed = 7, w = 1, h = 1) {
  const r = rng(seed);
  const ps = Array.from({ length: n }, () => {
    const ang = r() * Math.PI * 2, sp = (0.25 + r() * 0.75) * Math.sqrt(temperature);
    return { x0: r() * w, y0: r() * h, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp };
  });
  const fold = (u: number, L: number) => { const m = ((u % (2 * L)) + 2 * L) % (2 * L); return m <= L ? m : 2 * L - m; };
  return {
    at: (t: number) => ps.map((p) => ({ x: fold(p.x0 + p.vx * t, w), y: fold(p.y0 + p.vy * t, h), speed: Math.hypot(p.vx, p.vy) })),
    meanKinetic: ps.reduce((s, p) => s + 0.5 * (p.vx * p.vx + p.vy * p.vy), 0) / n,
  };
}
