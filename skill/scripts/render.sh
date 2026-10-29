#!/usr/bin/env bash
# Render the Remotion project to MP4 and save 4 preview frames.
# Usage: render.sh PROJECT_DIR OUT.mp4 [--low]   (--low = half size, for a quick test)
set -euo pipefail
PROJ="$(cd "$1" && pwd)"; OUT="$(realpath -m "$2")"; LOW="${3:-}"
cd "$PROJ"
[ -d node_modules ] || npm install --no-audit --no-fund --loglevel=error

# Find a browser: Remotion's own download may be blocked, so reuse an installed Chromium.
BROWSER=""
for c in /opt/pw-browsers/chromium-*/chrome-linux/chrome /opt/pw-browsers/chromium-*/chrome-linux64/chrome \
         /usr/bin/chromium /usr/bin/chromium-browser /usr/bin/google-chrome /opt/google/chrome/chrome; do
  [ -x "$c" ] && BROWSER="$c" && break
done
CORES=$(nproc 2>/dev/null || echo 1); CONC=$(( CORES > 4 ? 4 : CORES ))
ARGS=(--concurrency=$CONC)
[ -n "$BROWSER" ] && ARGS+=(--browser-executable="$BROWSER" --chrome-mode=chrome-for-testing)
[ "$LOW" = "--low" ] && ARGS+=(--scale=0.5)

mkdir -p "$(dirname "$OUT")"
npx remotion render src/index.ts Video "$OUT" "${ARGS[@]}"

# Preview frames at 10%, 35%, 60%, 85% so you can look for cut-off text before sending the video.
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
PREV="$(dirname "$OUT")/preview"; mkdir -p "$PREV"
for p in 0.10 0.35 0.60 0.85; do
  T=$(python3 -c "print(round($DUR*$p,2))")
  ffmpeg -v error -y -ss "$T" -i "$OUT" -frames:v 1 "$PREV/frame_${p}.png"
done
echo "Video: $OUT  (${DUR}s)"; echo "Previews: $PREV"
