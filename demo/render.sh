#!/usr/bin/env bash
# Build the renderer image (cached) and render the demo to ./out/demo.mp4
# and ./out/still-*.png for CWS screenshots. Then build the README GIF.
#
# Usage:
#   ./render.sh                  — full pipeline: video, stills, tiles, GIF
#   ./render.sh video            — full video to out/demo.mp4
#   ./render.sh stills           — one PNG per scene to out/still-*.png (overlay off)
#   ./render.sh still <frame>    — single PNG (overlay off) to out/still-<frame>.png
#   ./render.sh tiles            — CWS promo tiles to out/promo-{small,marquee}.png
#   ./render.sh gif [width]      — convert out/demo.mp4 → ../docs/demo.gif
#                                  (default 960px wide, palette-optimised)

set -euo pipefail

IMAGE=catm-demo-renderer
FFMPEG_IMAGE=linuxserver/ffmpeg
cd "$(dirname "$0")"
mkdir -p out

build_image() {
  docker build -t "$IMAGE" .
}

run_remotion() {
  # Bind-mount the repo root so the demo can resolve `@app/*` → ../src.
  # The container's /work/demo/node_modules wins via an anonymous volume.
  docker run --rm \
    -v "$(cd .. && pwd)":/work \
    -v /work/demo/node_modules \
    -w /work/demo \
    "$IMAGE" \
    "$@"
}

# Stills with overlay disabled, one per scene midpoint. Frames must be kept
# in sync with the SCENES timing in src/Demo.tsx.
render_stills() {
  build_image
  for pair in "70:onboarding" "330:sidepanel" "600:voices" "870:fulltab" "1140:privacy"; do
    frame="${pair%%:*}"
    name="${pair##*:}"
    echo "── still: $name (frame $frame) ──"
    run_remotion npx remotion still Demo \
      --frame="$frame" \
      --props='{"overlay":false}' \
      "out/still-${name}.png"
  done
}

case "${1:-all}" in
  video)
    build_image
    run_remotion npx remotion render Demo out/demo.mp4
    ;;
  still)
    build_image
    frame="${2:-330}"
    run_remotion npx remotion still Demo \
      --frame="$frame" \
      --props='{"overlay":false}' \
      "out/still-${frame}.png"
    ;;
  stills)
    render_stills
    ;;
  tiles)
    build_image
    echo "── tile: promo-small (440×280) ──"
    run_remotion npx remotion still PromoSmall --frame=0 out/promo-small.png
    echo "── tile: promo-marquee (1400×560) ──"
    run_remotion npx remotion still PromoMarquee --frame=0 out/promo-marquee.png
    ;;
  gif)
    width="${2:-960}"
    test -f out/demo.mp4 || { echo "out/demo.mp4 missing — run ./render.sh video first"; exit 1; }
    mkdir -p ../docs
    repo_root="$(cd .. && pwd)"
    # Two-pass palette: pass 1 distills 256 best-fitting colours for this
    # video's content, pass 2 maps frames onto them. Roughly half the file
    # size of default 256-colour quantisation at the same perceived quality.
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
    ;;
  all)
    build_image
    run_remotion npx remotion render Demo out/demo.mp4
    render_stills
    echo "── tile: promo-small (440×280) ──"
    run_remotion npx remotion still PromoSmall --frame=0 out/promo-small.png
    echo "── tile: promo-marquee (1400×560) ──"
    run_remotion npx remotion still PromoMarquee --frame=0 out/promo-marquee.png
    "$0" gif
    ;;
  *)
    echo "Unknown command: $1" >&2
    sed -n '2,12p' "$0" >&2
    exit 2
    ;;
esac

echo
echo "Done. Output in: $(pwd)/out"
ls -lh out
