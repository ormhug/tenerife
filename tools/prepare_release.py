"""Build, check and package only the public static site. Does not deploy."""
import hashlib
import re
import subprocess
import sys
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'


class PageReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.files = set()
        self.fragments = set()
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            if attrs['id'] in self.ids:
                raise ValueError(f"Duplicate HTML id: {attrs['id']}")
            self.ids.add(attrs['id'])
        for key in ('href', 'src', 'poster'):
            value = attrs.get(key, '')
            if value.startswith('#'):
                if len(value) > 1:
                    self.fragments.add(value[1:])
            elif value and not re.match(r'^(?:[a-z][a-z0-9+.-]*:|//)', value, re.I):
                self.files.add(value.split('#')[0].split('?')[0])
        for item in attrs.get('srcset', '').split(','):
            if item.strip():
                self.files.add(item.strip().split()[0])


def main():
    subprocess.run([sys.executable, str(ROOT / 'build.py')], cwd=ROOT, check=True)
    for test in ('test_mobile_viewport.cjs', 'test_scroll_handoff.cjs', 'test_scene_widgets.cjs', 'test_carousel_gesture.cjs'):
        subprocess.run(['node', str(ROOT / 'tools' / test)], cwd=ROOT, check=True)

    html = (DIST / 'index.html').read_text(encoding='utf-8')
    refs = PageReferences()
    refs.feed(html)
    missing = refs.fragments - refs.ids
    if missing:
        raise ValueError(f'Missing anchor targets: {sorted(missing)}')
    files = {DIST / 'index.html'}
    for name in refs.files:
        target = (DIST / name).resolve()
        if not target.is_relative_to(DIST.resolve()) or not target.is_file():
            raise ValueError(f'Missing or unsafe public file: {name}')
        files.add(target)
    files.update(path for path in (DIST / 'assets').rglob('*') if path.is_file())
    for path in files:
        if path.suffix == '.js':
            subprocess.run(['node', '--check', str(path)], check=True)
    ordered = sorted(files, key=lambda path: path.relative_to(DIST).as_posix())
    manifest = '\n'.join(
        f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(DIST).as_posix()}'
        for path in ordered
    ) + '\n'
    releases = ROOT / 'releases'
    releases.mkdir(exist_ok=True)
    archive = releases / f'tenerife-travel-v62-{datetime.now():%Y%m%d-%H%M%S}.zip'
    with ZipFile(archive, 'x', ZIP_DEFLATED) as package:
        for path in ordered:
            package.write(path, path.relative_to(DIST).as_posix())
    with ZipFile(archive) as package:
        if package.testzip() is not None or 'index.html' not in package.namelist():
            raise ValueError('Release archive failed validation')
    archive.with_suffix('.sha256.txt').write_text(manifest, encoding='utf-8')
    print(f'Ready: {archive}\n{len(ordered)} public files, {archive.stat().st_size:,} bytes. Nothing published.')


if __name__ == '__main__':
    main()
