#!/usr/bin/env python3
"""Render on GitHub Actions (4 cores on a public repo) instead of locally. Plain git only, no gh token needed.

  remote_build.py --repo-dir /path/to/clone --audio a.mp3 --captions a.srt --scenes scenes.json --out out/video.mp4 \
                  [--aspect 9:16 --theme dark --brand "Name" --sfx minimal --sfx-volume 0.9 --cta ... --url ... --timeout 1500]

What it does: copies the inputs into jobs/<id>/ in the clone, writes jobs/<id>/job.json (same options as build_video.py),
commits and pushes. The workflow in .github/workflows/render.yml renders and pushes a branch result-<id> that holds
video.mp4 (or error.log). This script polls for that branch, saves the file, then deletes the job and the branch.
PUBLIC REPO = everything pushed is public and stays in git history. Do not use it for private audio or scripts."""
import argparse, json, shutil, subprocess, sys, time, uuid
from pathlib import Path

def git(repo, *a, check=True, capture=True):
    r = subprocess.run(["git", "-C", str(repo), *a], capture_output=capture, text=True)
    if check and r.returncode:
        sys.exit(f"git {' '.join(a)} failed:\n{r.stderr or r.stdout}")
    return r

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--repo-dir", required=True)
    ap.add_argument("--audio", required=True); ap.add_argument("--captions", required=True)
    ap.add_argument("--scenes"); ap.add_argument("--out", required=True)
    ap.add_argument("--timeout", type=int, default=1500)
    ap.add_argument("--keep", action="store_true", help="do not delete the job folder and result branch afterwards")
    for o, kw in {"--aspect": {}, "--theme": {}, "--brand": {}, "--brand-mark": {}, "--title": {}, "--subtitle": {}, "--tagline": {},
                  "--cta": {}, "--url": {}, "--sfx": {}, "--sfx-volume": {"type": float}, "--scene-len": {"type": float}}.items():
        ap.add_argument(o, **kw)
    for o in ("--no-topbar", "--no-captions", "--mascot"):
        ap.add_argument(o, action="store_true")
    a = ap.parse_args()

    repo = Path(a.repo_dir).resolve()
    jid = time.strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:4]
    jd = repo / "jobs" / jid; jd.mkdir(parents=True)
    job = {}
    for key in ("audio", "captions", "scenes"):
        v = getattr(a, key)
        if v:
            dst = jd / (key + Path(v).suffix); shutil.copy(v, dst); job[key] = f"jobs/{jid}/{dst.name}"
    for k in ("aspect", "theme", "brand", "brand_mark", "title", "subtitle", "tagline", "cta", "url", "sfx", "sfx_volume", "scene_len"):
        if getattr(a, k) is not None: job[k] = getattr(a, k)
    for k in ("no_topbar", "no_captions", "mascot"):
        if getattr(a, k): job[k] = True
    job["out"] = f"out/{jid}.mp4"  # informational; the workflow chooses the real path
    (jd / "job.json").write_text(json.dumps(job, indent=1, ensure_ascii=False))

    branch = git(repo, "rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
    git(repo, "add", "-A", "jobs"); git(repo, "-c", "user.name=render-client", "-c", "user.email=render@local", "commit", "-qm", f"job {jid}")
    git(repo, "pull", "--rebase", "-q", "origin", branch, check=False)
    git(repo, "push", "-q", "origin", f"HEAD:{branch}")
    print(f"pushed job {jid}; waiting for result-{jid} (timeout {a.timeout}s)", flush=True)

    ref = f"refs/heads/result-{jid}"; t0 = time.time(); ok = False
    while time.time() - t0 < a.timeout:
        if git(repo, "ls-remote", "origin", ref).stdout.strip(): ok = True; break
        time.sleep(10)
    if not ok:
        sys.exit(f"timed out after {a.timeout}s; check the Actions tab of the repo. Job folder jobs/{jid} was left in place.")
    git(repo, "fetch", "-q", "origin", ref)
    out = Path(a.out); out.parent.mkdir(parents=True, exist_ok=True)
    ls = git(repo, "ls-tree", "--name-only", "FETCH_HEAD").stdout.split()
    code = 0
    if "video.mp4" in ls:
        out.write_bytes(subprocess.run(["git", "-C", str(repo), "show", "FETCH_HEAD:video.mp4"], capture_output=True, check=True).stdout)
        print(f"saved {out} ({out.stat().st_size/1e6:.1f} MB) in {time.time()-t0:.0f}s")
    else:
        log = git(repo, "show", "FETCH_HEAD:error.log", check=False).stdout
        print("remote render FAILED. Last log lines:\n" + "\n".join(log.splitlines()[-25:])); code = 1
    if not a.keep:  # remove the inputs from the branch tip and delete the result branch
        git(repo, "rm", "-rq", f"jobs/{jid}"); git(repo, "-c", "user.name=render-client", "-c", "user.email=render@local", "commit", "-qm", f"clean {jid}")
        git(repo, "pull", "--rebase", "-q", "origin", branch, check=False); git(repo, "push", "-q", "origin", f"HEAD:{branch}", check=False)
        git(repo, "push", "-q", "origin", "--delete", f"result-{jid}", check=False)
    sys.exit(code)

if __name__ == "__main__":
    main()
