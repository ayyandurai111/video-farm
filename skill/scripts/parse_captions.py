#!/usr/bin/env python3
"""Turn .srt / .vtt / .json captions into captions.json: [{id,start,end,text,words?}] (seconds).
Usage: parse_captions.py INPUT OUTPUT.json
JSON input may already be a list of {start,end,text[,words]} (seconds or milliseconds)."""
import json, re, sys

def ts(s):
    s = s.strip().replace(",", ".")
    parts = s.split(":")
    parts = [float(p) for p in parts]
    while len(parts) < 3:
        parts.insert(0, 0.0)
    h, m, sec = parts
    return round(h * 3600 + m * 60 + sec, 3)

def parse_srt_vtt(text):
    text = text.replace("\r", "").lstrip("\ufeff")
    blocks = re.split(r"\n\s*\n", text.strip())
    out = []
    for b in blocks:
        lines = [l for l in b.split("\n") if l.strip()]
        for i, l in enumerate(lines):
            if "-->" in l:
                a, b2 = l.split("-->")
                body = " ".join(lines[i + 1:])
                body = re.sub(r"<[^>]+>", "", body).strip()
                if body:
                    out.append({"start": ts(a), "end": ts(b2.split()[0]), "text": body})
                break
    return out

def parse_json(text):
    data = json.loads(text)
    if isinstance(data, dict):
        data = data.get("captions") or data.get("segments") or []
    out = []
    for d in data:
        s, e = float(d["start"]), float(d["end"])
        ms = max(s, e) > 100000  # milliseconds
        k = 0.001 if ms else 1
        item = {"start": round(s * k, 3), "end": round(e * k, 3), "text": str(d.get("text", "")).strip()}
        if d.get("words"):
            item["words"] = [{"text": w.get("text") or w.get("word"), "start": round(float(w["start"]) * k, 3), "end": round(float(w["end"]) * k, 3)} for w in d["words"]]
        if item["text"]:
            out.append(item)
    return out

def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, dst = sys.argv[1], sys.argv[2]
    raw = open(src, encoding="utf-8").read()
    caps = parse_json(raw) if src.lower().endswith(".json") else parse_srt_vtt(raw)
    caps.sort(key=lambda c: c["start"])
    for i, c in enumerate(caps):
        c["id"] = i + 1
        if c["end"] <= c["start"]:
            c["end"] = round(c["start"] + 1.0, 3)
    json.dump(caps, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"{len(caps)} captions, {caps[0]['start']}s to {caps[-1]['end']}s -> {dst}")

main()
