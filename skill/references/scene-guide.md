# Writing scenes.json

```json
{
  "meta": { "title": "...", "duration": 24, "fps": 30, "aspect": "16:9", "theme": "dark",
            "captions": "bar", "mascot": true, "audio": "audio.mp3" },
  "scenes": [ { "id": "s1", "start": 0, "end": 3.5, "layout": "title", "...": "..." } ]
}
```
`aspect`: 16:9 (1920x1080), 9:16 (1080x1920), 1:1 (1080x1080). `theme`: dark or light. `captions`: bar or off. Optional `accent` on any scene: pink, blue, lav, mint, sun, accent.

## Layouts
| layout | fields | best for | limits |
| --- | --- | --- | --- |
| title | eyebrow?, title, subtitle? | opening, section start | title under 50 characters |
| bullets | eyebrow?, title?, items[] | lists of 2 to 5 points | max 5 items, each under 45 characters |
| stat | eyebrow?, value, label, note? | one number or short proof ("14", "3x") | value up to 6 characters |
| quote | text, who? | a claim, a testimonial, a key sentence | text under 90 characters |
| code | title?, code | a command or snippet | max 8 lines, 40 characters wide |
| steps | title?, steps[] | how it works, 2 to 6 steps, highlights one by one | each under 45 characters |
| compare | left{title,items[]}, right{title,items[]} | before/after, old/new | 3 items per side |
| outro | title, cta, url?, tagline? | last scene, call to action | cta under 25 characters |

## Picking layouts from captions
- First scene: `title` (name of the product and a one-line promise).
- A caption listing things ("a loop, tools, memory and safety") becomes `bullets`.
- A caption with a number becomes `stat`.
- A sentence that sounds like a claim or a customer voice becomes `quote`.
- "First... then... finally" becomes `steps`.
- "Instead of X, Y" becomes `compare`.
- A command, file name or snippet becomes `code`.
- Last scene: `outro`.

## Timing
- Group 1 to 3 captions per scene. Scenes under 2 seconds feel jumpy; over 8 seconds feel static.
- Items in `bullets` and `steps` appear spread over the first 70% of the scene, so give them at least 1 second each.
- Copy times exactly from `captions.json`. `check_scenes.py` rejects any scene that does not start and end on a caption boundary.

## Changing one scene later
Edit only that object in `scenes.json`, run `check_scenes.py`, then re-render.


## logos and features (added)
- `logos`: 2 to 6 brand names, shown as white tiles. Use when the narration lists tools, partners or tech stack. 4 or more logos make two rows, so keep the title short.
- `features`: 2 to 4 icon cards for benefits or steps. Pick a different `anim` per card (bounce, wiggle, float) so they do not move in sync.
- Bullets with icons: give every item an icon or none, do not mix.
