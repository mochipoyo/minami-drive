#!/usr/bin/env python3
"""車の3Dモデルを Blender（Python モジュール bpy）で生成して GLB に書き出す。

使い方:  python3 tools/cars/gen_cars.py [出力フォルダ] [車種,車種,...]
  例:    python3 tools/cars/gen_cars.py assets/cars sedan,compact
  何も指定しなければ assets/cars に全車種を書き出す。

必要なもの: pip install bpy（Blender 4.2 以降の Python モジュール。約400MB）

出来上がる GLB の中身（three.js 側の 04b_carassets.js が読む）:
  body    … 塗装される部分（頂点色は白。色はゲーム側の材質でつける）
  detail  … ガラス・タイヤ・バンパー・ナンバー・内装など（頂点色つき）
  light_* … ライト。名前で種類を表す（head / tail / turnL / turnR / beacon / marker / rev）
  LOD は 2 段：オブジェクト名の末尾に _0（近く用）と _1（遠く用）
寸法（長さ・幅・高さ）はゲームの CARTYPES と同じにする（当たり判定はゲーム側の寸法のまま）。
座標：Blender の +Y が車の前。glTF（Y上）に書き出すと three.js では前が -Z になる（ゲームの車と同じ向き）。
"""
import sys, os, math, pathlib
import bpy, bmesh
from mathutils import Vector

OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'assets/cars')
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None

# ---- ゲームの CARTYPES と同じ寸法（04_models.js） ----
DIMS = {
    'kei':     dict(L=3.39, W=1.47, H=1.75),
    'compact': dict(L=3.99, W=1.69, H=1.50),
    'sedan':   dict(L=4.69, W=1.78, H=1.45),
    'van':     dict(L=4.69, W=1.70, H=1.90),
    'suv':     dict(L=4.60, W=1.85, H=1.70),
    'taxi':    dict(L=4.40, W=1.70, H=1.75),
    'police':  dict(L=4.90, W=1.80, H=1.47),
    'truck':   dict(L=4.80, W=1.72, H=2.35),
    'big':     dict(L=9.50, W=2.49, H=3.40),
    'bus':     dict(L=10.5, W=2.49, H=3.05),
    'amb':     dict(L=5.65, W=1.89, H=2.50),
}
# 頂点色（sRGB 0-1）
COL = dict(glass=(0.10, 0.14, 0.18), tire=(0.07, 0.07, 0.075), rim=(0.72, 0.74, 0.76), dark=(0.10, 0.105, 0.11),
           chrome=(0.82, 0.84, 0.86), plateW=(0.96, 0.96, 0.94), plateY=(0.95, 0.82, 0.25), plateG=(0.12, 0.42, 0.23),
           inner=(0.16, 0.16, 0.17), seat=(0.22, 0.21, 0.2), taxiLamp=(0.95, 0.76, 0.0), bar=(0.2, 0.2, 0.22),
           white=(1, 1, 1), red=(0.8, 0.12, 0.1), amber=(0.95, 0.62, 0.1), orangeBand=(0.9, 0.45, 0.1))


def srgb(c):
    """頂点色は glTF ではリニア。sRGB の値をリニアにして入れる（three.js 側は変換しない）"""
    def f(v):
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (f(c[0]), f(c[1]), f(c[2]), 1.0)


# ---- 下回り：Blender の雑用 ----
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def new_obj(name, verts, faces, color=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([Vector(v) for v in verts], [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    if color is not None:
        set_color(ob, color)
    return ob


def set_color(ob, color):
    me = ob.data
    if 'Col' not in me.color_attributes:
        me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    att = me.color_attributes['Col']
    c = srgb(color)
    for i in range(len(att.data)):
        att.data[i].color = c
    me.color_attributes.active_color = att


def box(name, cx, cy, cz, sx, sy, sz, color=None, ry=0.0):
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    v = [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz), (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]
    if ry:
        cs, sn = math.cos(ry), math.sin(ry)
        v = [(x * cs + z * sn, y, -x * sn + z * cs) for x, y, z in v]
    v = [(x + cx, y + cy, z + cz) for x, y, z in v]
    f = [(3, 2, 1, 0), (5, 6, 7, 4), (1, 5, 4, 0), (2, 6, 5, 1), (3, 7, 6, 2), (0, 4, 7, 3)]  # 外向き（反時計回り）
    return new_obj(name, v, f, color)


def cylinder_x(name, cx, cy, cz, r, w, seg=24, color=None, r2=None):
    """x 軸まわりの円柱（タイヤ・ホイール）。r2 を与えると内側の円（リム）"""
    verts, faces = [], []
    for side in (-1, 1):
        for i in range(seg):
            a = 2 * math.pi * i / seg
            verts.append((cx + side * w / 2, cy + r * math.cos(a), cz + r * math.sin(a)))
    for i in range(seg):
        j = (i + 1) % seg
        faces.append((i, j, seg + j, seg + i))
    # ふた
    c0 = len(verts); verts.append((cx - w / 2, cy, cz)); c1 = len(verts); verts.append((cx + w / 2, cy, cz))
    for i in range(seg):
        j = (i + 1) % seg
        faces.append((c0, j, i)); faces.append((c1, seg + i, seg + j))
    return new_obj(name, verts, faces, color)


def join(objs, name):
    objs = [o for o in objs if o is not None]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    return ob


def apply_mods(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def smooth(ob, angle=None):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    if angle is None:
        bpy.ops.object.shade_smooth()
    else:
        try:
            bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))
        except Exception:
            bpy.ops.object.shade_smooth()


def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


# ---- 車体：断面を前後に並べて面を張る（ロフト） ----
# 断面（右半分）：[(x, z), ...] 下の中心から上の中心へ。左右対称に展開する
def section(st):
    """st: dict(zb, wb, w, zs, zbelt, wg, zwin, wr, zre, zr)
    zb 床の高さ / wb 床の外端 / w 最大幅の半分 / zs シル / zbelt ベルトライン（いちばん広い所）
    wg 窓の下端の半幅 / zwin 窓の下端の高さ / wr 屋根の縁の半幅 / zre 屋根の縁の高さ / zr 屋根の中心の高さ"""
    pts = [(0.0, st['zb']), (st['wb'], st['zb']), (st['w'], st['zs']), (st['w'], st['zbelt']), (st['wg'], st['zwin']), (st['wr'], st['zre']), (0.0, st['zr'])]
    right = pts
    left = [(-x, z) for x, z in reversed(pts[1:-1])]
    return right + left  # 周回：右半分 → 左半分（上の中心と下の中心は1点ずつ）


def lerp_st(a, b, t):
    return {k: a[k] + (b[k] - a[k]) * t for k in a}


def insert_station(stations, y):
    """y の位置に断面を補間して差し込む（柱の境目用）"""
    for i in range(len(stations) - 1):
        y0, y1 = stations[i][0], stations[i + 1][0]
        if y0 < y < y1:
            t = (y - y0) / (y1 - y0)
            stations.insert(i + 1, (y, lerp_st(stations[i][1], stations[i + 1][1], t)))
            return
    return


def loft(name, stations, cabin=None, pillars=(), front_glass=None):
    """stations: [(y, st), ...] 後ろ→前。cabin=(y0,y1) の範囲の窓の帯（P4-P5）はガラスとして別オブジェクトに分ける。
    pillars: [(y0,y1),...] はガラスにしない範囲（B ピラーなど）"""
    stations = list(stations)
    for a, b in pillars:
        insert_station(stations, a); insert_station(stations, b)
    rings = [[(x, y, z) for x, z in section(st)] for y, st in stations]
    n = len(rings[0])
    verts = [v for ring in rings for v in ring]
    faces, glass_faces = [], []
    for k in range(len(rings) - 1):
        y0, y1 = stations[k][0], stations[k + 1][0]
        for i in range(n):
            j = (i + 1) % n
            a, b, c, d = k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i
            # 窓の帯：右側は i=4（P4→P5）、左側は i=n-5（P5'→P4'）
            is_glass = cabin is not None and (i == 4 or i == n - 5) and y0 >= cabin[0] - 1e-6 and y1 <= cabin[1] + 1e-6
            if is_glass and any(a - 1e-6 <= y0 and y1 <= b + 1e-6 for a, b in pillars):
                is_glass = False
            (glass_faces if is_glass else faces).append((a, b, c, d))
    # 前後のふた
    faces.append(tuple(range(n - 1, -1, -1)))  # 後ろ
    front = tuple((len(rings) - 1) * n + i for i in range(n))
    if front_glass is None:
        faces.append(front)
    else:
        # 前面：窓（上の帯）と車体（下）に分ける。front_glass = ガラスにする最初の点の番号（右半分の P 番号）
        k = front_glass; base = (len(rings) - 1) * n
        up = [base + i for i in range(k, n - k + 1)]      # P_k … P_{n-k}（上側、左右対称）
        lo = [base + i for i in range(0, k + 1)] + [base + i for i in range(n - k, n)]  # 下側
        glass_faces.append(tuple(up))
        faces.append(tuple(lo))
    body = new_obj(name, verts, faces, COL['white'])
    glass = new_obj(name + '_glass', verts, glass_faces, COL['glass']) if glass_faces else None
    for ob in (body, glass):
        if ob is None:
            continue
        bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.0005)
        bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
    return body, glass


def S(zb, wb, w, zs, zbelt, wg, zwin, wr, zre, zr):
    return dict(zb=zb, wb=wb, w=w, zs=zs, zbelt=zbelt, wg=wg, zwin=zwin, wr=wr, zre=zre, zr=zr)


def car_stations(kind, L, W, H):
    """車種ごとの断面の並び。y は後ろ（-L/2）から前（+L/2）へ"""
    hw = W / 2; r = L / 2
    zb = 0.20  # 床の高さ（タイヤの中心より少し上）
    if kind in ('sedan', 'police', 'taxi'):
        belt = 0.86 if kind != 'taxi' else 0.95; roof = H; hood = belt - 0.03
        wg = hw - 0.10; wr = hw - 0.30
        trunk = belt + 0.02
        st = [
            (-r, S(zb + 0.12, hw - 0.30, hw - 0.12, zb + 0.30, belt - 0.22, hw - 0.14, belt - 0.12, hw - 0.18, belt - 0.08, belt - 0.06)),
            (-r + 0.10, S(zb, hw - 0.10, hw, zb + 0.25, belt, hw - 0.03, belt + 0.03, hw - 0.08, trunk, trunk)),
            (-r + 0.55 if kind != 'taxi' else -r + 0.35, S(zb, hw - 0.08, hw, zb + 0.25, belt, hw - 0.03, belt + 0.03, hw - 0.08, trunk, trunk)),
            (-r + 1.25 if kind != 'taxi' else -r + 0.9, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg, belt + 0.03, wr, roof - 0.07, roof)),
            (-r + 1.75 if kind != 'taxi' else -r + 1.4, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg, belt + 0.03, wr - 0.02, roof - 0.04, roof)),
            (r - 1.75 if kind != 'taxi' else r - 1.55, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg, belt + 0.03, wr - 0.02, roof - 0.04, roof)),
            (r - 1.15 if kind != 'taxi' else r - 1.0, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg + 0.03, belt + 0.03, wr - 0.04, roof - 0.14, roof - 0.07)),
            (r - 0.45, S(zb, hw - 0.08, hw, zb + 0.25, belt, hw - 0.04, hood + 0.03, hw - 0.10, hood, hood)),
            (r - 0.08, S(zb, hw - 0.12, hw - 0.02, zb + 0.22, belt - 0.05, hw - 0.06, hood - 0.03, hw - 0.14, hood - 0.08, hood - 0.08)),
            (r, S(zb + 0.08, hw - 0.30, hw - 0.14, zb + 0.28, belt - 0.26, hw - 0.18, belt - 0.16, hw - 0.24, belt - 0.14, belt - 0.13)),
        ]
        cabin = (st[2][0], st[7][0])
    elif kind == 'compact':
        belt = 0.90; roof = H; hood = belt - 0.04; wg = hw - 0.10; wr = hw - 0.26
        st = [
            (-r, S(zb + 0.12, hw - 0.28, hw - 0.12, zb + 0.30, belt - 0.2, hw - 0.14, belt - 0.1, hw - 0.2, roof - 0.5, roof - 0.48)),
            (-r + 0.10, S(zb, hw - 0.10, hw, zb + 0.25, belt, wg, belt + 0.03, wr, roof - 0.10, roof - 0.06)),
            (-r + 0.45, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg, belt + 0.03, wr, roof - 0.04, roof)),
            (-r + 1.3, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg, belt + 0.03, wr - 0.02, roof - 0.04, roof)),
            (r - 1.55, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg, belt + 0.03, wr - 0.02, roof - 0.04, roof)),
            (r - 1.0, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg + 0.02, belt + 0.03, wr - 0.04, roof - 0.16, roof - 0.08)),
            (r - 0.42, S(zb, hw - 0.08, hw, zb + 0.25, belt, hw - 0.04, hood + 0.03, hw - 0.10, hood, hood)),
            (r - 0.08, S(zb, hw - 0.12, hw - 0.02, zb + 0.22, belt - 0.06, hw - 0.06, hood - 0.03, hw - 0.14, hood - 0.09, hood - 0.09)),
            (r, S(zb + 0.08, hw - 0.30, hw - 0.14, zb + 0.28, belt - 0.28, hw - 0.18, belt - 0.18, hw - 0.24, belt - 0.16, belt - 0.15)),
        ]
        cabin = (st[0][0], st[6][0])
    elif kind == 'kei':
        belt = 0.95; roof = H; hood = belt - 0.02; wg = hw - 0.08; wr = hw - 0.20
        st = [
            (-r, S(zb + 0.10, hw - 0.25, hw - 0.10, zb + 0.28, belt - 0.18, hw - 0.12, belt - 0.08, hw - 0.16, roof - 0.42, roof - 0.40)),
            (-r + 0.08, S(zb, hw - 0.10, hw, zb + 0.25, belt, wg, belt + 0.03, wr, roof - 0.08, roof - 0.05)),
            (-r + 0.4, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg, belt + 0.03, wr, roof - 0.04, roof)),
            (r - 1.25, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg, belt + 0.03, wr - 0.02, roof - 0.04, roof)),
            (r - 0.75, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg + 0.02, belt + 0.03, wr - 0.04, roof - 0.2, roof - 0.1)),
            (r - 0.35, S(zb, hw - 0.08, hw, zb + 0.25, belt, hw - 0.04, hood + 0.03, hw - 0.10, hood, hood)),
            (r - 0.07, S(zb, hw - 0.12, hw - 0.02, zb + 0.22, belt - 0.06, hw - 0.06, hood - 0.03, hw - 0.14, hood - 0.1, hood - 0.1)),
            (r, S(zb + 0.08, hw - 0.28, hw - 0.14, zb + 0.28, belt - 0.3, hw - 0.18, belt - 0.2, hw - 0.24, belt - 0.18, belt - 0.17)),
        ]
        cabin = (st[0][0], st[5][0])
    elif kind in ('van', 'amb'):
        belt = 1.0 if kind == 'van' else 1.05; roof = H; hood = belt - 0.02; wg = hw - 0.07; wr = hw - 0.18
        st = [
            (-r, S(zb + 0.10, hw - 0.25, hw - 0.10, zb + 0.28, belt - 0.18, hw - 0.12, belt - 0.08, hw - 0.16, roof - 0.2, roof - 0.18)),
            (-r + 0.08, S(zb, hw - 0.10, hw, zb + 0.25, belt, wg, belt + 0.03, wr, roof - 0.06, roof - 0.04)),
            (-r + 0.4, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg, belt + 0.03, wr, roof - 0.03, roof)),
            (r - 1.7, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg, belt + 0.03, wr - 0.01, roof - 0.03, roof)),
            (r - 1.05, S(zb, hw - 0.08, hw, zb + 0.25, belt, wg + 0.02, belt + 0.03, wr - 0.03, roof - 0.22, roof - 0.12)),
            (r - 0.5, S(zb, hw - 0.08, hw, zb + 0.25, belt, hw - 0.04, hood + 0.03, hw - 0.10, hood, hood)),
            (r - 0.08, S(zb, hw - 0.12, hw - 0.02, zb + 0.22, belt - 0.06, hw - 0.06, hood - 0.03, hw - 0.14, hood - 0.1, hood - 0.1)),
            (r, S(zb + 0.08, hw - 0.28, hw - 0.14, zb + 0.28, belt - 0.32, hw - 0.18, belt - 0.22, hw - 0.24, belt - 0.2, belt - 0.19)),
        ]
        cabin = (st[0][0], st[5][0])
    elif kind == 'suv':
        zb = 0.30; belt = 1.05; roof = H; hood = belt - 0.03; wg = hw - 0.10; wr = hw - 0.24
        st = [
            (-r, S(zb + 0.10, hw - 0.26, hw - 0.10, zb + 0.30, belt - 0.2, hw - 0.12, belt - 0.1, hw - 0.18, roof - 0.3, roof - 0.28)),
            (-r + 0.10, S(zb, hw - 0.10, hw, zb + 0.28, belt, wg, belt + 0.03, wr, roof - 0.08, roof - 0.05)),
            (-r + 0.5, S(zb, hw - 0.08, hw, zb + 0.28, belt, wg, belt + 0.03, wr, roof - 0.04, roof)),
            (r - 1.6, S(zb, hw - 0.08, hw, zb + 0.28, belt, wg, belt + 0.03, wr - 0.02, roof - 0.04, roof)),
            (r - 1.05, S(zb, hw - 0.08, hw, zb + 0.28, belt, wg + 0.02, belt + 0.03, wr - 0.04, roof - 0.18, roof - 0.09)),
            (r - 0.5, S(zb, hw - 0.08, hw, zb + 0.28, belt, hw - 0.04, hood + 0.03, hw - 0.10, hood, hood)),
            (r - 0.08, S(zb, hw - 0.12, hw - 0.02, zb + 0.26, belt - 0.06, hw - 0.06, hood - 0.03, hw - 0.14, hood - 0.1, hood - 0.1)),
            (r, S(zb + 0.06, hw - 0.3, hw - 0.14, zb + 0.3, belt - 0.32, hw - 0.18, belt - 0.22, hw - 0.24, belt - 0.2, belt - 0.19)),
        ]
        cabin = (st[0][0], st[5][0])
    else:
        return None, None
    return st, cabin


def wheel_geo(kind, L, W):
    """タイヤの位置と大きさ（04_models.js と同じ）"""
    if kind == 'bus' or kind == 'big':
        wb, tr = (1.9 if kind == 'bus' else 1.8), 0.5
    elif kind == 'truck':
        wb, tr = 0.74, 0.36
    else:
        wb, tr = 0.74, 0.31
    return wb, tr


def build_wheels(kind, L, W, lod):
    wb, tr = wheel_geo(kind, L, W)
    seg = 24 if lod == 0 else 10
    parts = []
    tw = 0.21 if tr < 0.4 else 0.26
    for sx in (-1, 1):
        for sy in (-1, 1):
            x = sx * (W / 2 - 0.12); y = sy * (L / 2 - wb)
            parts.append(cylinder_x('tire', x, y, tr, tr, tw, seg, COL['tire']))
            parts.append(cylinder_x('rim', x + sx * tw * 0.5, y, tr, tr * 0.58, 0.015, seg, COL['rim']))
            if lod == 0:
                parts.append(cylinder_x('hub', x + sx * tw * 0.5 + sx * 0.012, y, tr, tr * 0.2, 0.012, 8, COL['dark']))
    return parts


def build_truck(kind, lod):
    """トラック（2t・大型）・バス：キャブ（ロフト）＋荷台（箱）。バスは全体がロフト"""
    d = DIMS[kind]; L, W, H = d['L'], d['W'], d['H']; hw = W / 2; r = L / 2
    wb, tr = wheel_geo(kind, L, W)
    zb = 0.35 if kind != 'truck' else 0.3
    details, lights, bodies = [], [], []
    if kind == 'bus':
        belt = 1.25; roof = H
        st = [
            (-r, S(zb, hw - 0.2, hw - 0.06, zb + 0.3, belt, hw - 0.08, belt + 0.1, hw - 0.3, roof - 0.12, roof - 0.08)),
            (-r + 0.25, S(zb, hw - 0.1, hw, zb + 0.3, belt, hw - 0.04, belt + 0.1, hw - 0.22, roof - 0.05, roof)),
            (r - 0.3, S(zb, hw - 0.1, hw, zb + 0.3, belt, hw - 0.04, belt + 0.1, hw - 0.22, roof - 0.05, roof)),
            (r - 0.05, S(zb, hw - 0.14, hw - 0.03, zb + 0.3, belt - 0.05, hw - 0.07, belt + 0.08, hw - 0.25, roof - 0.1, roof - 0.07)),
            (r, S(zb + 0.05, hw - 0.3, hw - 0.12, zb + 0.32, belt - 0.15, hw - 0.14, belt - 0.05, hw - 0.3, roof - 0.25, roof - 0.22)),
        ]
        cabin = (-r + 0.25, r - 0.3)
        pillars = [(y - 0.05, y + 0.05) for y in [cabin[0] + 1.5 * i for i in range(1, 7)] if y < cabin[1] - 0.3]
        body, glass = loft('body', st, cabin, pillars, front_glass=4)
        bev = body.modifiers.new('bev', 'BEVEL'); bev.width = 0.06; bev.segments = 2 if lod == 0 else 1; bev.limit_method = 'ANGLE'; bev.angle_limit = math.radians(40)
        apply_mods(body); smooth(body, 42)
        if glass is not None:
            for v in glass.data.vertices:
                v.co = v.co + v.normal * 0.006
        # 乗降口（左側の前後）、行き先表示、バンパー
        for yy in (r - 1.2, -r + 2.6):
            details.append(box('door', -(hw + 0.004), yy, (zb + belt) / 2 + 0.02, 0.01, 1.0, belt - zb - 0.08, COL['glass']))
        details.append(box('dest', 0, r + 0.004, roof - 0.33, W * 0.6, 0.01, 0.3, COL['dark']))
        details.append(box('bumperF', 0, r - 0.03, zb + 0.18, W - 0.06, 0.1, 0.25, COL['dark']))
        details.append(box('bumperR', 0, -r + 0.03, zb + 0.18, W - 0.06, 0.1, 0.25, COL['dark']))
        for sx in (-1, 1):
            lights.append(box('light_head', sx * (hw - 0.3), r + 0.006, zb + 0.55, 0.3, 0.03, 0.2, COL['white']))
            lights.append(box('light_tail', sx * (hw - 0.25), -r - 0.006, zb + 0.6, 0.25, 0.03, 0.25, COL['white']))
            lights.append(box('light_turn' + ('L' if sx < 0 else 'R'), sx * (hw - 0.06), r + 0.004, zb + 0.55, 0.1, 0.03, 0.14, COL['white']))
            lights.append(box('light_turn' + ('L' if sx < 0 else 'R'), sx * (hw - 0.05), -r - 0.004, zb + 0.6, 0.1, 0.03, 0.16, COL['white']))
        lights.append(box('light_marker', 0, r + 0.004, roof - 0.12, W * 0.5, 0.01, 0.06, COL['white']))
        bodies = [body]
        if glass is not None:
            details.append(glass)
    else:
        # キャブ（前）：短いロフト。荷台：角を丸めた箱
        cabL = 1.9 if kind == 'truck' else 2.3; cabH = 2.0 if kind == 'truck' else 2.7; belt = 1.05 if kind == 'truck' else 1.35
        y1 = r; y0 = r - cabL
        st = [
            (y0, S(zb, hw - 0.1, hw - 0.02, zb + 0.3, belt, hw - 0.06, belt + 0.08, hw - 0.18, cabH - 0.06, cabH)),
            (y1 - 0.35, S(zb, hw - 0.1, hw, zb + 0.3, belt, hw - 0.05, belt + 0.08, hw - 0.18, cabH - 0.04, cabH)),
            (y1 - 0.06, S(zb, hw - 0.12, hw - 0.02, zb + 0.3, belt - 0.03, hw - 0.07, belt + 0.06, hw - 0.2, cabH - 0.12, cabH - 0.08)),
            (y1, S(zb + 0.05, hw - 0.3, hw - 0.12, zb + 0.32, belt - 0.15, hw - 0.14, belt - 0.05, hw - 0.28, cabH - 0.3, cabH - 0.26)),
        ]
        cabin = (y0, y1 - 0.06)
        body, glass = loft('body', st, cabin, [], front_glass=4)
        bev = body.modifiers.new('bev', 'BEVEL'); bev.width = 0.05; bev.segments = 2 if lod == 0 else 1; bev.limit_method = 'ANGLE'; bev.angle_limit = math.radians(40)
        apply_mods(body); smooth(body, 42)
        if glass is not None:
            for v in glass.data.vertices:
                v.co = v.co + v.normal * 0.006
            details.append(glass)
        # 荷台（アルミの箱）：白っぽい別の色（塗装色にしない）
        cy = (-r + (y0 - 0.15)) / 2; cl = (y0 - 0.15) - (-r)
        cargo = box('cargo', 0, cy, zb + 0.25 + (H - zb - 0.25) / 2, W + 0.06, cl, H - zb - 0.25, (0.9, 0.9, 0.89))
        cb = cargo.modifiers.new('bev', 'BEVEL'); cb.width = 0.05; cb.segments = 2 if lod == 0 else 1
        apply_mods(cargo); smooth(cargo, 42)
        details.append(cargo)
        details.append(box('cargoDoorLine', 0, -r - 0.034, zb + 0.25 + (H - zb - 0.25) / 2, 0.02, 0.01, H - zb - 0.4, COL['dark']))
        details.append(box('frame', 0, cy, zb + 0.12, W - 0.5, cl - 0.2, 0.25, COL['dark']))
        details.append(box('bumperF', 0, r - 0.03, zb + 0.18, W - 0.06, 0.1, 0.22, COL['dark']))
        details.append(box('grille', 0, r + 0.004, belt - 0.35, W * 0.5, 0.01, 0.22, COL['dark']))
        details.append(box('plateF', 0, r + 0.012, zb + 0.4, 0.33, 0.012, 0.165, COL['plateG']))
        details.append(box('plateR', 0, -r - 0.04, zb + 0.42, 0.33, 0.012, 0.165, COL['plateG']))
        mirrors = [box('mirror', sx * (hw + 0.14), y1 - 0.3, belt + 0.5, 0.06, 0.16, 0.4, COL['white']) for sx in (-1, 1)]
        for sx in (-1, 1):
            details.append(box('stalk', sx * (hw + 0.06), y1 - 0.3, belt + 0.72, 0.16, 0.04, 0.03, COL['dark']))
            lights.append(box('light_head', sx * (hw - 0.3), r + 0.006, belt - 0.15, 0.3, 0.03, 0.16, COL['white']))
            lights.append(box('light_tail', sx * (hw - 0.25), -r - 0.045, zb + 0.45, 0.25, 0.03, 0.2, COL['white']))
            lights.append(box('light_turn' + ('L' if sx < 0 else 'R'), sx * (hw - 0.07), r + 0.004, belt - 0.15, 0.1, 0.03, 0.14, COL['white']))
            lights.append(box('light_turn' + ('L' if sx < 0 else 'R'), sx * (hw - 0.05), -r - 0.045, zb + 0.45, 0.1, 0.03, 0.2, COL['white']))
        bodies = [body] + mirrors
    # タイヤ（大型は後輪が2軸）
    seg = 24 if lod == 0 else 10
    tw = 0.26 if tr >= 0.4 else 0.22
    axles = [-(L / 2 - wb), (L / 2 - wb)] if kind != 'big' else [-(L / 2 - wb), -(L / 2 - wb) + 1.3, (L / 2 - wb)]
    for sx in (-1, 1):
        for y in axles:
            x = sx * (hw - 0.14)
            details.append(cylinder_x('tire', x, y, tr, tr, tw, seg, COL['tire']))
            details.append(cylinder_x('rim', x + sx * tw * 0.5, y, tr, tr * 0.6, 0.015, seg, COL['rim']))
    body = join(bodies, 'body_%d' % lod)
    set_color(body, COL['white'])
    detail = join(details, 'detail_%d' % lod)
    for i, lt in enumerate(lights):
        lt.name = lt.name.split('.')[0] + '_%d_%d' % (lod, i)
    return body, detail, lights


def build_car(kind, lod):
    if kind in ('truck', 'big', 'bus'):
        return build_truck(kind, lod)
    d = DIMS[kind]; L, W, H = d['L'], d['W'], d['H']
    st, cabin = car_stations(kind, L, W, H)
    hw = W / 2
    wb, tr = wheel_geo(kind, L, W)
    cy0, cy1 = cabin
    cl = cy1 - cy0
    # B ピラー（前後のドアの境）。セダン系は C ピラーも
    pillars = [(cy0 + cl * 0.50 - 0.045, cy0 + cl * 0.50 + 0.045)]
    if kind in ('sedan', 'police', 'taxi'):
        pillars.append((cy0 + 0.0, cy0 + 0.22))
    body, glass = loft('body', st, cabin, pillars)
    belt = st[3][1]['zbelt']; zb = st[1][1]['zb']
    # 車体：ベベル＋サブディビジョンでなめらかに。遠く用は粗く
    smooth(body)
    bev = body.modifiers.new('bev', 'BEVEL'); bev.width = 0.025; bev.segments = 2; bev.limit_method = 'ANGLE'; bev.angle_limit = math.radians(40)
    if lod == 0:
        sub = body.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1
    apply_mods(body)
    if glass is not None:
        smooth(glass)
        if lod == 0:
            sg = glass.modifiers.new('sub', 'SUBSURF'); sg.levels = 1
        apply_mods(glass)
        # ガラスを 6mm 外へ（車体と重ならないように）
        for v in glass.data.vertices:
            n = v.normal; v.co = v.co + n * 0.006
    # タイヤの穴（車体から円柱を引く）
    for sx in (-1, 1):
        for sy in (-1, 1):
            cutter = cylinder_x('cut', sx * (hw - 0.05), sy * (L / 2 - wb), tr, tr + 0.07, 0.42, 20)
            m = body.modifiers.new('cut', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.object = cutter; m.solver = 'EXACT'
            apply_mods(body)
            bpy.data.objects.remove(cutter, do_unlink=True)
    smooth(body, 42)
    # ホイールハウスの内側（黒）：車体の穴の奥に見える箱
    details = [box('arch', sx * (hw - 0.30), sy * (L / 2 - wb), (zb + 0.05 + tr + 0.12) / 2, 0.30, (tr + 0.08) * 2, tr + 0.12 - zb - 0.05, COL['dark']) for sx in (-1, 1) for sy in (-1, 1)]
    details += build_wheels(kind, L, W, lod)
    # 下回り・バンパー
    details.append(box('floor', 0, 0, zb - 0.02, W - 0.3, L - 0.8, 0.06, COL['dark']))
    details.append(box('bumperF', 0, L / 2 - 0.04, zb + 0.16, W - 0.08, 0.1, 0.2, COL['dark']))
    details.append(box('bumperR', 0, -L / 2 + 0.04, zb + 0.16, W - 0.08, 0.1, 0.2, COL['dark']))
    # グリル（前面の黒い開口）・ナンバープレート
    details.append(box('grille', 0, L / 2 + 0.005, belt - 0.2, W * 0.44, 0.02, 0.14, COL['dark']))
    pc = COL['plateY'] if kind == 'kei' else COL['plateG'] if kind in ('taxi', 'truck', 'bus', 'big') else COL['plateW']
    details.append(box('plateF', 0, L / 2 + 0.012, zb + 0.3, 0.33, 0.012, 0.165, pc))
    details.append(box('plateR', 0, -L / 2 - 0.012, zb + 0.36, 0.33, 0.012, 0.165, pc))
    # 内装（ガラス越しに見える黒い塊・座席の頭）
    if cabin is not None:
        cy0, cy1 = cabin; cl = cy1 - cy0
        details.append(box('inner', 0, (cy0 + cy1) / 2 + 0.2, belt - 0.03, W - 0.3, cl - 0.7, 0.04, COL['inner']))
        roof = st[4][1]['zr']
        for sx in (-1, 1):
            details.append(box('seat', sx * 0.37, cy0 + cl * 0.45, belt + 0.02 + (roof - belt - 0.3) / 2, 0.46, 0.5, roof - belt - 0.3, COL['seat']))
    # ドアの取っ手（ベルトラインの少し下。ベルトラインは最大幅なので車体の面に乗る）
    for sx in (-1, 1):
        for yy in ([cy0 + cl * 0.30, cy0 + cl * 0.72] if kind in ('sedan', 'police', 'taxi', 'van', 'suv', 'amb') else [cy0 + cl * 0.62]):
            details.append(box('handle', sx * (hw - 0.005), yy, belt - 0.12, 0.02, 0.13, 0.03, COL['dark']))
    # ドアミラー（塗装色）
    mirrors = [box('mirror', sx * (hw + 0.09), cabin[1] - 0.12, belt + 0.1, 0.11, 0.17, 0.1, COL['white']) for sx in (-1, 1)]
    stalks = [box('stalk', sx * (hw + 0.03), cabin[1] - 0.12, belt + 0.06, 0.07, 0.05, 0.03, COL['dark']) for sx in (-1, 1)]
    details += stalks
    # 車種ごとの飾り
    if kind == 'taxi':
        details.append(box('taxiLamp', 0, -0.15, H + 0.12, 0.42, 0.2, 0.2, COL['taxiLamp']))
        details.append(box('taxiBase', 0, -0.15, H + 0.015, 0.5, 0.28, 0.03, COL['dark']))
    if kind == 'police':
        details.append(box('barBase', 0, -0.2, H + 0.04, 0.9, 0.26, 0.08, COL['bar']))
        details.append(box('blackLower', 0, 0, zb + 0.26, W + 0.004, L * 0.55, 0.42, COL['dark']))
    if kind == 'amb':
        details.append(box('band', 0, 0, belt - 0.05, W + 0.006, L - 0.3, 0.16, COL['red']))
    # ライト（名前で種類を伝える）
    lights = []
    hy = belt - 0.1  # ヘッドライトの高さ
    ty = belt - 0.06
    for sx in (-1, 1):
        lights.append(box('light_head', sx * (hw - 0.26), L / 2 + 0.006, hy, 0.34, 0.03, 0.13, COL['white']))
        lights.append(box('light_tail', sx * (hw - 0.22), -L / 2 - 0.006, ty, 0.3, 0.03, 0.14, COL['white']))
        lights.append(box('light_turn' + ('L' if sx < 0 else 'R'), sx * (hw - 0.06), L / 2 + 0.004, hy, 0.09, 0.03, 0.1, COL['white']))
        lights.append(box('light_turn' + ('L' if sx < 0 else 'R'), sx * (hw - 0.05), -L / 2 - 0.004, ty, 0.09, 0.03, 0.12, COL['white']))
        lights.append(box('light_turn' + ('L' if sx < 0 else 'R'), sx * (hw + 0.14), cabin[1] - 0.12, belt + 0.1, 0.02, 0.05, 0.05, COL['white']))
        lights.append(box('light_rev', sx * (hw - 0.44), -L / 2 - 0.006, ty - 0.02, 0.12, 0.03, 0.07, COL['white']))
    if kind in ('police', 'amb'):
        for sx in (-1, 1):
            lights.append(box('light_beacon', sx * 0.3, -0.2 if kind == 'police' else L / 2 - 0.9, H + 0.13, 0.38, 0.22, 0.12, COL['white']))
    # まとめる
    body = join([body] + mirrors, 'body_%d' % lod)
    set_color(body, COL['white'])
    detail = join(details + ([glass] if glass is not None else []), 'detail_%d' % lod)
    for i, lt in enumerate(lights):
        lt.name = lt.name.split('.')[0] + '_%d_%d' % (lod, i)  # Blender の重複名（.001）を消して、種類_LOD_連番 にする
    return body, detail, lights


def export(kind, path):
    reset()
    objs = []
    for lod in (0, 1):
        body, detail, lights = build_car(kind, lod)
        objs += [body, detail] + lights
    for o in bpy.context.scene.objects:
        if o not in objs:
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', export_apply=True, export_yup=True, export_materials='NONE',
                              export_vertex_color='ACTIVE', export_normals=True, export_texcoords=False, export_animations=False, export_skins=False,
                              export_extras=False, export_lights=False, export_cameras=False, use_selection=True)
    tris = {o.name: tri_count(o) for o in objs if o.type == 'MESH'}
    return tris


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    kinds = ONLY or ['kei', 'compact', 'sedan', 'van', 'suv', 'taxi', 'police', 'amb', 'truck', 'big', 'bus']
    for k in kinds:
        p = OUT / (k + '.glb')
        tris = export(k, p)
        t0 = sum(v for n, v in tris.items() if n.endswith('_0')); t1 = sum(v for n, v in tris.items() if n.endswith('_1'))
        print(f'{k}: {p.stat().st_size:,} bytes  tris lod0={t0} lod1={t1}')


if __name__ == '__main__':
    main()
