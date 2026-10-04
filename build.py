#!/usr/bin/env python3
"""Build Tenerife Travel: src/ -> dist/.

Edit files in src/ (index.html, *.css, *.js, assets/), then run:
    python build.py
dist/ is what gets published. It contains index.html, one CSS bundle,
one JS bundle and the assets. Bundles get a content hash in the file name,
so browsers never keep a stale version after an update.
Only the Python standard library is needed.
"""
import hashlib, re, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC, DIST = ROOT / 'src', ROOT / 'dist'

LOCAL_CSS = re.compile(r'<link rel="stylesheet" href="(?!https?:)([^"?]+\.css)(?:\?[^"]*)?">')
LOCAL_JS = re.compile(r'<script src="(?!https?:)([^"?]+\.js)(?:\?[^"]*)?"( defer)?></script>')
LOCAL_ASSET = re.compile(r'(?<![A-Za-z0-9_/])assets/[A-Za-z0-9_./-]+')
FONT_LICENSES = {
    'bricolage.woff2': 'OFL-bricolage-grotesque.txt',
    'commissioner.woff2': 'OFL-commissioner.txt',
    'onest.woff2': 'OFL-onest.txt',
    'unbounded.woff2': 'OFL-unbounded.txt',
    'yeseva-one.woff2': 'OFL-yesevaone.txt',
}


def minify_css(css: str) -> str:
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    css = re.sub(r'\s+', ' ', css)
    css = re.sub(r'\s*([{};])\s*', r'\1', css)
    css = css.replace(';}', '}')
    return css.strip()


def rebase_css(css: str, css_path: str) -> str:
    """Rewrite relative url(...) so they work from the dist root."""
    base = Path(css_path).parent
    if str(base) in ('', '.'):
        return css

    def fix(m):
        url = m.group(2)
        if re.match(r'^(data:|https?:|/|#)', url):
            return m.group(0)
        return f"url({m.group(1)}{(base / url).as_posix()}{m.group(1)})"
    return re.sub(r'url\((["\']?)([^)"\']+)\1\)', fix, css)


def stamp(text: str) -> str:
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:10]


def production_assets(html: str, css: str, js: str, bundled_files: list[str]) -> set[Path]:
    """Keep assets reachable from the built page, including runtime photo variants.

    Dialogs reuse catalog images. Catalog changes a 900 px filename to its
    1600 px counterpart; the journey dialog selects the same three photos that
    already appear in the page. Keep both resolutions even if an image is only
    referenced through that runtime selection.
    """
    assets = {Path(name) for name in LOCAL_ASSET.findall('\n'.join((html, css, js)))}
    # Source labels in the JS bundle are not additional network dependencies.
    assets.difference_update(Path(file) for file in bundled_files)
    for asset in tuple(assets):
        if asset.name.endswith('-900.webp'):
            variant = asset.with_name(asset.name.replace('-900.webp', '-1600.webp'))
            if (SRC / variant).is_file():
                assets.add(variant)
        if asset.name in FONT_LICENSES:
            assets.add(asset.with_name(FONT_LICENSES[asset.name]))
    # Third-party code is bundled, but its license must travel with the site.
    for file in bundled_files:
        if file.startswith('assets/vendor/'):
            license_path = Path(file).parent / 'LICENSE'
            if (SRC / license_path).is_file():
                assets.add(license_path)
    asset_root = (SRC / 'assets').resolve()
    for asset in assets:
        resolved = (SRC / asset).resolve()
        if not resolved.is_relative_to(asset_root) or not resolved.is_file():
            raise ValueError(f'Missing or unsafe production asset: {asset}')
    return assets


def copy_production_assets(assets: set[Path]) -> int:
    """Replace generated assets only; never modify the source library."""
    destination = (DIST / 'assets').resolve()
    if destination != DIST.resolve() / 'assets':
        raise ValueError(f'Unsafe dist asset directory: {destination}')
    wanted = {(DIST / asset).resolve() for asset in assets}
    if destination.exists():
        for old in destination.rglob('*'):
            if old.is_file() and old.resolve() not in wanted:
                if not old.resolve().is_relative_to(destination):
                    raise ValueError(f'Unsafe stale asset: {old}')
                old.unlink()
    for asset in sorted(assets):
        target = DIST / asset
        if not target.resolve().is_relative_to(destination):
            raise ValueError(f'Unsafe production asset target: {target}')
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SRC / asset, target)
    return sum((SRC / asset).stat().st_size for asset in assets)


def main():
    if DIST.resolve() != ROOT.resolve() / 'dist':
        raise ValueError(f'Unsafe dist directory: {DIST.resolve()}')
    html = (SRC / 'index.html').read_text(encoding='utf-8')
    css_files = LOCAL_CSS.findall(html)
    js_files = [m[0] for m in LOCAL_JS.findall(html)]

    css = '\n'.join(rebase_css((SRC / f).read_text(encoding='utf-8'), f) for f in css_files)
    css = minify_css(css)
    js = '\n;\n'.join(f'/* {f} */\n' + (SRC / f).read_text(encoding='utf-8').strip() for f in js_files)
    # A vendor source-map comment points to the wrong location after bundling.
    js = re.sub(r'^//# sourceMappingURL=.*$', '', js, flags=re.M)

    css_name, js_name = f'site.{stamp(css)}.css', f'site.{stamp(js)}.js'

    first = [True]
    def css_tag(_):
        if first[0]:
            first[0] = False
            return f'<link rel="stylesheet" href="{css_name}">'
        return ''
    html = LOCAL_CSS.sub(css_tag, html)
    first_js = [True]
    def js_tag(_):
        if first_js[0]:
            first_js[0] = False
            return f'<script src="{js_name}" defer></script>'
        return ''
    html = LOCAL_JS.sub(js_tag, html)

    assets = production_assets(html, css, js, css_files + js_files)

    if DIST.exists():
        # dist is generated. Old unbundled CSS/JS are no longer page dependencies.
        for pattern in ('*.css', '*.js'):
            for old in DIST.glob(pattern):
                if not old.resolve().is_relative_to(DIST.resolve()):
                    raise ValueError(f'Unsafe stale bundle: {old}')
                old.unlink()
    DIST.mkdir(exist_ok=True)
    asset_bytes = copy_production_assets(assets)
    (DIST / css_name).write_text(css, encoding='utf-8')
    (DIST / js_name).write_text(js, encoding='utf-8')
    (DIST / 'index.html').write_text(html, encoding='utf-8')
    print(f'{len(css_files)} CSS -> {css_name} ({len(css) // 1024} KB)')
    print(f'{len(js_files)} JS  -> {js_name} ({len(js) // 1024} KB)')
    print(f'{len(assets)} production assets ({asset_bytes // 1024} KB); source originals preserved')


if __name__ == '__main__':
    main()
