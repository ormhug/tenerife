"""Create the local Commissioner web font from a supplied licensed TTF folder."""
from pathlib import Path
import shutil
import sys
from fontTools.ttLib import TTFont
from fontTools.subset import Options, Subsetter
from fontTools.varLib.instancer import instantiateVariableFont

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / 'src' / 'assets' / 'fonts'
font = TTFont(next(source.glob('*.ttf')))
letters = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯҐЄІЇ'
required = {ord(c) for c in letters + letters.lower()}
assert required <= font.getBestCmap().keys(), 'Missing Russian/Ukrainian characters'
options = Options()
options.name_IDs = ['*']
subset = Subsetter(options)
subset.populate(unicodes=list(range(0x20, 0x250)) + list(range(0x400, 0x530))
                + list(range(0x2000, 0x2070)) + [0x20ac, 0x2116])
subset.subset(font)
font = instantiateVariableFont(font, {'wght': (400, 650), 'slnt': 0, 'FLAR': 30, 'VOLM': 0})
font.flavor = 'woff2'
font.save(target / 'commissioner.woff2')
shutil.copyfile(source / 'OFL.txt', target / 'OFL-commissioner.txt')
print(f'Commissioner: {(target / "commissioner.woff2").stat().st_size:,} bytes; RU/UK coverage verified')
