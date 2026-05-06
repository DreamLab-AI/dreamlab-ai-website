#!/usr/bin/env bash
# optimize-team-portraits.sh — Sprint v9 D11
# ----------------------------------------------------------------------------
# Convert public/data/team/*.png portraits to .webp at quality 80. Skips files
# whose .webp twin is already newer than the .png source (idempotent).
#
# Requirements: cwebp (Debian/Ubuntu: apt install webp; macOS: brew install
# webp). Falls back to ImageMagick `magick convert` if cwebp is unavailable.
#
# Usage:  ./scripts/optimize-team-portraits.sh
#         QUALITY=85 ./scripts/optimize-team-portraits.sh
#
# Output: writes <stem>.webp next to each <stem>.png. Does not delete the
# source PNGs — call sites should be updated to prefer the .webp twin via a
# <picture> element or srcset entry.
# ----------------------------------------------------------------------------

set -euo pipefail

readonly QUALITY="${QUALITY:-80}"
readonly TEAM_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/data/team"

if [[ ! -d "$TEAM_DIR" ]]; then
    echo "ERROR: $TEAM_DIR does not exist" >&2
    exit 1
fi

# Pick encoder.
if command -v cwebp >/dev/null 2>&1; then
    encoder=cwebp
elif command -v magick >/dev/null 2>&1; then
    encoder=magick
elif command -v convert >/dev/null 2>&1; then
    encoder=convert
else
    echo "ERROR: neither cwebp nor ImageMagick (magick/convert) found." >&2
    echo "Install: apt install webp  OR  brew install webp" >&2
    exit 1
fi

echo "Encoder: $encoder | Quality: $QUALITY | Dir: $TEAM_DIR"

shopt -s nullglob
total=0
converted=0
skipped=0

for src in "$TEAM_DIR"/*.png; do
    total=$((total + 1))
    dst="${src%.png}.webp"

    # Skip if .webp newer than .png (idempotent re-run).
    if [[ -f "$dst" && "$dst" -nt "$src" ]]; then
        skipped=$((skipped + 1))
        continue
    fi

    case "$encoder" in
        cwebp)
            cwebp -q "$QUALITY" -quiet "$src" -o "$dst"
            ;;
        magick)
            magick "$src" -quality "$QUALITY" "$dst"
            ;;
        convert)
            convert "$src" -quality "$QUALITY" "$dst"
            ;;
    esac

    src_bytes=$(stat -c%s "$src" 2>/dev/null || stat -f%z "$src")
    dst_bytes=$(stat -c%s "$dst" 2>/dev/null || stat -f%z "$dst")
    pct=$(( 100 - (dst_bytes * 100 / src_bytes) ))
    echo "  $(basename "$src")  ${src_bytes}B → ${dst_bytes}B  (-${pct}%)"
    converted=$((converted + 1))
done

echo ""
echo "Done. total=$total converted=$converted skipped=$skipped"
