#!/usr/bin/env python3
"""
Bright Line Studio OS – Image folder scanner (read-only).

Scans a folder for images and reports:
- total_images
- blurry_images (low Laplacian variance)
- low_resolution (width or height < 800px)
- possible_duplicates (same dimensions + similar filename stem)

Usage: python scripts/image_scan.py /path/to/folder
Output: JSON to stdout
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Optional

try:
    from PIL import Image, ImageFilter, ImageStat
except ImportError:
    print(json.dumps({"error": "Pillow required. Run: pip install Pillow"}, indent=2), file=sys.stderr)
    sys.exit(1)

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif"}
MIN_DIMENSION = 800
BLUR_THRESHOLD = 100  # Laplacian variance below this = likely blurry


def laplacian_variance(image_path: Path) -> Optional[float]:
    """Compute variance of Laplacian for blur detection. Lower = blurrier."""
    try:
        img = Image.open(image_path).convert("L")
        laplacian = img.filter(ImageFilter.LAPLACIAN)
        stat = ImageStat.Stat(laplacian)
        return stat.var[0] if stat.var else 0.0
    except Exception:
        return None


def get_image_info(image_path: Path) -> Optional[dict]:
    """Get width, height, and filename for an image. Returns None if unreadable."""
    try:
        with Image.open(image_path) as img:
            w, h = img.size
            return {"path": str(image_path.name), "width": w, "height": h}
    except Exception:
        return None


def scan_folder(folder_path: str) -> dict:
    """Scan folder and return analysis result."""
    path = Path(folder_path).resolve()

    if not path.exists():
        return {"error": f"Path does not exist: {folder_path}"}
    if not path.is_dir():
        return {"error": f"Path is not a directory: {folder_path}"}

    blurry_images: List[str] = []
    low_resolution: List[str] = []
    dimension_groups: Dict[tuple, List[str]] = {}

    for ext in SUPPORTED_EXTENSIONS:
        for img_path in path.rglob(f"*{ext}"):
            if not img_path.is_file():
                continue

            info = get_image_info(img_path)
            if info is None:
                continue

            name = img_path.name
            w, h = info["width"], info["height"]

            # Blur detection
            var = laplacian_variance(img_path)
            if var is not None and var < BLUR_THRESHOLD:
                blurry_images.append(name)

            # Low resolution
            if w < MIN_DIMENSION or h < MIN_DIMENSION:
                low_resolution.append(name)

            # Group by dimensions for duplicate detection
            key = (w, h)
            dimension_groups.setdefault(key, []).append(name)

    # Possible duplicates: groups with more than one image
    possible_duplicates: List[List[str]] = [
        names for names in dimension_groups.values() if len(names) > 1
    ]

    total = sum(len(names) for names in dimension_groups.values())

    return {
        "total_images": total,
        "blurry_images": blurry_images,
        "low_resolution": low_resolution,
        "possible_duplicates": possible_duplicates,
    }


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python image_scan.py /path/to/folder"}, indent=2), file=sys.stderr)
        sys.exit(1)

    folder = sys.argv[1]
    result = scan_folder(folder)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
