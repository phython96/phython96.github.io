#!/usr/bin/env python3
"""Generate the 1200x630 social preview (Open Graph) cards.

Produces:
    assets/images/og/og-en.png   English card
    assets/images/og/og-zh.png   Chinese card

Run from the repository root:
    python3 tools/make_og_image.py

Renders at 2x and downsamples, which keeps the text crisp.
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "images", "og")
PORTRAIT = os.path.join(ROOT, "assets", "images", "photos", "phd_ava.png")

W, H = 1200, 630
S = 2  # supersample factor

# Palette (light theme, matching the site's purple -> blue accent)
BG_TOP = (255, 255, 255)
BG_BOTTOM = (238, 241, 248)
GRID = (22, 24, 45, 9)
INK = (22, 24, 45)
MUTED = (90, 96, 114)
ACCENT = (77, 107, 254)
ACCENT_ALT = (108, 92, 231)

# Font candidates: (bold, regular) for Latin, (bold, regular) for CJK.
LATIN_BOLD = [
    "/System/Library/Fonts/HelveticaNeue.ttc",  # index 1 = Bold
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
]
LATIN_REG = [
    "/System/Library/Fonts/HelveticaNeue.ttc",  # index 0 = Regular
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]
CJK_BOLD = [
    "/System/Library/Fonts/Hiragino Sans GB.ttc",  # index 2 = W6
    "/System/Library/Fonts/STHeiti Medium.ttc",
]
CJK_REG = [
    "/System/Library/Fonts/Hiragino Sans GB.ttc",  # index 0 = W3
    "/System/Library/Fonts/STHeiti Light.ttc",
]

LATIN_BOLD_INDEX = 1
LATIN_REG_INDEX = 0
CJK_BOLD_INDEX = 2
CJK_REG_INDEX = 0


def load_font(candidates, size, index):
    for path in candidates:
        if not os.path.exists(path):
            continue
        for idx in (index, 0):
            try:
                return ImageFont.truetype(path, size, index=idx)
            except Exception:
                continue
    raise SystemExit(f"No usable font among: {candidates}")


def font(kind, size):
    """kind: 'latin-bold' | 'latin' | 'cjk-bold' | 'cjk'"""
    if kind == "latin-bold":
        return load_font(LATIN_BOLD, size, LATIN_BOLD_INDEX)
    if kind == "latin":
        return load_font(LATIN_REG, size, LATIN_REG_INDEX)
    if kind == "cjk-bold":
        return load_font(CJK_BOLD, size, CJK_BOLD_INDEX)
    return load_font(CJK_REG, size, CJK_REG_INDEX)


def gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", (1, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        px[0, y] = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return img.resize((w, h), Image.BILINEAR)


def draw_grid(img, step):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for x in range(0, img.size[0], step):
        d.line([(x, 0), (x, img.size[1])], fill=GRID, width=1)
    for y in range(0, img.size[1], step):
        d.line([(0, y), (img.size[0], y)], fill=GRID, width=1)
    return Image.alpha_composite(img, layer)


def glow(size, center, radius, color, alpha):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = center
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
              fill=color + (alpha,))
    return layer.filter(ImageFilter.GaussianBlur(radius * 0.35))


def rounded_photo(path, box, radius):
    """Return an RGBA rounded-square portrait with a white border."""
    side = box[2] - box[0]
    img = Image.open(path).convert("RGB")
    # centre-crop to a square
    w, h = img.size
    m = min(w, h)
    img = img.crop(((w - m) // 2, (h - m) // 2, (w - m) // 2 + m, (h - m) // 2 + m))
    img = img.resize((side, side), Image.LANCZOS)

    mask = Image.new("L", (side, side), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, side, side], radius=radius, fill=255)
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)

    border = 10
    bordered = Image.new("RGBA", (side + border * 2, side + border * 2), (0, 0, 0, 0))
    bmask = Image.new("L", bordered.size, 0)
    ImageDraw.Draw(bmask).rounded_rectangle(
        [0, 0, bordered.size[0] - 1, bordered.size[1] - 1], radius=radius + border, fill=255
    )
    bordered.paste(Image.new("RGB", bordered.size, (255, 255, 255)), (0, 0), bmask)
    bordered.alpha_composite(out, (border, border))
    return bordered


def build(lang):
    if lang == "zh":
        heading, sub = "蔡少斐", "Shaofei Cai"
        lines = ["DeepSeek AI · 深度学习研究员", "北京大学 · 人工智能博士"]
        head_font, head_kind = 82, "cjk-bold"
        sub_kind = "latin"
    else:
        heading, sub = "Shaofei Cai", "蔡少斐"
        lines = ["Researcher at DeepSeek AI", "Ph.D. in AI, Peking University"]
        head_font, head_kind = 88, "latin-bold"
        sub_kind = "cjk"

    img = gradient((W * S, H * S), BG_TOP, BG_BOTTOM).convert("RGBA")
    img = draw_grid(img, 44 * S)

    # accent glow behind the portrait
    img = Image.alpha_composite(
        img, glow(img.size, (W * S - 250 * S, H * S // 2), 300 * S, ACCENT_ALT, 46)
    )
    img = Image.alpha_composite(
        img, glow(img.size, (W * S - 180 * S, H * S // 2 + 120 * S), 240 * S, ACCENT, 38)
    )

    d = ImageDraw.Draw(img)

    # ---- portrait (right) ----
    side = 336 * S
    px, py = W * S - side - 96 * S, (H * S - side) // 2
    if os.path.exists(PORTRAIT):
        photo = rounded_photo(PORTRAIT, (px, py, px + side, py + side), 30 * S)
        shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
        smask = Image.new("L", photo.size, 0)
        ImageDraw.Draw(smask).rounded_rectangle(
            [0, 0, photo.size[0] - 1, photo.size[1] - 1], radius=40 * S, fill=110
        )
        shadow.paste(Image.new("RGB", photo.size, (30, 35, 70)), (px - 8 * S, py + 14 * S), smask)
        img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(16 * S)))
        img.alpha_composite(photo, (px, py))
        d = ImageDraw.Draw(img)

    # ---- text (left) ----
    x = 84 * S
    y = 150 * S

    d.text((x, y), heading, font=font(head_kind, head_font * S), fill=INK)
    y += int(head_font * S * 1.18)

    d.text((x, y), sub, font=font(sub_kind, 40 * S), fill=MUTED)
    y += 80 * S

    # accent rule
    d.rounded_rectangle([x, y, x + 76 * S, y + 7 * S], radius=4 * S, fill=ACCENT_ALT)
    y += 44 * S

    cjk_line = lang == "zh"
    for line in lines:
        f = font("cjk" if cjk_line else "latin", 33 * S)
        d.text((x, y), line, font=f, fill=MUTED)
        y += 50 * S

    # ---- footer ----
    d.text((x, H * S - 96 * S), "phython96.github.io",
           font=font("latin-bold", 27 * S), fill=ACCENT)

    return img.convert("RGB").resize((W, H), Image.LANCZOS)


def main():
    if not os.path.exists(PORTRAIT):
        sys.exit(f"Portrait not found: {PORTRAIT}")
    os.makedirs(OUT_DIR, exist_ok=True)
    for lang in ("en", "zh"):
        out = os.path.join(OUT_DIR, f"og-{lang}.png")
        build(lang).save(out, "PNG", optimize=True)
        print(f"wrote {os.path.relpath(out, ROOT)}  ({os.path.getsize(out) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
