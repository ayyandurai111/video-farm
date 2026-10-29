# Channel brand (physics): extra layouts, simulations and formulas

Use this when `brandTheme` is `"channel"`. The channel brand has every normal layout (title, bullets, stat, steps, outro...) **plus** the physics layouts below. The `handson` brand does not have them, and `check_scenes.py` / `validate_scenes` reject them there.

Set it in the scenes file: `"meta": { "brandTheme": "channel" }`. Default light or dark comes from the brand (dark for the channel). `meta.brand` still overrides the name and mark in the top bar.

## Who is watching: `meta.audience`
- `"everyone"` (the default): the audience is normal people, not physics students. Pictures use plain words ("Gravity", "Speed", "One swing takes 2.2 s"), no vectors or symbols, bigger text, fewer numbers on screen.
- `"expert"`: symbols, vector arrows, KE and PE, formulas in the readouts.
Set it in `meta` or with `--audience everyone|expert` (MCP option `audience`). Choose `expert` only if the user says the viewers study physics.

Writing for everyone:
1. Say it in words first. Do not put `equation` on a `sim` scene. Use an `equation` or `derivation` scene only when the narrator says the formula out loud, and keep it to one short line.
2. Force labels in `freebody` are words: `"\\text{Gravity}"`, `"\\text{Your push}"`, `"\\text{Friction}"`, not `\\vec{F}`.
3. Graph labels in words with units: `"Time (seconds)"`, `"Height (metres)"`.
4. Start from something people know (a thrown ball, a swing, a bouncing mattress, a bulb), then show the picture, then give one number.
5. One idea per scene. If the narrator talks for more than 8 seconds, split it.

## Formulas (`tex`)
A small LaTeX subset, written inside JSON, so every backslash is doubled: `"tex": "E = \\frac{1}{2} m v^2"`.
- Fractions `\\frac{a}{b}`, roots `\\sqrt{x}`, powers `x^2`, `x^{n+1}`, subscripts `v_0`, `F_{\\text{net}}`
- Arrows over letters: `\\vec{F}`, `\\hat{n}`, `\\bar{x}`
- Greek: `\\theta \\omega \\lambda \\mu \\Delta \\Omega` and the rest of the usual letters
- Signs: `\\cdot \\times \\pm \\approx \\propto \\neq \\leq \\geq \\rightarrow \\infty \\partial \\nabla \\degree`
- Functions: `\\sin \\cos \\tan \\ln \\log \\exp`
- Words and units in upright type: `\\text{m/s}`, `\\text{kg m}`. A thin space is `\\,`
- Highlight a part (a marker sweeps over it, in reading order): `F = \\hl{m} \\hl{a}`
Keep one formula to about 40 characters of tex. Long formulas: use `derivation` and show one step per line.

## Layouts
| layout | needs | optional |
|---|---|---|
| `equation` | `tex` | `eyebrow`, `title`, `note`, `size` (`m`, `l`, `xl`; use `m` in 9:16) |
| `derivation` | `lines` (2 to 5): each a tex string or `{tex, note}` | `title`. The last line is shown in colour as the result |
| `graph` | `series` (1 to 4): each `{points:[[x,y],...]}` or `{expr:"0.5*9.8*x^2"}` | `xLabel`, `yLabel`, `xRange`, `yRange`, `title`, `caption`; per series `label`, `color`, `dashed`, `fill` (shades the area under the curve). With `expr` always set `xRange` |
| `freebody` | `forces` (1 to 6): `{label (tex), angle (degrees, 0 = right, 90 = up), mag (number), color?}` | `body` (`block`, `ball`), `net: true` (adds the resultant arrow), `title`, `caption` |
| `quantity` | `name`, `value`, `unit` (tex) | `symbol` (tex), `note`, `eyebrow` |
| `units` | `rows` (1 to 6): `{name, symbol (tex), unit (tex)}` | `title` |
| `question` | `question` | `answer` (appears halfway through the scene), `eyebrow` |
| `analogy` | `left`, `right`: `{title, text?, icon? (Lucide), anim?}` | `title`, `sign` (default `≈`) |
| `timeline` | `events` (1 to 4): `{year, text}` | `title` |
| `sim` | `sim` (a name below) | `params`, `show`, `equation` (tex shown beside the title), `title`, `eyebrow`, `caption` |

Graph `expr` accepts `+ - * / ^ ( )`, `2x`, `pi`, `e`, and `sin cos tan asin acos atan exp ln log sqrt abs`. The variable is `x`.

## Simulations (`layout: "sim"`)
Every simulation is a formula of time, so it looks the same in every render. Pass numbers in `params` (all optional, defaults shown). `speed` makes time run faster or slower where it exists.
- `projectile`: `v0` 20 (m/s), `angle` 45 (deg), `g` 9.81, `h0` 0 (launch height). The flight is stretched to fill about 80 percent of the scene. `show`: `components` (vx, vy arrows), `gravity`, `range`, `-trail`, `-velocity`
- `pendulum`: `length` 1 (m), `theta0` 40 (deg), `damping` 0, `speed` 1. Real swing (not the small-angle formula) and kinetic/potential energy bars. `show`: `force`, `-energy`
- `spring`: `m` 1, `k` 4, `c` 0.25 (damping), `x0` 1, `speed`. Shows an x-against-t trace and energy bars. `show`: `-graph`, `-energy`, `-force`
- `incline`: `angle` 30, `mu` 0.2 (friction), `m` 1. If friction is too big the block stays still (it is shown, as it is true). `show`: `-forces`
- `collision`: `m1` 2, `m2` 1, `v1` 3, `v2` -1, `e` 1 (1 elastic, 0 sticks together), `x1` -5, `x2` 4. The scene is timed so the hit is at 40 percent. Shows momentum and kinetic energy. `show`: `-energy`
- `orbit`: `speed` 1 (1 is a circle, below 1 an ellipse, 1.41 or more escapes), `rate` 1. `show`: `-gravity`, `-velocity`
- `wave`: `mode` (`travel`, `standing`, `superposition`), `A` 1, `wavelength` 4, `freq` 0.5. `show`: `wavelength`, `-particle`
- `optics`: `n1` 1, `n2` 1.5, `angle` 40, `from` (start angle; the ray sweeps from `from` to `angle`). Total internal reflection appears when it happens (try `n1` 1.5, `n2` 1, `angle` 60)
- `circuit`: `V` 12, `R1` 4, `R2` 2, `mode` (`series`, `parallel`). Electrons move faster where the current is bigger
- `field`: `q1` 1, `q2` -1 (sign sets the colour), `d` 2.4 (half the distance). An arrow grid
- `gas`: `n` 60, `T` 1, `T2` (end temperature, the gas heats up smoothly), `seed` 7, `speed` 1.6

## Colours that always mean the same thing
Force red, velocity blue, acceleration orange, energy yellow, field purple, positive charge red, negative charge blue, trace and path teal. Use these names for `color`: `force velocity accel energy field positive negative mass axis grid trace`, or a pastel name, or a hex code.

## How to write a physics video
1. Question first (`question`), then the idea (`equation` or `analogy`), then **show it moving** (`sim` or `graph`), then the numbers (`quantity`, `units`), then the close (`outro`).
2. One idea per scene. Put the formula on the screen only while it is spoken. Use `derivation` when the narration walks through steps.
3. In 9:16 keep formulas short, use `size: "m"`, and prefer `sim` and `graph` (they stack vertically).
4. The picture must match the numbers in the narration: if the narrator says 45 degrees, `angle` is 45.

## Adding another brand (for the developer)
1. Copy `src/brands/channel/` to `src/brands/<name>/`, edit its `theme.ts` (colours, fonts, name) and its scenes.
2. Add it in `src/brands/themes.ts` (`THEMES`) and `src/brands/scenes.ts` (`REGISTRIES`).
3. Add its layouts and brand name to `assets/channel-schema.json`, and the name to `--brand-theme` choices in `scripts/build_video.py`.
4. Run `python3 mcp/build_guide.py`, then deploy the MCP.
