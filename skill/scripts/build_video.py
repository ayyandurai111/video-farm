#!/usr/bin/env python3
"""One command: audio + captions in, MP4 out.

  build_video.py --audio a.mp3 --captions a.srt --out out/video.mp4 [options]
  build_video.py --job job.json            (every option as a JSON key, see JOB KEYS below)

Scenes are made automatically from the captions unless you pass --scenes scenes.json
(a full file, or just {"scenes":[...]}). Auto mode picks a layout from the words:
  brand names -> logos, numbers -> stat, short lists -> bullets with icons,
  two or three lines -> icon cards, one line -> quote. First scene = title, last = outro.

Options (also JOB KEYS, with dashes turned into underscores):
  --audio FILE  --captions FILE  --out FILE.mp4
  --title TEXT        title scene headline (default: first caption)
  --subtitle TEXT     title scene subline
  --aspect 16:9|9:16|1:1   (default 16:9)
  --brand-theme handson|channel   which look and which layouts (default handson; the physics channel is "channel")
  --audience everyone|expert   everyone (default): plain words on screen. expert: symbols, vectors, formulas
  --theme light|dark       (default: the brand's own default, light for handson, dark for channel)
  --brand NAME  --brand-mark AI   top bar text and square (default from theme.ts)
  --no-topbar  --no-captions  --mascot
  --sfx PACK|off      sound effects from the uisfx package (default minimal; also soft, glass, dreamy, organic,
                      rubber, arcade, scifi, cinematic, mechanical, studio, zen). --sfx-volume 0.9 sets the level.
  --cta TEXT  --url TEXT  --tagline TEXT   last scene
  --scene-len SEC     target scene length in auto mode (default 5)
  --scenes FILE       use your own scenes instead of auto
  --low               half-size quick preview
  --work DIR          project folder, reused between runs (default ~/.cache/caption-to-video/work)
  --dry-run           write scenes.json and stop (no render)
"""
import argparse, json, os, re, shutil, subprocess, sys
from pathlib import Path

SFX_CUES = ["swipe", "open", "drop", "select", "snap", "focus", "success", "progress-step"]  # keep in sync with src/lib/sfx.tsx
SKILL = Path(__file__).resolve().parent.parent
TEMPLATE = SKILL / "assets" / "template"
SCRIPTS = SKILL / "scripts"

ICONS = [  # keyword -> Lucide icon (all names verified to exist)
    (("learn", "teach", "course", "lesson", "student", "study"), "graduation-cap"),
    (("build", "make", "create", "craft"), "hammer"),
    (("code", "program", "script", "develop"), "code"),
    (("agent", "bot", "assistant", "robot"), "bot"),
    (("ai ", "smart", "intelligen", "magic"), "sparkles"),
    (("fast", "quick", "instant", "speed", "minute"), "zap"),
    (("time", "hour", "day", "week", "schedule"), "clock"),
    (("ship", "send", "launch", "deploy", "publish"), "send"),
    (("secure", "safe", "privacy", "protect", "trust"), "shield-check"),
    (("data", "database", "store", "memory"), "database"),
    (("search", "find", "discover", "research"), "search"),
    (("video", "film", "watch", "movie"), "clapperboard"),
    (("audio", "voice", "speak", "podcast", "listen"), "mic"),
    (("price", "pay", "cost", "free", "money", "save"), "wallet"),
    (("team", "people", "community", "together", "learners"), "users"),
    (("idea", "think", "creative", "insight"), "lightbulb"),
    (("goal", "target", "aim", "focus", "plan"), "target"),
    (("cloud", "online", "web", "internet"), "cloud"),
    (("test", "check", "quality", "verify", "evaluate"), "flask-conical"),
    (("connect", "integrat", "plug", "tool", "mcp"), "plug"),
    (("computer", "laptop", "device", "desktop"), "laptop"),
    (("question", "answer", "chat", "ask", "reply"), "message-circle"),
    (("unlock", "open", "access"), "lock-open"),
    (("start", "begin", "first", "go "), "rocket"),
    (("book", "read", "guide", "notes"), "book-open"),
    (("step", "process", "flow", "pipeline"), "workflow"),
]
FALLBACK_ICONS = ["sparkles", "rocket", "circle-check", "star", "puzzle", "layers"]
COMMON_WORDS = {"square", "signal", "linear", "medium", "notion", "apple", "meta", "stack", "express", "next",
                "swift", "go", "rust", "ruby", "flask", "django", "unity", "slack", "zoom", "bolt", "base", "react native"}


def sh(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def icon_for(text, fallback_i=0):
    low = " " + text.lower() + " "
    for keys, ic in ICONS:
        if any(k in low for k in keys):
            return ic
    return FALLBACK_ICONS[fallback_i % len(FALLBACK_ICONS)]


def short(text, n=8):
    w = re.sub(r"[.!?]+$", "", text.strip()).split()
    return " ".join(w[:n]) + ("" if len(w) <= n else "...")


def mark_tail(text, n=2):
    """Wrap the last n words in **...** so the highlighter sweeps over them."""
    text = text.strip()
    w = text.split()
    if len(w) <= n + 1:
        return text
    return " ".join(w[:-n]) + " **" + " ".join(w[-n:]) + "**"


def load_brands(proj):
    """slug -> title for every simple-icons brand, read from the installed package."""
    js = "const si=require('simple-icons');console.log(JSON.stringify(Object.values(si).filter(i=>i&&i.slug).map(i=>[i.slug,i.title])))"
    out = subprocess.run(["node", "-e", js], cwd=proj, capture_output=True, text=True)
    try:
        return dict(json.loads(out.stdout))
    except Exception:
        return {}


def find_brands(text, brands):
    found = []
    for slug, title in brands.items():
        if title.lower() in COMMON_WORDS or len(title) < 3:
            continue
        # whole-word, case-insensitive; the title may contain spaces or dots
        if re.search(r"(?<![A-Za-z0-9])" + re.escape(title) + r"(?![A-Za-z0-9])", text, re.I):
            found.append((text.lower().find(title.lower()), slug))
    found.sort()
    seen, out = set(), []
    for _, s in found:
        if s not in seen:
            seen.add(s); out.append(s)
    return out


def group_captions(caps, target):
    groups, cur = [], []
    for c in caps:
        cur.append(c)
        if cur[-1]["end"] - cur[0]["start"] >= target:
            groups.append(cur); cur = []
    if cur:
        if groups and cur[-1]["end"] - cur[0]["start"] < target * 0.5:
            groups[-1].extend(cur)
        else:
            groups.append(cur)
    return groups


def auto_scenes(caps, args, brands):
    groups = group_captions(caps, args.scene_len)
    if len(groups) < 2:  # need a title and an outro at least
        mid = max(1, len(caps) // 2)
        groups = [caps[:mid], caps[mid:]] if len(caps) > 1 else [caps, caps]
    scenes, accents = [], ["mint", "blue", "pink", "lav", "sun"]
    for i, g in enumerate(groups):
        text = " ".join(c["text"] for c in g)
        base = {"id": f"s{i+1}", "start": g[0]["start"], "end": g[-1]["end"], "accent": accents[i % 5]}
        if i == 0:
            title = args.title or g[0]["text"]
            scenes.append({**base, "layout": "title", "title": mark_tail(short(title, 12).rstrip(".")) if not args.title else args.title,
                           **({"subtitle": args.subtitle} if args.subtitle else ({"subtitle": short(" ".join(c["text"] for c in g[1:]), 9)} if len(g) > 1 else {}))})
            continue
        if i == len(groups) - 1:
            last = g[-1]["text"]
            scenes.append({**base, "layout": "outro", "title": mark_tail(short(last, 8).rstrip(".")),
                           "tagline": args.tagline or "", "cta": args.cta or "Get started",
                           **({"url": args.url} if args.url else {})})
            scenes[-1] = {k: v for k, v in scenes[-1].items() if v != ""}
            continue
        bs = find_brands(text, brands)
        num = re.search(r"(\d[\d,.]*\s?(?:%|x|k|m|\+)?)", text)
        parts = [p.strip(" .") for p in re.split(r",|\band\b|;", text) if p.strip(" .")]
        eyebrow = None
        if len(bs) >= 2:
            scenes.append({**base, "layout": "logos", "title": mark_tail(short(g[0]["text"], 6).rstrip(".")) if len(g) > 1 else None,
                           "items": [{"brand": b} for b in bs[:6]]})
            if scenes[-1]["title"] is None: del scenes[-1]["title"]
        elif num and len(text.split()) <= 18:
            val = num.group(1).strip()
            label = re.sub(re.escape(num.group(1)), "", text, count=1).strip(" .,")
            scenes.append({**base, "layout": "stat", "value": val, "label": short(label, 7) or "highlight"})
        elif len(parts) >= 3 and all(len(p.split()) <= 6 for p in parts) and len(g) <= 2:
            scenes.append({**base, "layout": "bullets", "items": [{"text": p[0].upper() + p[1:], "icon": icon_for(p, j), "anim": ["pop", "bounce", "wiggle", "pulse"][j % 4]} for j, p in enumerate(parts[:5])]})
        elif len(g) >= 2:
            lay = "features" if len(g) <= 3 else "bullets"
            if lay == "features":
                items = [{"icon": icon_for(c["text"], j), "title": short(c["text"], 4), **({"text": short(c["text"], 12)} if len(c["text"].split()) > 5 else {}),
                          "anim": ["bounce", "wiggle", "float", "pulse"][j % 4]} for j, c in enumerate(g)]
                scenes.append({**base, "layout": "features", "items": items})
            else:
                scenes.append({**base, "layout": "bullets", "items": [{"text": short(c["text"], 9), "icon": icon_for(c["text"], j), "anim": "pop"} for j, c in enumerate(g[:5])]})
        else:
            scenes.append({**base, "layout": "quote", "text": mark_tail(g[0]["text"]) if False else g[0]["text"]})
    # never the same layout three times in a row: swap the middle one to bullets-with-icons
    for k in range(2, len(scenes) - 1):
        if scenes[k]["layout"] == scenes[k - 1]["layout"] == scenes[k - 2]["layout"] == "quote":
            scenes[k] = {**scenes[k], "layout": "bullets", "items": [{"text": short(scenes[k]["text"], 9), "icon": icon_for(scenes[k]["text"])}]}
            del scenes[k]["text"]
    return scenes


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--job")
    ap.add_argument("--audio"); ap.add_argument("--captions"); ap.add_argument("--out")
    ap.add_argument("--title"); ap.add_argument("--subtitle"); ap.add_argument("--tagline")
    ap.add_argument("--aspect", default="16:9", choices=["16:9", "9:16", "1:1"])
    ap.add_argument("--theme", default=None, choices=["light", "dark"])
    ap.add_argument("--brand-theme", dest="brand_theme", default=None, choices=["handson", "channel"])
    ap.add_argument("--audience", default=None, choices=["everyone", "expert"])
    ap.add_argument("--brand"); ap.add_argument("--brand-mark", dest="brand_mark")
    ap.add_argument("--no-topbar", action="store_true"); ap.add_argument("--no-captions", action="store_true")
    ap.add_argument("--mascot", action="store_true")
    ap.add_argument("--sfx", default="minimal"); ap.add_argument("--sfx-volume", dest="sfx_volume", type=float, default=0.9)
    ap.add_argument("--cta"); ap.add_argument("--url")
    ap.add_argument("--scene-len", dest="scene_len", type=float, default=5.0)
    ap.add_argument("--scenes"); ap.add_argument("--low", action="store_true")
    ap.add_argument("--work", default=os.path.expanduser("~/.cache/caption-to-video/work"))
    ap.add_argument("--dry-run", action="store_true", dest="dry_run")
    args = ap.parse_args()
    if args.job:  # job file fills any option not given on the command line
        job = json.load(open(args.job, encoding="utf-8"))
        for k, v in job.items():
            k = k.replace("-", "_")
            if hasattr(args, k) and getattr(args, k) in (None, False, ap.get_default(k)):
                setattr(args, k, v)
    for need in ("audio", "captions", "out"):
        if not getattr(args, need):
            sys.exit(f"missing --{need}")
    if args.aspect == "9:16" and args.scene_len == 5.0:
        pass

    proj = Path(args.work).resolve()
    first = not (proj / "package.json").exists()
    proj.mkdir(parents=True, exist_ok=True)
    # Always refresh code from the skill template (so skill updates apply); keep node_modules, public/ and data/.
    for sub in ("src", "public/fonts"):
        shutil.copytree(TEMPLATE / sub, proj / sub, dirs_exist_ok=True)
    for f in ("package.json", "tsconfig.json"):
        shutil.copy(TEMPLATE / f, proj / f)
    # Install on the first run, and again whenever the template's dependency list changed (a no-op otherwise).
    stamp = proj / "node_modules" / ".ctv-package.json"
    want = (proj / "package.json").read_text()
    if not stamp.exists() or stamp.read_text() != want:
        print("Installing packages (about 30 s; only when dependencies change)...", flush=True)
        sh(["npm", "install", "--no-audit", "--no-fund", "--loglevel=error"], cwd=proj)
        stamp.write_text(want)

    # Sound effects: copy the cues the template uses from the installed uisfx package into public/sfx/.
    sfx_meta = "off"
    sfx_dir = proj / "public" / "sfx"
    shutil.rmtree(sfx_dir, ignore_errors=True)
    if args.sfx and args.sfx != "off":
        src = proj / "node_modules" / "uisfx" / "sounds" / args.sfx
        if not src.is_dir():
            print(f"warning: sound pack '{args.sfx}' not found, sound effects are off")
        else:
            sfx_dir.mkdir(parents=True)
            for cue in SFX_CUES:
                shutil.copy(src / f"{cue}.mp3", sfx_dir / f"{cue}.mp3")
            sfx_meta = {"pack": args.sfx, "volume": args.sfx_volume}

    audio = Path(args.audio)
    ext = audio.suffix or ".mp3"
    for old in (proj / "public").glob("audio.*"):
        old.unlink()
    shutil.copy(audio, proj / "public" / f"audio{ext}")
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(audio)], capture_output=True, text=True).stdout.strip() or 0)

    capjson = proj / "src" / "data" / "captions.json"
    sh([sys.executable, str(SCRIPTS / "parse_captions.py"), args.captions, str(capjson)])
    caps = json.load(open(capjson, encoding="utf-8"))
    if dur and abs(caps[-1]["end"] - dur) > 1:
        print(f"note: captions end at {caps[-1]['end']:.1f}s but the audio is {dur:.1f}s")

    if args.scenes:
        given = json.load(open(args.scenes, encoding="utf-8"))
        scenes = given["scenes"] if isinstance(given, dict) else given
    else:
        scenes = auto_scenes(caps, args, load_brands(proj))
    file_meta = given.get("meta", {}) if args.scenes and isinstance(given, dict) else {}
    brand_theme = args.brand_theme or file_meta.get("brandTheme") or "handson"
    theme = args.theme or file_meta.get("theme")
    schema = json.load(open(TEMPLATE.parent / "channel-schema.json", encoding="utf-8"))
    bad = [f"{x.get('id', '?')}: {x.get('layout')}" for x in scenes if brand_theme not in schema["layouts"].get(x.get("layout"), {"brands": []})["brands"]]
    if bad:
        sys.exit(f"these layouts are not available in brand '{brand_theme}': {', '.join(bad)}")
    meta = {"title": args.title or Path(args.out).stem, "duration": scenes[-1]["end"], "aspect": args.aspect, "brandTheme": brand_theme,
            "captions": "off" if args.no_captions else "bar", "mascot": bool(args.mascot), "audio": f"audio{ext}", "sfx": sfx_meta}
    audience = args.audience or file_meta.get("audience")
    if audience: meta["audience"] = audience
    if theme: meta["theme"] = theme
    if args.brand: meta["brand"] = {"name": args.brand, **({"mark": args.brand_mark} if args.brand_mark else {})}
    if args.no_topbar: meta["topbar"] = False
    sf = proj / "src" / "data" / "scenes.json"
    json.dump({"meta": meta, "scenes": scenes}, open(sf, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    r = subprocess.run([sys.executable, str(SCRIPTS / "check_scenes.py"), str(sf), str(capjson)])
    if r.returncode:
        sys.exit("scene check failed, see ERROR lines above (scenes.json is at %s)" % sf)
    print("Scenes:", ", ".join(f"{s['id']}:{s['layout']}" for s in scenes), flush=True)
    if args.dry_run:
        print("dry run, scenes written to", sf); return
    out = Path(args.out).resolve(); out.parent.mkdir(parents=True, exist_ok=True)
    sh(["bash", str(SCRIPTS / "render.sh"), str(proj), str(out)] + (["--low"] if args.low else []))
    print("DONE", out)


if __name__ == "__main__":
    main()
