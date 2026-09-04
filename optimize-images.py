#!/usr/bin/env python3
"""
Resize and recompress the site's images to the size they are actually displayed at.

The originals in this repository are print-resolution: the navbar logo is
4800x3200 and 11.7 MB, rendered into a 30px-tall slot. Every visitor downloads
all of it before the page settles.

Filenames and extensions are preserved exactly, so the output is a drop-in
replacement and no HTML or CSS needs to change.

Targets below are the CSS display size multiplied by roughly 2 to 2.5, which
covers retina screens with headroom.

Usage:
    python3 tools/optimize-images.py            # writes to optimized/
    python3 tools/optimize-images.py --in-place # overwrites the originals

Requires: pip install pillow
"""

import argparse
import pathlib
import shutil
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required:  pip install pillow")


# name -> (longest edge in px, note)
TARGETS = {
    # Above the fold. These block the first impression, so they matter most.
    "apex-run-logo.PNG":     (180,  "navbar mark, drawn 30px tall"),
    "Apex-run.PNG":          (1100, "hero wordmark, drawn up to 500px wide"),

    # Organiser logos, drawn at most 56px tall
    "icym-logo.PNG":         (200,  "organiser logo"),
    "milagres-college.png":  (200,  "organiser logo"),
    "Munners-club-logo.PNG": (200,  "organiser logo"),

    # Small chrome
    "instagram-logo.png":    (64,   "18px icon"),

    # Distance badges on the event cards, drawn up to 172px tall
    "reels-logo.webp":       (420,  "3K badge"),
    "five-logo.webp":        (420,  "5K badge"),
    "ten-logo.webp":         (420,  "10K badge"),

    # Route map, drawn up to 880px wide and also opened full size
    "roadmap.PNG":           (1400, "route map"),

    # Gallery, drawn up to 290px wide but also opened in the lightbox
    "img1.jpeg":             (900,  "gallery"),
    "img2.jpeg":             (900,  "gallery"),
    "img3.jpeg":             (900,  "gallery"),
    "img4.jpeg":             (900,  "gallery"),
    "img5.jpeg":             (900,  "gallery"),
    "img6.jpeg":             (900,  "gallery"),

    # Highlights strip
    "highlight1.jpeg":       (900,  "highlights"),
    "highlight2.jpeg":       (900,  "highlights"),
    "highlight3.jpeg":       (900,  "highlights"),
    "highlight4.jpeg":       (900,  "highlights"),
    "highlight5.jpeg":       (900,  "highlights"),
    "highlight6.jpeg":       (900,  "highlights"),

    # Payment QRs. Kept deliberately generous and at high quality — a QR that
    # will not scan costs a registration.
    "qr-3k.jpeg":            (700,  "payment QR"),
    "qr-5k.jpeg":            (700,  "payment QR"),
    "qr-10k.jpeg":           (700,  "payment QR"),
}

JPEG_QUALITY = 84
QR_QUALITY   = 94      # QRs get their own, higher setting
WEBP_QUALITY = 86


def human(n):
    return f"{n / 1048576:.2f} MB" if n >= 1048576 else f"{n / 1024:.0f} KB"


def optimize(src: pathlib.Path, out_dir: pathlib.Path, longest: int):
    """
    Returns (dest_path, before_bytes, after_bytes, note).

    Two safety rails:
      · if the result would be larger than the original, the original is kept
      · a PNG with no transparency is re-encoded as JPEG, which for a
        photograph or a map is several times smaller. That one changes the
        file extension, so it is reported and you update the reference.
    """
    image = Image.open(src)
    original = image.size
    before = src.stat().st_size

    if max(image.size) > longest:
        image.thumbnail((longest, longest), Image.LANCZOS)

    suffix = src.suffix.lower()
    is_qr = src.name.startswith("qr-")
    note = ""

    # A PNG only earns its size if it needs the alpha channel.
    opaque_png = suffix == ".png" and image.mode not in ("RGBA", "LA") and (
        image.mode != "P" or "transparency" not in image.info
    )

    if opaque_png:
        dest = out_dir / (src.stem + ".jpeg")
        image.convert("RGB").save(dest, "JPEG", quality=88, optimize=True, progressive=True)
        note = f"RENAME: update references from {src.name} to {dest.name}"

    elif suffix in (".jpg", ".jpeg"):
        dest = out_dir / src.name
        image.convert("RGB").save(
            dest, "JPEG",
            quality=QR_QUALITY if is_qr else JPEG_QUALITY,
            optimize=True, progressive=True,
        )

    elif suffix == ".png":
        dest = out_dir / src.name
        if image.mode not in ("RGBA", "LA", "P"):
            image = image.convert("RGBA")
        image.save(dest, "PNG", optimize=True)

    elif suffix == ".webp":
        dest = out_dir / src.name
        image.save(dest, "WEBP", quality=WEBP_QUALITY, method=6)

    else:
        dest = out_dir / src.name
        shutil.copy2(src, dest)

    after = dest.stat().st_size

    # Already well optimised. Leave it alone rather than making it worse.
    if after >= before and not opaque_png:
        dest.unlink(missing_ok=True)
        if src.resolve() != (out_dir / src.name).resolve():
            shutil.copy2(src, out_dir / src.name)
        print(f"  {src.name:24} {human(before):>9}     already small enough, left alone")
        return out_dir / src.name, before, before, ""

    saved = 100 - (after / before * 100) if before else 0
    resized = f"{original[0]}x{original[1]} -> {image.size[0]}x{image.size[1]}"
    print(f"  {src.name:24} {human(before):>9} -> {human(after):>9}  "
          f"({saved:4.1f}% smaller)  {resized}")
    return dest, before, after, note


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--in-place", action="store_true",
                        help="overwrite the originals instead of writing to optimized/")
    parser.add_argument("--out", default="optimized", help="output folder")
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parent.parent
    out = root / args.out
    out.mkdir(parents=True, exist_ok=True)

    total_before = total_after = 0
    missing, notes = [], []

    for name, (longest, _why) in TARGETS.items():
        src = root / name
        if not src.exists():
            missing.append(name)
            continue

        _dest, before, after, note = optimize(src, out, longest)
        total_before += before
        total_after += after
        if note.startswith("RENAME"):
            notes.append(note)

    if missing:
        print("\nNot found, skipped:", ", ".join(missing))

    saved = total_before - total_after
    pct = 100 - (total_after / total_before * 100) if total_before else 0
    print(f"\n  Total: {human(total_before)} -> {human(total_after)}")
    print(f"  Saved: {human(saved)}  ({pct:.1f}% smaller)")

    if notes:
        print("\nNeeds a reference update:")
        for n in notes:
            print("  -", n)

    if args.in_place:
        for f in out.iterdir():
            shutil.copy2(f, root / f.name)
        shutil.rmtree(out)
        print("\nOriginals overwritten. Old PNGs that became JPEGs are still there; delete them.")
    else:
        print(f"\nFiles are in {out.name}/. Check them, then copy over the originals.")


if __name__ == "__main__":
    main()
