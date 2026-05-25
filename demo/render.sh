#!/usr/bin/env bash
# Build the renderer image (cached) and render the demo to ./out/demo.mp4.
# Usage:
#   ./render.sh                       — full video to out/demo.mp4
#   ./render.sh still 75              — single frame to out/still-75.jpg
#   ./render.sh stills                — one still per scene to out/scene-*.jpg
#   ./render.sh gif [width]           — convert out/demo.mp4 → ../docs/demo.gif
#                                       (default 960px wide, palette-optimised)
set -euo pipefail

IMAGE=catm-demo-renderer
FFMPEG_IMAGE=linuxserver/ffmpeg
cd "$(dirname "$0")"
mkdir -p out

# The gif step only needs ffmpeg, not the Remotion renderer image.
if [ "${1:-}" != "gif" ]; then
  docker build -t "$IMAGE" .
fi

# Frame midpoints for each scene, accounting for 12-frame transition overlap
# between adjacent sequences. Layout:
#   hook        0    – 150   mid 75
#   promise     138  – 288   mid 213
#   privacy     276  – 576   mid 426
#   progressive 564  – 924   mid 744
#   how         912  – 1152  mid 1032
#   cta         1140 – 1320  mid 1236
case "${1:-video}" in
  still)
    frame="${2:-75}"
    docker run --rm \
      -v "$(pwd)":/work \
      -v /work/node_modules \
      "$IMAGE" \
      npx remotion still Demo --frame="$frame" "out/still-${frame}.jpg"
    ;;
  stills)
    for pair in "75:hook" "213:promise" "426:privacy" "744:progressive" "1032:how" "1236:cta"; do
      frame="${pair%%:*}"
      name="${pair##*:}"
      echo "── still: $name (frame $frame) ──"
      docker run --rm \
        -v "$(pwd)":/work \
        -v /work/node_modules \
        "$IMAGE" \
        npx remotion still Demo --frame="$frame" "out/scene-${name}.jpg"
    done
    ;;
  gif)
    width="${2:-960}"
    test -f out/demo.mp4 || { echo "out/demo.mp4 missing — run ./render.sh first"; exit 1; }
    mkdir -p ../docs
    # Mount the repo root so paths can span demo/out → docs/.
    repo_root="$(cd .. && pwd)"
    # Two-pass palette: pass 1 distills the 256 best-fitting colours for this
    # video's content, pass 2 maps frames onto them. Roughly half the file
    # size of a default 256-colour quantisation at the same perceived quality.
    docker run --rm -v "$repo_root":/work -w /work "$FFMPEG_IMAGE" \
      -i demo/out/demo.mp4 \
      -vf "fps=15,scale=${width}:-1:flags=lanczos,palettegen=stats_mode=diff" \
      -y demo/out/palette.png
    docker run --rm -v "$repo_root":/work -w /work "$FFMPEG_IMAGE" \
      -i demo/out/demo.mp4 -i demo/out/palette.png \
      -filter_complex "fps=15,scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
      -loop 0 -y docs/demo.gif
    rm out/palette.png
    echo
    echo "Wrote: $(realpath ../docs/demo.gif)"
    ls -lh ../docs/demo.gif
    exit 0
    ;;
  video|*)
    docker run --rm \
      -v "$(pwd)":/work \
      -v /work/node_modules \
      "$IMAGE" \
      npx remotion render Demo out/demo.mp4
    ;;
esac

echo
echo "Done. Output in: $(pwd)/out"
ls -lh out
