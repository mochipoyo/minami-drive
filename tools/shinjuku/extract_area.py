#!/usr/bin/env python3
"""新宿駅周辺の地図データを、ゲーム用の小さな JSON にまとめるスクリプト（手元のパソコンで実行します）。

取り出すもの
  1. 道路の中心線・鉄道（OpenStreetMap。Overpass API から取得。© OpenStreetMap contributors, ODbL）
  2. 建物の形と高さ（国土交通省 PLATEAU の CityGML。手元にダウンロードした zip を読む。CC BY 4.0 等）
     PLATEAU の zip がなければ、OpenStreetMap の建物（高さ・階数のタグがあるもの）だけで出力します。

使い方（Python 3.8 以降。追加のライブラリは不要）
  python3 extract_area.py --out shinjuku.json
  python3 extract_area.py --plateau 13104_shinjuku-ku_pref_2025_citygml_1_op.zip --out shinjuku.json
  python3 extract_area.py --selftest        # ネットも zip も使わず、読み取りの処理だけを確かめる

オプション
  --center LON,LAT   中心（既定：新宿駅 139.7005,35.6905）
  --half M           中心から東西南北に何 m まで取るか（既定 900 → 約1.8km四方）
  --no-osm           OpenStreetMap を使わない

PLATEAU の zip は G空間情報センターの「新宿区（2025）」のページからダウンロードできます（数 GB）。
  https://www.geospatial.jp/ckan/dataset/plateau-13104-shinjuku-ku-2025
zip の中の udx/bldg/ にある、範囲にかかる3次メッシュ（例：53394526）の gml だけを読みます。
"""
import argparse, json, math, os, re, sys, time, zipfile, io
import urllib.request, urllib.parse
import xml.etree.ElementTree as ET

CENTER = (139.7005, 35.6905)  # 新宿駅（おおよそ）
NS = {
    'gml': 'http://www.opengis.net/gml',
    'bldg': 'http://www.opengis.net/citygml/building/2.0',
    'core': 'http://www.opengis.net/citygml/2.0',
    'gen': 'http://www.opengis.net/citygml/generics/2.0',
}


# ---- 座標：経緯度 → 中心からのメートル（x：東、z：南。ゲームの座標と同じ向き） ----
def projector(center):
    lon0, lat0 = center
    kx = 111320.0 * math.cos(math.radians(lat0))
    kz = 110540.0
    return lambda lon, lat: (round((lon - lon0) * kx, 2), round(-(lat - lat0) * kz, 2))


def bbox(center, half):
    lon0, lat0 = center
    dlon = half / (111320.0 * math.cos(math.radians(lat0)))
    dlat = half / 110540.0
    return (lat0 - dlat, lon0 - dlon, lat0 + dlat, lon0 + dlon)  # south, west, north, east


# ---- 3次メッシュ（1km 四方）のコード：PLATEAU の gml ファイル名に使われる ----
def mesh3(lat, lon):
    p = int(lat * 1.5); u = int(lon - 100)
    lat_r = lat * 1.5 - p; lon_r = lon - 100 - u
    q = int(lat_r * 8); v = int(lon_r * 8)
    lat_r2 = lat_r * 8 - q; lon_r2 = lon_r * 8 - v
    r = int(lat_r2 * 10); w = int(lon_r2 * 10)
    return f'{p:02d}{u:02d}{q}{v}{r}{w}'


def meshes_in(bb):
    s, w, n, e = bb
    out = set()
    lat = s
    while lat <= n + 1e-9:
        lon = w
        while lon <= e + 1e-9:
            out.add(mesh3(lat, lon)); lon += 1 / 80 / 2
        lat += 1 / 120 / 2
    out.add(mesh3(n, e))
    return sorted(out)


# ---- OpenStreetMap（Overpass） ----
OVERPASS = 'https://overpass-api.de/api/interpreter'


def overpass(bb, timeout=180):
    s, w, n, e = bb
    q = f"""[out:json][timeout:{timeout}];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|service|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"]({s},{w},{n},{e});
  way["railway"~"^(rail|subway|light_rail|monorail)$"]({s},{w},{n},{e});
  way["building"]({s},{w},{n},{e});
  relation["building"]({s},{w},{n},{e});
  node["railway"="station"]({s},{w},{n},{e});
  way["landuse"~"^(grass|forest|cemetery)$"]({s},{w},{n},{e});
  way["leisure"~"^(park|garden)$"]({s},{w},{n},{e});
);
(._;>;);
out body;"""
    data = urllib.parse.urlencode({'data': q}).encode()
    req = urllib.request.Request(OVERPASS, data=data, headers={'User-Agent': 'minami-drive-extract/1.0'})
    with urllib.request.urlopen(req, timeout=timeout + 60) as r:
        return json.load(r)


def osm_to_layers(osm, proj):
    nodes = {el['id']: (el['lon'], el['lat']) for el in osm['elements'] if el['type'] == 'node'}
    roads, rails, bld, green, stations = [], [], [], [], []
    for el in osm['elements']:
        t = el.get('tags', {})
        if el['type'] == 'node' and t.get('railway') == 'station':
            stations.append({'name': t.get('name', ''), 'xz': proj(el['lon'], el['lat'])})
            continue
        if el['type'] != 'way':
            continue
        pts = [proj(*nodes[n]) for n in el['nodes'] if n in nodes]
        if len(pts) < 2:
            continue
        if 'highway' in t:
            roads.append({'id': el['id'], 'type': t['highway'], 'name': t.get('name', ''), 'lanes': t.get('lanes', ''), 'oneway': t.get('oneway', ''),
                          'layer': t.get('layer', ''), 'bridge': t.get('bridge', ''), 'tunnel': t.get('tunnel', ''), 'maxspeed': t.get('maxspeed', ''), 'ref': t.get('ref', ''), 'pts': pts})
        elif 'railway' in t:
            rails.append({'id': el['id'], 'type': t['railway'], 'name': t.get('name', ''), 'layer': t.get('layer', ''), 'bridge': t.get('bridge', ''), 'tunnel': t.get('tunnel', ''), 'pts': pts})
        elif 'building' in t:
            h = t.get('height', ''); lv = t.get('building:levels', '')
            bld.append({'id': el['id'], 'kind': t.get('building', 'yes'), 'name': t.get('name', ''), 'h': h, 'levels': lv, 'poly': pts})
        elif t.get('landuse') in ('grass', 'forest', 'cemetery') or t.get('leisure') in ('park', 'garden'):
            green.append({'kind': t.get('leisure') or t.get('landuse'), 'name': t.get('name', ''), 'poly': pts})
    return roads, rails, bld, green, stations


# ---- PLATEAU CityGML（建物） ----
def parse_poslist(text):
    v = [float(x) for x in text.split()]
    pts = []
    for i in range(0, len(v) - 2, 3):
        a, b, c = v[i], v[i + 1], v[i + 2]
        # EPSG:6697 は「緯度 経度 高さ」の順。念のため大きさで判断する
        lat, lon = (a, b) if a < 90 else (b, a)
        pts.append((lon, lat, c))
    return pts


def building_from_xml(b, proj, bb):
    """bldg:Building から 高さ・外形（経緯度→m）を取り出す。範囲外なら None"""
    h = None
    mh = b.find('bldg:measuredHeight', NS)
    if mh is not None and mh.text:
        try:
            h = float(mh.text)
        except ValueError:
            h = None
    poly = None
    for tag in ('bldg:lod0RoofEdge', 'bldg:lod0FootPrint'):
        e = b.find(tag, NS)
        if e is not None:
            pl = e.find('.//gml:posList', NS)
            if pl is not None and pl.text:
                poly = parse_poslist(pl.text); break
    if poly is None:
        # LOD1 の立体：いちばん低い面を外形とみなす
        solid = b.find('bldg:lod1Solid', NS)
        if solid is not None:
            best = None
            for pl in solid.findall('.//gml:posList', NS):
                pts = parse_poslist(pl.text or '')
                if len(pts) < 3:
                    continue
                zmin = min(p[2] for p in pts); zmax = max(p[2] for p in pts)
                if abs(zmax - zmin) < 0.05 and (best is None or zmin < best[0]):
                    best = (zmin, pts)
            if best is not None:
                poly = best[1]
                if h is None:
                    zs = [float(z) for pl in solid.findall('.//gml:posList', NS) for z in (parse_poslist(pl.text or '') and [p[2] for p in parse_poslist(pl.text or '')])]
                    if zs:
                        h = round(max(zs) - min(zs), 2)
    if poly is None:
        return None
    s, w, n, e = bb
    lons = [p[0] for p in poly]; lats = [p[1] for p in poly]
    cx, cy = sum(lons) / len(lons), sum(lats) / len(lats)
    if not (w <= cx <= e and s <= cy <= n):
        return None
    pts = [proj(p[0], p[1]) for p in poly]
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    out = {'h': h, 'poly': pts}
    # 名前・用途（あれば）
    name = b.find('gml:name', NS)
    if name is not None and name.text:
        out['name'] = name.text.strip()
    usage = b.find('bldg:usage', NS)
    if usage is not None and usage.text:
        out['usage'] = usage.text.strip()
    storeys = b.find('bldg:storeysAboveGround', NS)
    if storeys is not None and storeys.text:
        out['storeys'] = storeys.text.strip()
    return out


def read_plateau(zip_path, bb, proj, log=print):
    codes = meshes_in(bb)
    log(f'PLATEAU: 範囲にかかる3次メッシュ {codes}')
    out = []
    with zipfile.ZipFile(zip_path) as z:
        names = [n for n in z.namelist() if '/bldg/' in n and n.endswith('.gml')]
        wanted = [n for n in names if any(os.path.basename(n).startswith(c) for c in codes)]
        log(f'PLATEAU: bldg の gml {len(names)} 個のうち、読むのは {len(wanted)} 個')
        for n in wanted:
            t0 = time.time()
            with z.open(n) as f:
                cnt = 0
                for ev, el in ET.iterparse(f, events=('end',)):
                    if el.tag == '{%s}Building' % NS['bldg']:
                        bd = building_from_xml(el, proj, bb)
                        if bd:
                            out.append(bd); cnt += 1
                        el.clear()
            log(f'  {os.path.basename(n)}: {cnt} 棟（{time.time() - t0:.1f}秒）')
    return out


# ---- 自己テスト（ネット・zip なし） ----
SAMPLE_GML = """<?xml version="1.0" encoding="UTF-8"?>
<core:CityModel xmlns:core="http://www.opengis.net/citygml/2.0" xmlns:bldg="http://www.opengis.net/citygml/building/2.0" xmlns:gml="http://www.opengis.net/gml">
 <core:cityObjectMember><bldg:Building gml:id="b1">
  <gml:name>テストビル</gml:name>
  <bldg:usage>411</bldg:usage>
  <bldg:measuredHeight uom="m">31.5</bldg:measuredHeight>
  <bldg:storeysAboveGround>8</bldg:storeysAboveGround>
  <bldg:lod0RoofEdge><gml:MultiSurface><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing>
   <gml:posList>35.6905 139.7005 0 35.6905 139.7010 0 35.6900 139.7010 0 35.6900 139.7005 0 35.6905 139.7005 0</gml:posList>
  </gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></bldg:lod0RoofEdge>
 </bldg:Building></core:cityObjectMember>
 <core:cityObjectMember><bldg:Building gml:id="b2">
  <bldg:lod1Solid><gml:Solid><gml:exterior><gml:CompositeSurface>
   <gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>35.6910 139.7000 5 35.6910 139.7002 5 35.6908 139.7002 5 35.6908 139.7000 5 35.6910 139.7000 5</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember>
   <gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>35.6910 139.7000 17 35.6910 139.7002 17 35.6908 139.7002 17 35.6908 139.7000 17 35.6910 139.7000 17</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember>
  </gml:CompositeSurface></gml:exterior></gml:Solid></bldg:lod1Solid>
 </bldg:Building></core:cityObjectMember>
 <core:cityObjectMember><bldg:Building gml:id="b3_outside">
  <bldg:measuredHeight uom="m">10</bldg:measuredHeight>
  <bldg:lod0RoofEdge><gml:MultiSurface><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing>
   <gml:posList>35.80 139.80 0 35.80 139.81 0 35.79 139.81 0 35.80 139.80 0</gml:posList>
  </gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></bldg:lod0RoofEdge>
 </bldg:Building></core:cityObjectMember>
</core:CityModel>"""


def selftest():
    proj = projector(CENTER); bb = bbox(CENTER, 900)
    assert mesh3(35.6905, 139.7005) == '53394526', mesh3(35.6905, 139.7005)
    codes = meshes_in(bb)
    assert '53394526' in codes and len(codes) >= 4, codes
    root = ET.fromstring(SAMPLE_GML)
    got = [building_from_xml(b, proj, bb) for b in root.iter('{%s}Building' % NS['bldg'])]
    got = [g for g in got if g]
    assert len(got) == 2, got
    b1, b2 = got
    assert b1['h'] == 31.5 and b1['name'] == 'テストビル' and b1['usage'] == '411' and b1['storeys'] == '8' and len(b1['poly']) == 4, b1
    assert abs(b1['poly'][1][0] - 45.2) < 1.0 and abs(b1['poly'][2][1] - 55.3) < 1.0, b1['poly']  # 0.0005度 ≈ 東45m・南55m
    assert b2['h'] == 12.0 and len(b2['poly']) == 4, b2
    # zip の中の gml を読む流れ
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        z.writestr('13104_shinjuku-ku_pref_2025_citygml_1_op/udx/bldg/53394526_bldg_6697_op.gml', SAMPLE_GML)
        z.writestr('13104_shinjuku-ku_pref_2025_citygml_1_op/udx/bldg/99999999_bldg_6697_op.gml', SAMPLE_GML)
    buf.seek(0)
    tmp = 'selftest_tmp.zip'
    with open(tmp, 'wb') as f:
        f.write(buf.getvalue())
    try:
        out = read_plateau(tmp, bb, proj, log=lambda *a: None)
    finally:
        os.remove(tmp)
    assert len(out) == 2, len(out)
    print('selftest OK（メッシュ計算・CityGML の読み取り・zip の流れ）')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='shinjuku.json')
    ap.add_argument('--plateau', default=None, help='PLATEAU 新宿区 CityGML の zip')
    ap.add_argument('--center', default=f'{CENTER[0]},{CENTER[1]}')
    ap.add_argument('--half', type=float, default=900)
    ap.add_argument('--no-osm', action='store_true')
    ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()
    if a.selftest:
        selftest(); return
    center = tuple(float(v) for v in a.center.split(','))
    proj = projector(center); bb = bbox(center, a.half)
    out = {'center_lonlat': center, 'half_m': a.half, 'bbox_swne': bb, 'made': time.strftime('%Y-%m-%d'),
           'sources': ['© OpenStreetMap contributors（ODbL）', '国土交通省 Project PLATEAU 3D都市モデル（CC BY 4.0 等）'],
           'roads': [], 'rails': [], 'osm_buildings': [], 'green': [], 'stations': [], 'plateau_buildings': []}
    if not a.no_osm:
        print('OpenStreetMap（Overpass）から取得中…（1〜3分かかることがあります）')
        osm = overpass(bb)
        roads, rails, bld, green, stations = osm_to_layers(osm, proj)
        out['roads'], out['rails'], out['osm_buildings'], out['green'], out['stations'] = roads, rails, bld, green, stations
        withh = sum(1 for b in bld if b['h'] or b['levels'])
        print(f'OSM: 道路 {len(roads)} 本、鉄道 {len(rails)} 本、建物 {len(bld)} 棟（高さか階数のタグあり {withh} 棟）、緑地 {len(green)}、駅 {len(stations)}')
        names = sorted({r['name'] for r in roads if r['name']})
        print('OSM: 主な道路名:', '、'.join(names[:30]))
    if a.plateau:
        out['plateau_buildings'] = read_plateau(a.plateau, bb, proj)
        hs = [b['h'] for b in out['plateau_buildings'] if b['h']]
        print(f'PLATEAU: 建物 {len(out["plateau_buildings"])} 棟（高さあり {len(hs)} 棟、最高 {max(hs) if hs else 0} m）')
    with open(a.out, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(f'書き出し: {a.out}（{os.path.getsize(a.out) / 1e6:.1f} MB）')


if __name__ == '__main__':
    main()
