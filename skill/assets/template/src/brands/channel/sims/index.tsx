import React from "react";
import { Projectile, Pendulum, Spring, Incline, Collision, Orbit } from "./mechanics";
import { Wave, Optics } from "./waves";
import { Circuit, Field } from "./em";
import { Gas } from "./gas";
import type { SimProps } from "./common";

// The name used in scenes.json: { "layout": "sim", "sim": "projectile", "params": { "v0": 20, "angle": 45 } }
export const SIMS = {
  projectile: Projectile, pendulum: Pendulum, spring: Spring, incline: Incline, collision: Collision, orbit: Orbit,
  wave: Wave, optics: Optics, circuit: Circuit, field: Field, gas: Gas,
} satisfies Record<string, React.FC<SimProps>>;
export type SimKind = keyof typeof SIMS;
export const SIM_KINDS = Object.keys(SIMS) as SimKind[];

// What each simulation accepts (all optional, these are the defaults). Used by check_scenes.py and the guide.
export const SIM_PARAMS: Record<SimKind, Record<string, number | string>> = {
  projectile: { v0: 20, angle: 45, g: 9.81, h0: 0 },
  pendulum: { length: 1, theta0: 40, damping: 0, g: 9.81, speed: 1 },
  spring: { m: 1, k: 4, c: 0.25, x0: 1, speed: 1 },
  incline: { angle: 30, mu: 0.2, m: 1 },
  collision: { m1: 2, m2: 1, v1: 3, v2: -1, e: 1, x1: -5, x2: 4 },
  orbit: { speed: 1, rate: 1 },
  wave: { mode: "travel", A: 1, wavelength: 4, freq: 0.5 },
  optics: { n1: 1, n2: 1.5, angle: 40, from: 40 },
  circuit: { V: 12, R1: 4, R2: 2, mode: "series" },
  field: { q1: 1, q2: -1, d: 2.4 },
  gas: { n: 60, T: 1, T2: 1, seed: 7, speed: 1.6 },
};
