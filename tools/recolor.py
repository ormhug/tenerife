"""v40 recolor: warm cream/clay palette -> "Basalt & Lava".

Every colour literal in the site CSS is moved in HSL space, keeping its
lightness (so contrast relationships survive):
  * neutrals and pastels (chroma < .16)  -> cool stone grey (hue 200, S <= 7.5 %)
  * warm saturated colours           -> rust (hue 16), the single accent
  * cool saturated colours           -> same hue, muted to S 25 %
Run once from the tenerife-travel folder:  python tools/recolor.py src
"""
import colorsys, glob, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'src'
HEX = re.compile(r'#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b')
RGB = re.compile(r'rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)')


def shift(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    deg = h * 360
    chroma = (max(r, g, b) - min(r, g, b)) / 255
    # Chroma, not HLS saturation: pale creams have a high S but almost no colour.
    if chroma < .16 or l > .96 or l < .04:
        h2, s2 = 200 / 360, min(s, .30) * .25
    elif deg < 70 or deg > 320:
        h2, s2 = 16 / 360, min(max(s, .45), .70)
    else:
        h2, s2 = h, min(s, .25)
    r2, g2, b2 = colorsys.hls_to_rgb(h2, l, s2)
    return round(r2 * 255), round(g2 * 255), round(b2 * 255)


def hex_sub(m):
    v = m.group(1)
    if len(v) in (3, 4):
        v = ''.join(c * 2 for c in v)
    r, g, b = int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16)
    a = v[6:8] if len(v) == 8 else ''
    r, g, b = shift(r, g, b)
    return f'#{r:02x}{g:02x}{b:02x}{a}'


def rgb_sub(m):
    r, g, b = (float(m.group(i)) for i in (1, 2, 3))
    r, g, b = shift(r, g, b)
    a = m.group(4)
    return f'rgba({r}, {g}, {b}, {a})' if a is not None else f'rgb({r}, {g}, {b})'


changed = 0
for path in glob.glob(f'{ROOT}/*.css'):
    text = open(path, encoding='utf-8').read()
    # Leave data: URIs alone (inline SVG colours are percent-encoded anyway).
    parts = re.split(r'(url\([^)]*\))', text)
    out = []
    for part in parts:
        if part.startswith('url('):
            out.append(part)
        else:
            out.append(RGB.sub(rgb_sub, HEX.sub(hex_sub, part)))
    new = ''.join(out)
    if new != text:
        changed += 1
        open(path, 'w', encoding='utf-8').write(new)
print('recoloured files:', changed)
