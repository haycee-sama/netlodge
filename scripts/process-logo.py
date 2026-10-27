#!/usr/bin/env python3
"""
Process the NetLodge logo SVG into themeable variants.

Source: /home/z/my-project/upload/file.svg
Outputs:
  - /home/z/my-project/public/netlodge-logo.svg       (full logo, themeable via currentColor)
  - /home/z/my-project/public/netlodge-mark.svg        (just the green "N" mark, for favicons & compact spaces)

Strategy:
  1. Strip the Adobe XMP metadata block.
  2. Remove the giant white background rectangle (the first #FEFEFE path that spans the canvas).
  3. Replace every dark-navy fill (#0B1D22, #0B1E23, #212E34, #253238, #1D2C31) with
     `currentColor` so the wordmark + tagline inherit the surrounding text color
     (dark in light mode, light in dark mode).
  4. Keep the green gradient paths and white highlight paths as-is — they read well
     on both light and dark backgrounds.
  5. For the mark-only variant, crop the viewBox to the "N" mark region (approx
     x: 200-545, y: 250-595) and keep only paths whose coordinates fall in that region.
"""

import re
from pathlib import Path

SRC = Path("/home/z/my-project/upload/file.svg")
OUT_DIR = Path("/home/z/my-project/public")

DARK_NAVY_COLORS = {"#0B1D22", "#0B1E23", "#212E34", "#253238", "#1D2C31"}

# Mark region (the green "N" ribbon) — measured from the source SVG coordinates.
# The mark sits in the left third of the 1774x887 canvas.
MARK_X_MIN, MARK_X_MAX = 200, 545
MARK_Y_MIN, MARK_Y_MAX = 250, 595


def strip_metadata(svg: str) -> str:
    """Remove the <metadata>...</metadata> block."""
    return re.sub(r"<metadata>.*?</metadata>", "", svg, flags=re.DOTALL)


def split_paths(svg: str) -> tuple[str, list[str]]:
    """Return (header, [path_strings]) where each path_string includes the <path ... /> tag."""
    svg_open_match = re.match(r"(<svg[^>]*>)", svg)
    if not svg_open_match:
        raise ValueError("Could not find <svg> opening tag")
    header = svg_open_match.group(1)

    path_pattern = re.compile(r'<path\s+fill="([^"]+)"[^>]*?>\s*</path>', re.DOTALL)
    paths = [m.group(0) for m in path_pattern.finditer(svg)]

    return header, paths


def is_background_rect(path: str) -> bool:
    """Detect the giant white background rectangle path."""
    return '#FEFEFE' in path and "888.000000" in path and "1775.000000" in path


def replace_dark_with_current(path: str) -> str:
    """Replace dark navy fills with currentColor."""
    result = path
    for color in DARK_NAVY_COLORS:
        result = result.replace(f'fill="{color}"', 'fill="currentColor"')
    return result


def path_start_coords(path: str) -> tuple[float, float]:
    """Extract the first M (moveto) coordinate from a path's d attribute."""
    d_match = re.search(r'd="\s*M\s*([\d.]+),\s*([\d.]+)', path)
    if not d_match:
        return (float("inf"), float("inf"))
    return (float(d_match.group(1)), float(d_match.group(2)))


def build_full_logo(header: str, paths: list[str]) -> str:
    """Build the full themeable logo SVG."""
    body_paths = [p for p in paths if not is_background_rect(p)]
    body_paths = [replace_dark_with_current(p) for p in body_paths]
    # Rewrite the <svg> tag: keep viewBox, drop fixed width/height/id/enable-background
    # so the logo scales fluidly via CSS. The original aspect ratio is 1774:887.
    new_header = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1774 887" role="img" aria-label="NetLodge">'
    return new_header + "".join(body_paths) + "</svg>"


def build_mark_only(header: str, paths: list[str]) -> str:
    """Build the mark-only SVG (just the green "N" ribbon)."""
    mark_paths = []
    for p in paths:
        if is_background_rect(p):
            continue
        if any(c in p for c in DARK_NAVY_COLORS):
            continue
        x, y = path_start_coords(p)
        if MARK_X_MIN <= x <= MARK_X_MAX and MARK_Y_MIN <= y <= MARK_Y_MAX:
            mark_paths.append(p)

    pad = 20
    vb_x = MARK_X_MIN - pad
    vb_y = MARK_Y_MIN - pad
    vb_w = (MARK_X_MAX - MARK_X_MIN) + (pad * 2)
    vb_h = (MARK_Y_MAX - MARK_Y_MIN) + (pad * 2)

    new_header = re.sub(
        r'<svg[^>]*>',
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb_x} {vb_y} {vb_w} {vb_h}">',
        header,
        count=1,
    )

    return new_header + "".join(mark_paths) + "</svg>"


def main():
    svg = SRC.read_text()
    svg = strip_metadata(svg)
    header, paths = split_paths(svg)

    print(f"Total paths in source: {len(paths)}")
    bg_count = sum(1 for p in paths if is_background_rect(p))
    print(f"Background rects removed: {bg_count}")

    full_logo = build_full_logo(header, paths)
    (OUT_DIR / "netlodge-logo.svg").write_text(full_logo)
    print(f"Wrote netlodge-logo.svg ({len(full_logo)} bytes)")

    mark_only = build_mark_only(header, paths)
    (OUT_DIR / "netlodge-mark.svg").write_text(mark_only)
    print(f"Wrote netlodge-mark.svg ({len(mark_only)} bytes)")

    full_path_count = full_logo.count("<path")
    mark_path_count = mark_only.count("<path")
    print(f"  full logo paths: {full_path_count}")
    print(f"  mark-only paths: {mark_path_count}")


if __name__ == "__main__":
    main()
