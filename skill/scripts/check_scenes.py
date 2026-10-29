#!/usr/bin/env python3
"""Check scenes.json against captions.json before rendering.
Usage: check_scenes.py scenes.json captions.json [--brand-theme handson|channel]
The brand comes from --brand-theme, else meta.brandTheme in scenes.json, else "handson". Each brand only has its own layouts.
Fails (exit 1) on: gaps or overlaps between scenes, scenes that do not start where a caption starts, layouts the brand does not have,
missing fields, too many items, unknown simulations, broken formulas, very long text."""
import json, re, sys
from pathlib import Path

SCHEMA = json.load(open(Path(__file__).resolve().parent.parent / "assets" / "channel-schema.json", encoding="utf-8"))
TOL = 0.05
EXPR_OK = re.compile(r"^[0-9a-zA-Z_+\-*/^().,\s]*$")


def tex_problems(tex):
    """Return a list of readable problems in a formula string (balanced braces, known commands)."""
    out, depth = [], 0
    for ch in tex:
        depth += (ch == "{") - (ch == "}")
        if depth < 0:
            break
    if depth != 0:
        out.append("unbalanced { }")
    for c in re.findall(r"\\([a-zA-Z]+)", tex):
        if c not in SCHEMA["tex_commands"]:
            out.append(f"unknown command \\{c}")
    return out


def check_channel(s, sid, errs, warns):
    lay = s["layout"]
    for key in ("tex", "equation"):
        if isinstance(s.get(key), str):
            for p in tex_problems(s[key]): errs.append(f"{sid}: formula in '{key}': {p}")
    if lay == "derivation":
        for i, ln in enumerate(s.get("lines", [])):
            t = ln if isinstance(ln, str) else (ln or {}).get("tex")
            if not t: errs.append(f"{sid}: derivation line {i + 1} needs tex")
            else:
                for p in tex_problems(t): errs.append(f"{sid}: derivation line {i + 1}: {p}")
    if lay == "graph":
        for i, se in enumerate(s.get("series", [])):
            if not (se.get("points") or se.get("expr")): errs.append(f"{sid}: graph series {i + 1} needs 'points' or 'expr'")
            if se.get("expr") and not EXPR_OK.match(se["expr"]): errs.append(f"{sid}: graph series {i + 1} expr has characters that are not allowed")
            if se.get("expr") and not s.get("xRange"): warns.append(f"{sid}: graph with 'expr' should set xRange (default 0 to 10)")
            if se.get("color") and se["color"] not in SCHEMA["color_keys"] and not str(se["color"]).startswith("#"):
                warns.append(f"{sid}: unknown colour {se['color']!r}")
    if lay == "freebody":
        for i, f in enumerate(s.get("forces", [])):
            if not isinstance(f.get("angle"), (int, float)) or not isinstance(f.get("mag"), (int, float)) or not f.get("label"):
                errs.append(f"{sid}: force {i + 1} needs label, angle (degrees, 0 = right, 90 = up) and mag (number)")
    if lay in ("analogy",):
        for side in ("left", "right"):
            if not (s.get(side) or {}).get("title"): errs.append(f"{sid}: {side} needs a title")
    if lay == "timeline":
        for i, e in enumerate(s.get("events", [])):
            if not (e.get("year") and e.get("text")): errs.append(f"{sid}: event {i + 1} needs year and text")
    if lay == "units":
        for i, r in enumerate(s.get("rows", [])):
            for k in ("name", "symbol", "unit"):
                if not r.get(k): errs.append(f"{sid}: units row {i + 1} needs '{k}'")
            for k in ("symbol", "unit"):
                for p in tex_problems(r.get(k, "")): errs.append(f"{sid}: units row {i + 1} {k}: {p}")
    if lay == "quantity":
        for k in ("value", "unit", "symbol"):
            if isinstance(s.get(k), str):
                for p in tex_problems(s[k]): errs.append(f"{sid}: quantity {k}: {p}")
    if lay == "sim":
        kind = s.get("sim")
        if kind not in SCHEMA["sims"]:
            errs.append(f"{sid}: unknown simulation {kind!r}. Valid: {', '.join(SCHEMA['sims'])}")
        else:
            known = SCHEMA["sims"][kind]
            for k, v in (s.get("params") or {}).items():
                if k not in known: warns.append(f"{sid}: simulation {kind} has no parameter '{k}' (it has: {', '.join(known)})")
                elif isinstance(known[k], (int, float)) and not isinstance(v, (int, float)): errs.append(f"{sid}: parameter '{k}' must be a number")
            if kind == "wave" and (s.get("params") or {}).get("mode", "travel") not in SCHEMA["wave_modes"]: errs.append(f"{sid}: wave mode must be one of {SCHEMA['wave_modes']}")
            if kind == "circuit" and (s.get("params") or {}).get("mode", "series") not in SCHEMA["circuit_modes"]: errs.append(f"{sid}: circuit mode must be one of {SCHEMA['circuit_modes']}")
            if kind == "incline" and (s.get("params") or {}).get("mu", 0) >= 10: warns.append(f"{sid}: mu is very large")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    brand = None
    if "--brand-theme" in sys.argv: brand = sys.argv[sys.argv.index("--brand-theme") + 1]; args = [a for a in args if a != brand]
    sc = json.load(open(args[0], encoding="utf-8"))
    caps = json.load(open(args[1], encoding="utf-8"))
    scenes, meta = (sc["scenes"], sc.get("meta", {})) if isinstance(sc, dict) else (sc, {})
    brand = brand or meta.get("brandTheme") or "handson"
    errs, warns = [], []
    if brand not in SCHEMA["brands"]:
        errs.append(f"unknown brand theme {brand!r}. Valid: {', '.join(SCHEMA['brands'])}"); brand = "handson"
    mine = {n: d for n, d in SCHEMA["layouts"].items() if brand in d["brands"]}
    starts = {round(c["start"], 2) for c in caps}
    ends = {round(c["end"], 2) for c in caps}
    prev_end = None
    for s in scenes:
        sid = s.get("id", "?")
        lay = s.get("layout")
        if lay not in mine:
            other = SCHEMA["layouts"].get(lay)
            if other: errs.append(f"{sid}: layout {lay!r} is not available in brand {brand!r} (it belongs to the {', '.join(other['brands'])} brand only). Valid: {', '.join(mine)}")
            else: errs.append(f"{sid}: unknown layout {lay!r}. Valid for brand {brand!r}: {', '.join(mine)}")
            prev_end = s.get("end", prev_end); continue
        spec = mine[lay]
        for f in spec["req"]:
            if not s.get(f):
                errs.append(f"{sid}: layout {lay} needs '{f}'")
        if "limit" in spec and len(s.get(spec["limit"][0]) or []) > spec["limit"][1]:
            errs.append(f"{sid}: too many {spec['limit'][0]} for {lay} (max {spec['limit'][1]})")
        if lay in ("equation", "derivation", "graph", "freebody", "quantity", "units", "question", "analogy", "timeline", "sim"):
            check_channel(s, sid, errs, warns)
        if not any(abs(s["start"] - x) <= TOL for x in starts):
            errs.append(f"{sid}: start {s['start']} is not the start of any caption")
        if not any(abs(s["end"] - x) <= TOL for x in ends):
            errs.append(f"{sid}: end {s['end']} is not the end of any caption")
        if prev_end is not None and abs(s["start"] - prev_end) > TOL:
            errs.append(f"{sid}: gap or overlap, previous scene ended at {prev_end}, this one starts at {s['start']}")
        if s["end"] - s["start"] < 1.5:
            warns.append(f"{sid}: very short scene ({s['end'] - s['start']:.1f}s)")
        for key in ("title", "text", "label", "subtitle", "question", "answer"):
            if isinstance(s.get(key), str) and len(s[key]) > 90:
                warns.append(f"{sid}: '{key}' is {len(s[key])} characters, may not fit")
        prev_end = s["end"]
    if scenes:
        if scenes[0]["start"] > TOL:
            warns.append(f"first scene starts at {scenes[0]['start']}s, the video opens with an empty page before it")
        if meta and abs(scenes[-1]["end"] - meta.get("duration", scenes[-1]["end"])) > 0.2:
            errs.append(f"meta.duration {meta['duration']} should equal the last scene end {scenes[-1]['end']}")
    covered = {c["id"] for c in caps if any(s["start"] - TOL <= c["start"] and c["end"] <= s["end"] + TOL for s in scenes)}
    missing = [c["id"] for c in caps if c["id"] not in covered]
    if missing:
        errs.append(f"captions not inside any scene: {missing}")
    for w in warns: print("warn:", w)
    for e in errs: print("ERROR:", e)
    print(f"brand: {brand}")
    print("OK" if not errs else f"{len(errs)} problem(s)")
    sys.exit(1 if errs else 0)

main()
