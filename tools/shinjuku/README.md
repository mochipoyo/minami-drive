# 新宿駅周辺の地図データを用意する

東京の地図「新宿駅周辺」を作るための元データを、手元のパソコンで小さな JSON にまとめる手順です。
この JSON（数 MB）をもとに、ゲームの道路網・建物をこちらで作ります。

## 1. 必要なもの

- Python 3.8 以降（追加のライブラリは不要）
- インターネット接続（OpenStreetMap の Overpass API を使います）
- 任意：国土交通省 PLATEAU の「新宿区（2025）」CityGML の zip（数 GB）
  - ダウンロード：https://www.geospatial.jp/ckan/dataset/plateau-13104-shinjuku-ku-2025 の「CityGML」
  - ファイル名の例：`13104_shinjuku-ku_pref_2025_citygml_1_op.zip`
  - zip は展開しなくてよいです（スクリプトが中から必要な部分だけ読みます）

## 2. 実行

```
cd tools/shinjuku
python3 extract_area.py --selftest                       # まず動作確認（ネットも zip も使いません）
python3 extract_area.py --out shinjuku.json              # OpenStreetMap だけ
python3 extract_area.py --plateau <zipのパス> --out shinjuku.json   # PLATEAU の建物もつける（推奨）
```

- 中心は新宿駅（139.7005, 35.6905）、範囲は中心から 900 m（約 1.8 km 四方）です。`--center` `--half` で変えられます。
- Overpass API は混んでいると数分かかったり、失敗したりします。失敗したら少し待って再実行してください。
- 画面に「OSM: 道路 … 本、建物 … 棟（高さか階数のタグあり … 棟）」「PLATEAU: 建物 … 棟」と出ます。

## 3. 送るもの

できた `shinjuku.json` をチャットに添付してください。画面に出た行（件数）も貼ってもらえると助かります。

## データの出典と利用条件（ゲーム内の「出典」にも載せます）

- OpenStreetMap：© OpenStreetMap contributors。ODbL（出典の表示が必要）
- PLATEAU：国土交通省 Project PLATEAU の 3D都市モデル。CC BY 4.0 等のオープンライセンス（出典の表示が必要。商用利用可）
  - サイトポリシー：https://www.mlit.go.jp/plateau/site-policy/

実在の店名・ロゴは使いません（建物の形と高さ、道路の形だけを使います）。
