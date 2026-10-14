# 新宿駅周辺の地図データを用意する

東京の地図「新宿駅周辺」を作るための元データを、手元のパソコンで小さな JSON（`shinjuku.json`、数 MB）にまとめる手順です。
この JSON をもとに、ゲームの道路網・建物をこちらで作ります。

## 1. 必要なもの

- Python 3.8 以降（追加のライブラリは不要）
  - 入っていなければ https://www.python.org/downloads/ の「Download Python 3.x」からインストール。
    Windows はインストール画面の下にある「Add python.exe to PATH」にチェックを入れてください。
- インターネット接続（OpenStreetMap の Overpass API を使います）
- 任意（推奨）：国土交通省 PLATEAU の「新宿区（2025）」CityGML の zip（数 GB）
  - ダウンロード：https://www.geospatial.jp/ckan/dataset/plateau-13104-shinjuku-ku-2025 の「CityGML」
  - ファイル名の例：`13104_shinjuku-ku_pref_2025_citygml_1_op.zip`（Windows では拡張子 `.zip` が隠れていることがあります）
  - zip は展開しなくてよいです（スクリプトが中から必要な部分だけ読みます）。展開済みのフォルダでも使えます

## 2. 実行（いちばん簡単な方法：ダブルクリック）

1. 新しいフォルダを作り、次のファイルを**同じフォルダ**に入れる
   - `extract_area.py`
   - Windows は `run_windows.bat`、Mac は `run_mac.command`
   - PLATEAU の zip（`13104_shinjuku-ku_pref_2025_citygml_1_op.zip`）。なければ OpenStreetMap だけで作ります
2. Windows：`run_windows.bat` をダブルクリック。
   Mac：`run_mac.command` をダブルクリック（「開発元を確認できない」と出たら、右クリック→「開く」）
3. 黒い画面に進み具合が出ます。「OpenStreetMap（Overpass）から取得中…」で 1〜3 分待ちます。
   最後に「できました: …shinjuku.json」と出れば完了です。

## 2′. 実行（ターミナル／コマンドプロンプトで打つ方法）

Mac：「ターミナル」を開き、`cd ` と打ってからフォルダをウィンドウにドラッグして Enter。続けて

```
python3 extract_area.py --selftest                       # まず動作確認（ネットも zip も使いません）
python3 extract_area.py --out shinjuku.json              # OpenStreetMap だけ
python3 extract_area.py --plateau <zipのパス> --out shinjuku.json   # PLATEAU の建物もつける（推奨）
```

`<zipのパス>` は、zip ファイルをターミナルのウィンドウにドラッグすると自動で入ります。

Windows：エクスプローラーでそのフォルダを開き、上のアドレス欄に `cmd` と打って Enter（黒い画面が出ます）。続けて上と同じコマンドを、`python3` の代わりに `py` で打ちます（例：`py extract_area.py --plateau 13104_shinjuku-ku_pref_2025_citygml_1_op.zip --out shinjuku.json`）。

- 中心は新宿駅（139.7005, 35.6905）、範囲は中心から 900 m（約 1.8 km 四方）です。`--center` `--half` で変えられます。
- Overpass API は混んでいると失敗します（`HTTP Error 504` など）。失敗したら自動で別のサーバーに切り替え、少し待って再試行します（最大6回、合計3分ほど）。それでもだめなら時間をおいて再実行してください。
- PLATEAU の zip があるときは、建物は PLATEAU から取り、OpenStreetMap からは道路・鉄道・駅・緑地だけを取ります（軽い問い合わせになります）。OpenStreetMap の建物も欲しいときは `--osm-buildings` を付けます。
- 画面に「OSM: 道路 … 本、建物 … 棟（高さか階数のタグあり … 棟）」「PLATEAU: 建物 … 棟」と出ます。

## 3. 送るもの

できた `shinjuku.json` をチャットに添付してください。画面に出た行（件数）も貼ってもらえると助かります。

## データの出典と利用条件（ゲーム内の「出典」にも載せます）

- OpenStreetMap：© OpenStreetMap contributors。ODbL（出典の表示が必要）
- PLATEAU：国土交通省 Project PLATEAU の 3D都市モデル。CC BY 4.0 等のオープンライセンス（出典の表示が必要。商用利用可）
  - サイトポリシー：https://www.mlit.go.jp/plateau/site-policy/

実在の店名・ロゴは使いません（建物の形と高さ、道路の形だけを使います）。
