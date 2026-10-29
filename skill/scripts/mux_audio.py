#!/usr/bin/env python3
"""Mix the user's audio into a render that only has sound effects.
Usage: mux_audio.py VIDEO.mp4 AUDIO OUT.mp4 [--audio-gain 1.0]
Keeps the video stream untouched and keeps the effects. No background music is added."""
import argparse, subprocess, sys
ap = argparse.ArgumentParser(); ap.add_argument("video"); ap.add_argument("audio"); ap.add_argument("out")
ap.add_argument("--audio-gain", type=float, default=1.0)
a = ap.parse_args()
has_sfx = "audio" in subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", a.video], capture_output=True, text=True).stdout
if has_sfx:
    flt = f"[1:a]volume={a.audio_gain}[v];[0:a][v]amix=inputs=2:duration=first:normalize=0[a]"
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", a.video, "-i", a.audio, "-filter_complex", flt, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", a.out]
else:
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", a.video, "-i", a.audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", a.out]
sys.exit(subprocess.run(cmd).returncode)
