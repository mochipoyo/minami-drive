@echo off
chcp 65001 >nul
cd /d "%~dp0"
title shinjuku.json を作る
echo このフォルダ: %cd%
set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY ( where python >nul 2>nul && set "PY=python" )
if not defined PY (
  echo.
  echo Python が見つかりません。https://www.python.org/downloads/ の「Download Python 3.x」からインストールし、
  echo インストール画面の下にある「Add python.exe to PATH」にチェックを入れてください。終わったらもう一度この bat を実行してください。
  pause
  exit /b 1
)
%PY% -c "import sys; assert sys.version_info >= (3, 8), sys.version" >nul 2>nul || (
  echo Python 3.8 以降が必要です。https://www.python.org/downloads/ から新しい版を入れてください。
  pause
  exit /b 1
)
set "ZIP="
for %%f in (13104_shinjuku-ku*citygml*.zip) do set "ZIP=%%f"
if not defined ZIP ( for /d %%f in (13104_shinjuku-ku*citygml*) do set "ZIP=%%f" )
if not defined ZIP (
  echo.
  echo PLATEAU の zip がこのフォルダにないので、OpenStreetMap だけで作ります。
  echo （zip を使うときは、13104_shinjuku-ku_pref_2025_citygml_1_op.zip をこの bat と同じフォルダに置いてください）
  %PY% extract_area.py --out shinjuku.json
) else (
  echo.
  echo PLATEAU のデータ: %ZIP%
  %PY% extract_area.py --plateau "%ZIP%" --out shinjuku.json
)
echo.
if exist shinjuku.json (
  echo できました: %cd%\shinjuku.json  このファイルと、上に出た件数の行をチャットに貼ってください。
) else (
  echo shinjuku.json ができていません。上に出たメッセージを貼ってください。
)
pause
