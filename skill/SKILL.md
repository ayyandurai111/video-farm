---
name: caption-to-video
description: Turn an audio file plus timed captions (.srt, .vtt or JSON) into a finished MP4 promo or explainer video, with scenes timed exactly to the captions and styled like the Hands-on AI website or the physics channel, brand chosen by the user (cream or dark background, Nunito font, thick outlines, hard shadows, pastel cards, highlighter marks, top bar, green robot mascot). Use this whenever the user gives audio with captions or subtitles and wants a video, reel, promo, explainer, course teaser or "make a video from this", even if they do not say Remotion or MP4. Also use for changing one scene of a video made before, switching 16:9 and 9:16, or adding Tamil captions.
---

# caption-to-video

Audio + captions in, MP4 out. The captions decide **when** each scene appears. You decide **what** each scene shows. Remotion (React) draws it, and the website's design tokens keep every video looking like the product.

## Fully automatic: the user sends only audio and captions
Never add background music. There are two looks ("brand themes"): `handson` (the Hands-on AI website) and `channel` (the physics channel, with extra layouts for formulas, graphs, forces and simulations; read `references/channel-physics.md`). **If the user did not say which one, ask exactly one short question before anything else: "Hands-on AI theme or your channel theme?"** Do not ask anything else. If they already said (hands-on, website, channel, physics) do not ask. Then use these defaults and say in one line what you chose: 16:9, theme light for `handson` and dark for `channel`, captions bar on, mascot off, top bar on, sound effects on (`minimal`), `brandTheme` in `meta`, audience `everyone` (plain words; `expert` only if the viewers study physics). Ask nothing else unless the message gives no audio or no captions. If they mention a shape (reel, shorts, vertical), a theme, a brand name, a CTA or a URL, apply it.

You are the scene designer. The script does the plumbing, you do the thinking.

1. **Read the captions** (`.srt`, `.vtt` or JSON) and understand the story: hook, problem, solution, proof, call to action.
2. **Write `scenes.json` yourself** (read `references/scene-guide.md` first). For each beat pick the layout that shows the idea, not just repeats the words:
   - tools, partners or tech named in the narration -> `logos` (slugs from simpleicons.org)
   - a number or percentage -> `stat` or `facts`
   - two to four benefits -> `features` with a fitting Lucide icon and a different `anim` on each card
   - a list or sequence -> `bullets` with icons, or `steps`
   - old way versus new way -> `table`
   - a code or command -> `code`
   - hook first -> `title` (with `**key words**` highlighted), close -> `outro` with a CTA
   Scene `start`/`end` are copied from caption times, no gaps or overlaps. On-screen text is shorter than the spoken words. Vary layouts; never the same one three times in a row. Wrap 1 to 2 key words per scene in `**`.
3. **Build with one command:**
   `python scripts/build_video.py --audio <audio> --captions <captions> --scenes scenes.json --out out/video.mp4 [--aspect 9:16] [--brand-theme handson|channel] [--theme light|dark] [--brand "Name"] [--no-topbar] [--no-captions] [--sfx minimal|off] [--low]`
   It sets up the project once (reused after that, about 30 s on the first run only), parses the captions, validates, renders, and saves 4 preview frames. Run it in the background (`nohup ... &`) and poll the log; a 30 s 1080p video takes a few minutes.
   Fallback: without `--scenes` it makes a rough set of scenes from the captions by keywords. Use that only for a quick draft; your own scenes are better.
   All options can also go in a `--job job.json` file (same names, underscores).
4. **Look before you send.** View the 4 PNGs in `out/preview/` (and extra frames with ffmpeg for the logos, table and outro scenes). Check text cut off, overlap with the top bar or caption bar, boxes instead of glyphs, empty scenes. Fix `scenes.json` and rebuild. Do not say it is fine without looking.
5. **Deliver** the MP4 with `SendUserFile`. Say in one or two lines what the scenes are and offer to change one scene.

To change one scene later: edit only that scene in `scenes.json` and run the same command again.

If the sandbox has no text-to-speech engine and the user has no audio, say so; do not invent narration.

## Fast remote build on GitHub (optional)
Local rendering here has only 2 CPU cores, so a 30 s video takes 2 to 3 minutes. A **public** GitHub repo running the `video-farm` workflows renders on 4 cores (a private repo gets 2, no gain). Two ways to use it, in this order:

**A. MCP tools (when the `video-farm` connector is available, tools `submit_render`, `render_status`, `get_video`, `cancel_render`, `list_jobs`)**
1. Write `scenes.json` as usual. Call `submit_render` with `captions` (the caption file text), `scenes` (the scenes.json text) and `options` (aspect, theme, brand, cta, url, sfx, sfx_volume, no_topbar...). Keep the payload under 60,000 characters. You get a `job_id`.
2. Poll `render_status` every 20 to 30 s until `success` (or `failed`: open the run link and fix the cause). Typical: 1 to 2 minutes for 30 s of video.
3. `get_video` returns a public URL. Download it: `curl -L -o remote.mp4 "<url>"` (github.com hosts are reachable from the sandbox).
4. **The remote render has the sound effects but no narration** (audio is too large to pass through a tool call). Mix the user's audio in: `python scripts/mux_audio.py remote.mp4 <user audio> out/video.mp4`. Never add music.
5. Deliver `out/video.mp4`. The remote render produces no preview frames; if you changed a layout, check it with a quick local `--low` build of that scene.
Privacy: only captions and scenes text reach the public repo (visible in the Actions run); the audio never leaves the sandbox. Tell the user once. Releases are deleted after 24 h.

**B. Git (no MCP):** attach the repo with `add_repo` (access `push`), clone it, then `python scripts/remote_build.py --repo-dir <clone> --audio A --captions C --scenes scenes.json --out out/video.mp4`. This one uploads the audio to the public repo (public and in git history); warn the user. Do not use `gh`, its token is not available.

If neither is set up, build locally and mention the option once. Setup is in the `video-farm` package README.

## Design: keep it the same as the website
All design values live in `assets/template/src/theme.ts` and are explained in `references/design-system.md`. Do not hard-code colours or sizes in scenes. If the user wants a new look, change `theme.ts` once. If a layout is missing, add a component in `src/scenes/index.tsx` and register it in `registry`, add it to `lib/types.ts` and to `REQ` in `scripts/check_scenes.py`.

## Site look (updated from the latest website)
- **Top bar** on every scene: pink "AI" square plus the site name, white card with outline and hard shadow. Change the name in `theme.ts` (`site`) or per video with `meta.brand: { "name": "...", "mark": "AI" }`. Hide it with `meta.topbar: false`.
- **Highlighter marks:** wrap words in `**double stars**` in any title, subtitle, bullet or CTA and a mint highlighter sweeps behind them, like `.mark` on the site. Use 1 to 2 marks per scene, on the key words only.
- **Colour bands:** each scene is painted like a site section. `bullets`, `features` and `steps` use the white `surface` band (cards turn cream with a soft shadow and no outline); `outro` uses the blue band with a white CTA card and 6px shadow; everything else uses the cream page. Override per scene with `"band": "bg" | "surface" | "blue" | "pink" | "lav" | "mint" | "sun"`.
- **`facts` layout:** up to 3 pastel cards with a big number and one line, like the site's problem facts (`{ "value": "~4%", "text": "..." }`).
- **`table` layout:** the site's compare table, blue header, grey old-way column, green ticked column (`head` of 3 labels, up to 5 `rows` of 3 cells).
- Keep the first column of `head` empty (`""`) when the rows already name the row.

## Brand logos and animated icons
Two layouts and two options use offline npm packages already listed in `package.json` (`simple-icons`, `lucide-react`). No downloads at render time.
- `logos` layout: `{ "layout": "logos", "title": "Built with", "items": [{ "brand": "python" }, { "brand": "github", "label": "GitHub" }] }`. Max 6. `brand` is a slug from simpleicons.org (python, react, github, docker, figma, typescript, vercel, nodedotjs...). Logos sit on white tiles so they read in both themes. `"mono": true` draws them all in one dark colour. Some brands (for example OpenAI) are not in the package; an unknown slug stops the render with a clear error, so use a Lucide icon or a user-supplied file in `public/` instead.
- `features` layout: `{ "layout": "features", "items": [{ "icon": "rocket", "title": "Learn fast", "text": "optional line", "anim": "bounce" }] }`. Max 4.
- `bullets` items may be `{ "text": "...", "icon": "search", "anim": "pulse" }` instead of a plain string.
- `title` scene accepts `"icon": "sparkles", "anim": "wiggle"` to show an animated icon tile instead of the mascot.
- `icon` is any Lucide name (lucide.dev/icons), kebab-case or PascalCase. `anim` is one of `pop` (default), `bounce`, `spin`, `pulse`, `float`, `wiggle`, `draw`, `none`.
- Use `<BrandLogo name="github" />` and `<AnimIcon name="rocket" anim="bounce" />` / `<IconTile />` inside any new scene component.
- Other libraries that install fine from npm if the user wants them: `@phosphor-icons/react`, `@tabler/icons-react`, `react-icons`, `@iconify/json`, `@remotion/lottie` + `lottie-web` (needs a Lottie .json file the user provides). Photos and illustrations cannot be downloaded in the sandbox; ask the user to attach them and put them in `public/`.
- If the sandbox has no text-to-speech engine, tell the user and ask for their own audio. Do not pretend a silent demo has narration.

## Sound effects
Offline sound effects come from the npm package `uisfx` (MIT, 12 styles x 78 cues, all bundled, no downloads). `build_video.py` turns them on by default with the `minimal` pack at a clear, loud level (volume 0.9, the user asked for them loud). They are the only added audio; there is no background music.
- `--sfx soft|glass|dreamy|organic|rubber|arcade|scifi|cinematic|mechanical|studio|zen` picks the style; `--sfx off` removes sound; `--sfx-volume 0.5` makes them quieter, `1` is maximum. Pick one style per video. `minimal` or `soft` for most, `arcade` or `rubber` for playful or kids content, `cinematic` for trailers, `zen` for calm.
- Where sounds play: scene change `swipe` (first scene `open`), cards and bullets landing `drop` (pitch varies per item), logos `select`, table rows `snap`, highlighter `focus`, stat number and CTA button `success`, steps `progress-step`.
- In your own scene component: `<Pop sfx="drop" pitch={pitch(i)}>` or `<Sfx cue="success" delay={frames} />` (from `lib/sfx.tsx`). To use another cue, add its name to `SFX_CUES` in `lib/sfx.tsx` and in `scripts/build_video.py`.
- `@remotion/sfx` does not work in the sandbox (it downloads its sounds from a blocked address); do not use it.

## Word-by-word highlight (optional)
If the captions JSON has `words: [{text,start,end}]`, the caption bar highlights the spoken word in mint. SRT/VTT have no word times, so the bar shows the whole line. If the user wants highlight and has none, suggest making word timestamps with Whisper (`--word_timestamps True`) and giving the JSON.

## Tamil and other languages
Noto Sans Tamil is bundled and used automatically for Tamil letters, so Tamil text works in titles, bullets and captions with no setup. Keep each on-screen line short; Tamil words are long. For any other script, add a woff2 file to `public/fonts/` and one line to `lib/fonts.ts`.

## Environment notes
- Needs Node 18+, ffmpeg and a Chromium. Here Chromium is at `/opt/pw-browsers`, and `render.sh` finds it. Remotion's own browser download may be blocked.
- Concurrency is capped by CPU cores (`render.sh` handles it).
- Audio is mixed as-is: the user's own audio, plus sound effects. **Never add background music or any ambient bed to any video**, even for demos or tests. If a demo needs an audio track and the user gave none, use silence (`ffmpeg -f lavfi -i anullsrc -t SECONDS`), so only the effects are heard.
- Remotion is free for individuals and small teams; companies above its size limit need a licence. Mention this if the user is a company.
- Never invent AI images. Visuals come from the scene components, the mascot, and files the user supplies.

## Files
- `assets/template/` Remotion project (shared components, caption bar, fonts) and `src/brands/<brand>/` (each brand's theme and its own layouts)
- `assets/channel-schema.json` layouts, required fields and simulation parameters per brand (read by `check_scenes.py` and the MCP worker)
- `assets/example/` a 24 s sample: `captions.srt` and `scenes.json` (handson), and `scenes.channel-showcase.json` with its captions (channel)
- `scripts/build_video.py` (one-command build), `scripts/remote_build.py` (render on a GitHub repo by git), `scripts/prepare_api_job.py` and `scripts/mux_audio.py` (MCP render path), `scripts/parse_captions.py`, `scripts/check_scenes.py`, `scripts/render.sh`
- `references/design-system.md`, `references/scene-guide.md`, `references/channel-physics.md` (channel brand: formulas, physics layouts, simulations)
