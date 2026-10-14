#!/bin/bash
# 車の3Dモデルを作って圧縮し、assets/cars/ に置く。
# 必要なもの: pip install bpy（Blender の Python モジュール）、npm で gltfpack（tools/cars で npm install）
set -e
cd "$(dirname "$0")/../.."
TMP=$(mktemp -d)
python3 tools/cars/gen_cars.py "$TMP" "$@" 2>&1 | grep -v "INFO\|^$\|Removed\|ERROR Draco\|ERROR MeshOpt"
GP=tools/cars/node_modules/.bin/gltfpack
[ -x "$GP" ] || { echo "gltfpack がありません：cd tools/cars && npm install"; exit 1; }
for f in "$TMP"/*.glb; do
  k=$(basename "$f" .glb)
  # -cc: meshopt 圧縮、-vpf: 位置は float のまま（量子化の戻しが要らない）、-kn: 名前つきノードを残す（body_0 / light_* の名前で読む）
  "$GP" -i "$f" -o "assets/cars/$k.glb" -cc -vpf -kn >/dev/null
  printf "assets/cars/%s.glb  %s bytes\n" "$k" "$(stat -c %s "assets/cars/$k.glb")"
done
rm -rf "$TMP"
