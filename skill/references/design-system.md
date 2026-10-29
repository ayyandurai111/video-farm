# Design system (copied from the website)

Source: `apps/web/src/styles/globals.css`. The video keeps the same look: cream or dark page, **thick dark outline**, **hard offset shadow with no blur**, rounded corners, pastel blocks, bright green accent.

## Colours
| Token | Light | Dark |
| --- | --- | --- |
| bg | `#fff7f0` | `#151823` |
| surface (cards) | `#ffffff` | `#212638` |
| ink (text) | `#1e293b` | `#f5efe6` |
| muted | `#475569` | `#a9b2c6` |
| line (outline) | `#1e293b` | `#f5efe6` |
| hair (dividers) | `#eadfd3` | `#323a52` |
| code bg | `#ececf9` | `#2a3047` |

Pastels (same in both themes, text on them is always `#1e293b`): pink `#fbb9ae`, blue `#a8d8ea`, lav `#e4e4f7`, mint `#86efac`, sun `#facc15`. Brand green accent `#22c55e`.

## Shape
Border 2.5px, radius 18px, shadow `5px 5px 0` (small: `3px 3px 0`). Pills and badges are fully round with a 2px outline. Dashed outline = locked or upcoming.

## Type
Nunito (400/600/700/800) for everything. Headings are Nunito 700 with letter-spacing -0.02em. The CSS names Fredoka for headings, but the site never loads it, so real pages show Nunito, and the video matches that. Code uses JetBrains Mono. Tamil falls back to Noto Sans Tamil.

Video type scale on a 1280 canvas (scaled up for 1920 and portrait): h1 76, h2 48, h3 34, body 30, small 24, eyebrow 22, caption 32, code 26.

## Components mapped from the site
| Website | Video component |
| --- | --- |
| `.card` | `Card` |
| `.eyebrow` | `Eyebrow` (pill above a heading) |
| `.num` | `Num` (square badge) |
| `.primary` button | `Button` |
| `.lessons` list (done / current / locked) | `steps` scene |
| `.copybox` / code | `code` scene |
| Robot from the thumbnail | `Mascot` |

## Changing the look
Edit `src/theme.ts` only. Scenes read everything through `useTheme()`.


## Updated from the latest website (globals.css)
| Website | Video |
| --- | --- |
| `.topbar` + `.brand` + `.logo` (pink "AI" square, SITE_NAME) | `TopBar` in `Frame` |
| `.mark` highlighter sweep, `--sel: #86efac` | `Mark` and `Rich` (`**word**`) |
| `.problems`, `section.how` white full-width bands | `band: "surface"`, cards go cream with `--shadow-soft`, no outline |
| `.cta-band` blue band + `.cta` card, shadow `6px 6px 0` | `outro` layout |
| `.facts` pastel cards with big display number | `facts` layout |
| `.compare` table, blue head, green ticked "us" column | `table` layout |
| `.ico` rounded pastel tile, 2px outline, radius 12 | `IconTile` (Lucide icons instead of emoji) |
| `.primary` button, green `#22c55e`, ink text | `Button color="accent"` |
Default theme is now `light`. The site follows the viewer's colour scheme; video picks one with `meta.theme`.
