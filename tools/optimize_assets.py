"""One-off asset optimisation for Tenerife Travel.

Reads original assets from ORIG (the old dist/assets) and writes web-ready
versions into src/assets:
  * fonts  -> subset WOFF2 (Latin + Cyrillic incl. Ukrainian), variable axes
              trimmed to the weights the site actually uses
  * photos -> WebP at 900 / 1600 / 3000 px, tuned quality
Requires: pip install pillow fonttools brotli
"""
import os, sys, shutil
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options
from fontTools.varLib import instancer

ORIG = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(f'{OUT}/fonts', exist_ok=True)

LATIN = list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + [0x131, 0x152, 0x153, 0x2C6, 0x2DA, 0x2DC]
CYR = list(range(0x400, 0x460)) + [0x490, 0x491, 0x4B0, 0x4B1]
PUNCT = list(range(0x2010, 0x2028)) + list(range(0x2030, 0x203B)) + [0x2039, 0x203A, 0x20AC, 0x2116, 0x2122,
         0x2190, 0x2191, 0x2192, 0x2193, 0x2197, 0x2198, 0x2212, 0x2215, 0x00B7]


def font(src, dst, axes=None, codepoints=LATIN + CYR + PUNCT):
    f = TTFont(src)
    opts = Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'case', 'tnum', 'lnum']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = Subsetter(opts)
    sub.populate(unicodes=codepoints)
    sub.subset(f)
    if axes:
        f = instancer.instantiateVariableFont(f, axes, updateFontNames=False)
    f.flavor = 'woff2'
    f.save(dst)
    print(f'{dst}: {os.path.getsize(src)//1024} KB -> {os.path.getsize(dst)//1024} KB')


fonts = f'{ORIG}/fonts'
font(f'{fonts}/onest/Onest[wght].ttf', f'{OUT}/fonts/onest.woff2', {'wght': (300, 750)})
# Brand wordmark only ever uses Latin letters at opsz 96 / wdth 100.
font(f'{fonts}/bricolage-grotesque.ttf', f'{OUT}/fonts/bricolage.woff2',
     {'opsz': 96, 'wdth': 100, 'wght': (700, 800)}, LATIN + PUNCT)
font(f'{fonts}/unbounded/Unbounded[wght].ttf', f'{OUT}/fonts/unbounded.woff2', {'wght': (300, 800)})
font(f'{fonts}/yesevaone/YesevaOne-Regular.ttf', f'{OUT}/fonts/yeseva-one.woff2')
for lic in ['OFL-bricolage-grotesque.txt']:
    shutil.copy(f'{fonts}/{lic}', f'{OUT}/fonts/{lic}')
for name in ['onest', 'unbounded', 'yesevaone']:
    shutil.copy(f'{fonts}/{name}/OFL.txt', f'{OUT}/fonts/OFL-{name}.txt')


def webp(img, dst, width, q):
    im = img
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=q, method=6)
    return os.path.getsize(dst)


photos = {
    # name: source file (largest available)
    'teide-photo': 'teide-photo-3000.webp',
    'coast-photo': 'coast-photo-3000.webp',
    'masca-photo': 'masca-photo-3000.webp',
    'ocean-photo': 'ocean-photo-3000.webp',
}
for name, src in photos.items():
    img = Image.open(f'{ORIG}/{src}').convert('RGB')
    for w, q in [(900, 74), (1600, 72), (3000, 68)]:
        dst = f'{OUT}/{name}-{w}.webp'
        size = webp(img, dst, w, q)
        print(f'{dst}: {size//1024} KB')

singles = {
    'tenerife-quad.jpg': 'tenerife-quad',
    'anaga-forest.jpg': 'anaga-forest',
    'jetski-illustration.jpg': 'jetski-illustration',
    'mustang-illustration.jpg': 'mustang-illustration',
}
for src, name in singles.items():
    img = Image.open(f'{ORIG}/{src}').convert('RGB')
    for w, q in [(900, 74), (1600, 72)]:
        dst = f'{OUT}/{name}-{w}.webp'
        print(f'{dst}: {webp(img, dst, w, q)//1024} KB  (was {os.path.getsize(f"{ORIG}/{src}")//1024} KB)')

for keep in ['brand.svg', 'fine-grain.png']:
    shutil.copy(f'{ORIG}/{keep}', f'{OUT}/{keep}')
shutil.copytree(f'{ORIG}/vendor', f'{OUT}/vendor', dirs_exist_ok=True)
