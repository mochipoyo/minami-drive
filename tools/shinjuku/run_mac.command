#!/bin/bash
# Mac 用：ダブルクリックで shinjuku.json を作る（ダブルクリックで開けないときは README の「ターミナル」の手順で）
cd "$(dirname "$0")"
echo "このフォルダ: $(pwd)"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python3 が見つかりません。https://www.python.org/downloads/ からインストールしてください。"
  read -r -p "Enter で閉じます"; exit 1
fi
ZIP=$(ls -d 13104_shinjuku-ku*citygml* 2>/dev/null | head -1)
if [ -z "$ZIP" ]; then
  echo "PLATEAU の zip がこのフォルダにないので、OpenStreetMap だけで作ります。"
  python3 extract_area.py --out shinjuku.json
else
  echo "PLATEAU のデータ: $ZIP"
  python3 extract_area.py --plateau "$ZIP" --out shinjuku.json
fi
echo
if [ -f shinjuku.json ]; then
  echo "できました: $(pwd)/shinjuku.json  このファイルと、上に出た件数の行をチャットに貼ってください。"
else
  echo "shinjuku.json ができていません。上に出たメッセージを貼ってください。"
fi
read -r -p "Enter で閉じます"
