#!/usr/bin/env python3
"""src/ の中身から index.html を作ります（GitHub Pages でそのまま公開できる1ファイル）。

使い方:  python3 build.py
  - src/head.html … 画面の部品と見た目（CSS）
  - src/js/*.js   … ゲームの処理。ファイル名の順に1つにつなげます
Python 3 の標準機能だけで動きます。
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
THREE_JS = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
# cdnjs から読み込めなかったときの予備（同じ r128）。どちらも読み込めないときは src/js/00_boot.js が理由を表示する
THREE_JS_FALLBACK = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'
DESC = ('無料で遊べるブラウザの3D運転教習ゲーム。架空の町・都会・高速道路から東京・新宿駅周辺まで走り、'
        '日本の交通ルールにそって採点されます。PCとスマートフォンに対応。')
# 公開先（OGP・Twitter Card の URL と画像は絶対 URL が必要）
SITE_URL = 'https://mochipoyo.github.io/minami-drive/'
TITLE = 'みなみ町ドライブ教習'
# SNS で共有したときの画像（assets/ogp.jpg：1200×630）。差し替えたら OGP_VER を上げる（X などのキャッシュを更新させるため）
OGP_IMAGE = 'assets/ogp.jpg'
OGP_VER = '1'
OGP_ALT = 'みなみ町ドライブ教習 ― 無料で遊べる運転教習ゲーム。ブラウザですぐ遊べる・PC・スマホ対応'
TWITTER_SITE = '@mochi_fxtrader'
# タブのアイコン（初心者マークの形をSVGで描いたもの）
ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E"
        "%3Cpath d='M10 6 32 20v38L10 44z' fill='%23f2c200'/%3E"
        "%3Cpath d='M54 6 32 20v38l22-14z' fill='%2300a050'/%3E%3C/svg%3E")

HEAD_META = f'''<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#161b20">
<link rel="canonical" href="{SITE_URL}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{TITLE}">
<meta property="og:locale" content="ja_JP">
<meta property="og:url" content="{SITE_URL}">
<meta property="og:title" content="{TITLE}">
<meta property="og:description" content="{DESC}">
<meta property="og:image" content="{SITE_URL}{OGP_IMAGE}?v={OGP_VER}">
<meta property="og:image:secure_url" content="{SITE_URL}{OGP_IMAGE}?v={OGP_VER}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{OGP_ALT}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="{TWITTER_SITE}">
<meta name="twitter:title" content="{TITLE}">
<meta name="twitter:description" content="{DESC}">
<meta name="twitter:image" content="{SITE_URL}{OGP_IMAGE}?v={OGP_VER}">
<meta name="twitter:image:alt" content="{OGP_ALT}">
<link rel="icon" href="{ICON}">'''


def main():
    head = (ROOT / 'src' / 'head.html').read_text(encoding='utf-8')
    cut = head.index('</style>') + len('</style>')
    head_part, body_part = head[:cut].strip(), head[cut:].strip()
    js_files = sorted((ROOT / 'src' / 'js').glob('*.js'))
    js = '\n'.join(f.read_text(encoding='utf-8') for f in js_files)
    html = (
        '<!doctype html>\n<html lang="ja">\n<head>\n'
        + HEAD_META + '\n' + head_part + '\n</head>\n<body>\n'
        + body_part + '\n'
        + f'<script src="{THREE_JS}"></script>\n'
        + f'<script>window.THREE||document.write(\'<script src="{THREE_JS_FALLBACK}"><\\/script>\')</script>\n'
        + '<script>\n(function(){\n' + js + '\n})();\n</script>\n'
        + '</body>\n</html>\n'
    )
    (ROOT / 'index.html').write_text(html, encoding='utf-8')
    size = len(html.encode('utf-8'))
    print(f'index.html を作りました（{size:,} バイト、JSファイル {len(js_files)} 個）')


if __name__ == '__main__':
    main()
