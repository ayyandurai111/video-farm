#!/usr/bin/env python3
"""Turn a render-api dispatch payload into a normal job folder (used by .github/workflows/render-api.yml).
Env: JOB_ID (a-z0-9-, 4 to 40 chars), PAYLOAD (JSON: {captions, scenes, options}).
Writes jobs/<JOB_ID>/{captions.srt|captions.json, scenes.json?, audio.mp3 (silence), job.json}.
The audio is silence as long as the captions: the render carries only sound effects, the user's own audio is mixed in afterwards."""
import json, os, re, subprocess, sys, tempfile
from pathlib import Path

ALLOWED = {"aspect", "theme", "brand_theme", "audience", "brand", "brand_mark", "title", "subtitle", "tagline", "cta", "url", "sfx", "sfx_volume",
           "scene_len", "no_topbar", "no_captions", "mascot"}
HERE = Path(__file__).resolve().parent

jid = os.environ.get("JOB_ID", "")
if not re.fullmatch(r"[a-z0-9-]{4,40}", jid):
    sys.exit("bad JOB_ID")
p = json.loads(os.environ["PAYLOAD"])
jd = Path("jobs") / jid; jd.mkdir(parents=True, exist_ok=True)

caps = p["captions"]
if isinstance(caps, str):
    cf = jd / "captions.srt"; cf.write_text(caps, encoding="utf-8")
else:
    cf = jd / "captions.json"; cf.write_text(json.dumps(caps, ensure_ascii=False), encoding="utf-8")

tmp = Path(tempfile.mkdtemp()) / "c.json"
subprocess.run([sys.executable, str(HERE / "parse_captions.py"), str(cf), str(tmp)], check=True)
end = json.load(open(tmp, encoding="utf-8"))[-1]["end"]

job = {"captions": str(cf)}
sc = p.get("scenes")
if sc:
    sf = jd / "scenes.json"; sf.write_text(json.dumps({"scenes": sc} if isinstance(sc, list) else sc, ensure_ascii=False), encoding="utf-8")
    job["scenes"] = str(sf)
audio = jd / "audio.mp3"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", f"{end + 0.5:.2f}", "-q:a", "9", str(audio)], check=True)
job["audio"] = str(audio)
for k, v in (p.get("options") or {}).items():
    k = k.replace("-", "_")
    if k in ALLOWED:
        job[k] = v
job.setdefault("sfx", "minimal")
(jd / "job.json").write_text(json.dumps(job, indent=1, ensure_ascii=False))
print(f"job {jid}: captions end {end}s, options {sorted(k for k in job if k in ALLOWED)}")
