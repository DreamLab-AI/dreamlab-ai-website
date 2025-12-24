#!/bin/bash

# Image Optimization Script for DreamLab AI Website
# This script optimizes PNG images in the public directory

echo "Starting image optimization..."

# Function to optimize PNG files
optimize_png() {
    local dir=$1
    echo "Optimizing PNG files in $dir..."

    find "$dir" -name "*.png" -type f | while read file; do
        # Get original size
        original_size=$(du -h "$file" | cut -f1)

        # Create backup
        cp "$file" "$file.bak"

        # Optimize with pngquant (lossy, quality 70-85)
        if command -v pngquant &> /dev/null; then
            pngquant --quality=70-85 --force --ext .png "$file" 2>/dev/null
        fi

        # Further optimize with optipng (lossless)
        if command -v optipng &> /dev/null; then
            optipng -o2 -quiet "$file" 2>/dev/null
        fi

        # Get new size
        new_size=$(du -h "$file" | cut -f1)

        echo "  $file: $original_size -> $new_size"
    done
}

# Function to convert to WebP
convert_to_webp() {
    local dir=$1
    echo "Converting images to WebP in $dir..."

    find "$dir" -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" | while read file; do
        webp_file="${file%.*}.webp"

        if command -v cwebp &> /dev/null; then
            cwebp -q 80 "$file" -o "$webp_file" 2>/dev/null
            echo "  Created: $webp_file"
        fi
    done
}

# Optimize team member images (largest impact)
if [ -d "public/data/team" ]; then
    optimize_png "public/data/team"
    convert_to_webp "public/data/team"
fi

# Optimize media images
if [ -d "public/data/media" ]; then
    optimize_png "public/data/media"
    convert_to_webp "public/data/media"
fi

# Optimize showcase images
if [ -d "public/showcase" ]; then
    optimize_png "public/showcase"
    convert_to_webp "public/showcase"
fi

echo "Image optimization complete!"
echo ""
echo "To use this script, install the required tools:"
echo "  Ubuntu/Debian: sudo apt-get install pngquant optipng webp"
echo "  macOS: brew install pngquant optipng webp"
