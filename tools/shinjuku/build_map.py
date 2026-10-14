#!/usr/bin/env python3
"""extract_area.py の出力（shinjuku.json）から、ゲームの地図データ（assets/maps/shinjuku.json）を作る。

やること
  1. 道路の選別（車が走る道路だけ。トンネル・構内・歩行者用は除く）と、交差点での分割
  2. 上下線が別々の一方通行として描かれている大通り（甲州街道・明治通りなど）を、ひとつの道路（中央分離帯つき）にまとめる
  3. 交差点ごとに脚（N/E/S/W）を割り当てる（ゲームのエンジンは1交差点に最大4本・方角ごとに1本）。
     同じ方角に2本入る場合は、重要でない方の道路を交差点の手前で切る
  4. 道路の端を交差点のどこで切るか（cut）を決める。交差点の多角形はゲーム側で道路の端から作る
  5. PLATEAU の建物を、道路（歩道を含む）にかからないように押し出す
  6. assets/maps/shinjuku.json と、確認用の PNG を書き出す

使い方
  python3 build_map.py shinjuku.json --out ../../assets/maps/shinjuku.json --png check.png
"""
import argparse, collections, json, math, sys

# ---- 道路の種類 → ゲームの設定 ----
RANK = {'trunk': 0, 'primary': 1, 'secondary': 2, 'tertiary': 3, 'unclassified': 4, 'residential': 5,
        'trunk_link': 2, 'primary_link': 3, 'secondary_link': 4, 'tertiary_link': 5}
LANE_W = {'ART': 3.25, 'COL': 3.0, 'RES': 2.7}


def gtype(cls):
    if cls in ('trunk', 'primary', 'secondary'):
        return 'ART'
    if cls == 'residential':
        return 'RES'
    return 'COL'


def to_int(s):
    try:
        return int(float(str(s).split(';')[0]))
    except Exception:
        return None


# ---- 幾何 ----
def dist(a, b):
    return math.hypot(b[0] - a[0], b[1] - a[1])


def plen(pts):
    return sum(dist(a, b) for a, b in zip(pts, pts[1:]))


def heading(a, b):
    """向き（ラジアン）。0=北(-z)、+π/2=東。"""
    return math.atan2(b[0] - a[0], -(b[1] - a[1]))


def wrap(a):
    while a > math.pi:
        a -= 2 * math.pi
    while a < -math.pi:
        a += 2 * math.pi
    return a


def point_at(pts, s):
    """折れ線上の、始点から距離 s の点と向き"""
    if s <= 0:
        return pts[0], heading(pts[0], pts[1])
    acc = 0
    for a, b in zip(pts, pts[1:]):
        L = dist(a, b)
        if acc + L >= s and L > 0:
            k = (s - acc) / L
            return (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k), heading(a, b)
        acc += L
    return pts[-1], heading(pts[-2], pts[-1])


def nearest_on(pts, p):
    """折れ線上の最も近い点：(距離, s, 符号つき横位置, 向き)。横位置は進行方向に対して右が正"""
    best = (1e18, 0, 0, 0)
    acc = 0
    for a, b in zip(pts, pts[1:]):
        dx, dz = b[0] - a[0], b[1] - a[1]
        L2 = dx * dx + dz * dz
        if L2 < 1e-9:
            continue
        k = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2
        k = max(0.0, min(1.0, k))
        q = (a[0] + dx * k, a[1] + dz * k)
        d = dist(p, q)
        if d < best[0]:
            L = math.sqrt(L2)
            # 右方向：向き h の右は (cos h, sin h)（x=東, z=南 の座標で h=0 が北）
            h = heading(a, b)
            rx, rz = math.cos(h), math.sin(h)
            t = (p[0] - q[0]) * rx + (p[1] - q[1]) * rz
            best = (d, acc + L * k, t, h)
        acc += math.sqrt(L2)
    return best


def cut_front(pts, s):
    """始点から s だけ切り落とした折れ線"""
    if s <= 0:
        return list(pts)
    P, _ = point_at(pts, s)
    out = [P]
    acc = 0
    for a, b in zip(pts, pts[1:]):
        L = dist(a, b)
        if acc + L > s + 0.05:
            out.append(b)
        acc += L
    if len(out) < 2:
        out.append(pts[-1])
    return out


def cut_back(pts, s):
    return list(reversed(cut_front(list(reversed(pts)), s)))


def simplify_dp(pts, eps):
    if len(pts) < 3:
        return list(pts)
    a, b = pts[0], pts[-1]
    dx, dz = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dz)
    imax, dmax = 0, -1
    for i in range(1, len(pts) - 1):
        p = pts[i]
        d = abs((p[0] - a[0]) * dz - (p[1] - a[1]) * dx) / L if L > 1e-9 else dist(p, a)
        if d > dmax:
            imax, dmax = i, d
    if dmax > eps:
        return simplify_dp(pts[:imax + 1], eps)[:-1] + simplify_dp(pts[imax:], eps)
    return [a, b]


def poly_area(poly):
    s = 0
    for (x0, z0), (x1, z1) in zip(poly, poly[1:] + poly[:1]):
        s += x0 * z1 - x1 * z0
    return s / 2


# ---- グラフ ----
class Edge:
    __slots__ = ('id', 'pts', 'cls', 'name', 'lanes', 'oneway', 'maxspeed', 'bridge', 'layer', 'nF', 'nB', 'med', 'merged', 'dead0', 'dead1', 'leg0', 'leg1', 'cut0', 'cut1', 'elev', 'min0', 'min1')

    def __init__(self, id, pts, cls, name, lanes, oneway, maxspeed, bridge, layer):
        self.id = id; self.pts = [tuple(p) for p in pts]; self.cls = cls; self.name = name; self.lanes = lanes
        self.oneway = oneway; self.maxspeed = maxspeed; self.bridge = bridge; self.layer = layer
        self.nF = None; self.nB = None; self.med = 0; self.merged = False; self.dead0 = False; self.dead1 = False
        self.leg0 = None; self.leg1 = None; self.cut0 = 0; self.cut1 = 0; self.elev = None; self.min0 = self.min1 = 0

    @property
    def a(self):
        return self.pts[0]

    @property
    def b(self):
        return self.pts[-1]

    @property
    def rank(self):
        return RANK[self.cls]

    def spec_key(self):
        return (self.cls, self.name, self.lanes, self.oneway, self.maxspeed, self.bridge, self.layer, self.merged, self.nF, self.nB)

    def length(self):
        return plen(self.pts)

    def set_lanes(self):
        """OSM のタグとクラスから、進行方向(nF)・逆方向(nB)の車線数を決める"""
        if self.nF is not None:
            return
        n = self.lanes
        if self.oneway:
            self.nF = n if n else (2 if self.cls in ('trunk', 'primary') else 1)
            self.nB = 0
        else:
            if not n:
                n = 4 if self.cls in ('trunk', 'primary') else 2
            self.nF = max(1, (n + 1) // 2); self.nB = max(1, n // 2) if n >= 2 else 0
            if self.nB == 0:
                self.nB = 1
        self.nF = min(self.nF, 4); self.nB = min(self.nB, 4)

    def half_widths(self):
        """参照線（中央）から左右の車道の端まで（路肩を含む）。(左, 右) 進行方向に対して"""
        self.set_lanes()
        w = LANE_W[gtype(self.cls)]
        if self.nB:
            m = self.med / 2
            return (m + self.nF * w + 0.5, m + self.nB * w + 0.5)
        return (self.nF * w / 2 + 0.5, self.nF * w / 2 + 0.5)

    def walk(self):
        t = gtype(self.cls)
        return 4.0 if t == 'ART' else 2.5 if t == 'COL' else 0.0


def build_edges(data, keep):
    ways = [r for r in data['roads'] if r['type'] in keep and r.get('tunnel') != 'yes' and len(r['pts']) >= 2]
    cnt = collections.Counter()
    for r in ways:
        for p in r['pts']:
            cnt[tuple(p)] += 1
        cnt[tuple(r['pts'][0])] += 1
        cnt[tuple(r['pts'][-1])] += 1
    nodes = {p for p, c in cnt.items() if c >= 2}
    edges = []
    eid = 0
    for r in ways:
        cur = [tuple(r['pts'][0])]
        for p in r['pts'][1:]:
            p = tuple(p)
            if p == cur[-1]:
                continue
            cur.append(p)
            if p in nodes:
                edges.append(Edge(eid, cur, r['type'], r.get('name', ''), to_int(r.get('lanes')), r.get('oneway') == 'yes', to_int(r.get('maxspeed')), r.get('bridge') == 'yes', to_int(r.get('layer')) or 0)); eid += 1
                cur = [p]
        if len(cur) > 1:
            edges.append(Edge(eid, cur, r['type'], r.get('name', ''), to_int(r.get('lanes')), r.get('oneway') == 'yes', to_int(r.get('maxspeed')), r.get('bridge') == 'yes', to_int(r.get('layer')) or 0)); eid += 1
    return edges


def incidence(edges):
    inc = collections.defaultdict(list)
    for e in edges:
        inc[e.a].append((e, 0))
        inc[e.b].append((e, 1))
    return inc


def simplify(edges):
    """次数2の点で、同じ設定の道路がつながっていればひとつにする"""
    changed = True
    while changed:
        changed = False
        inc = incidence(edges)
        for p, lst in inc.items():
            if len(lst) != 2:
                continue
            (e1, end1), (e2, end2) = lst
            if e1 is e2 or e1.spec_key() != e2.spec_key():
                continue
            # e1 がここで終わり e2 がここから始まる、という向きにそろえる
            if e1.oneway:
                if not (end1 == 1 and end2 == 0) and not (end1 == 0 and end2 == 1):
                    continue
                if end1 == 0:
                    e1, e2 = e2, e1
                pts = e1.pts + e2.pts[1:]
            else:
                p1 = e1.pts if end1 == 1 else list(reversed(e1.pts))
                p2 = e2.pts if end2 == 0 else list(reversed(e2.pts))
                pts = p1 + p2[1:]
            # 折れ角が急すぎる所（90度以上）は交差点として残す
            h1 = heading(pts[len(e1.pts) - 2], pts[len(e1.pts) - 1]); h2 = heading(pts[len(e1.pts) - 1], pts[len(e1.pts)])
            if abs(wrap(h2 - h1)) > math.radians(100):
                continue
            e1.pts = pts
            edges.remove(e2)
            changed = True
            break
    return edges


# ---- 上下線の統合 ----
def strand_heading(e):
    sx = sum(math.sin(heading(a, b)) * dist(a, b) for a, b in zip(e.pts, e.pts[1:]))
    cx = sum(math.cos(heading(a, b)) * dist(a, b) for a, b in zip(e.pts, e.pts[1:]))
    return math.atan2(sx, cx)


def samples(pts, step):
    L = plen(pts)
    n = max(1, int(L / step))
    return [point_at(pts, L * i / n)[0] for i in range(n + 1)]


def pair_score(A, B):
    """A の点から見て B がどれだけ近くに並走しているか：(近い割合, 距離の中央値)"""
    ds = [nearest_on(B.pts, p)[0] for p in samples(A.pts, 6)]
    near = [d for d in ds if d < 50]
    if not ds:
        return 0, 0
    near.sort()
    return len(near) / len(ds), (near[len(near) // 2] if near else 0)


def name_key(name):
    """名前のゆれをそろえる：「甲州街道(西新宿二丁目)」→「甲州街道」"""
    import re
    return re.sub(r'[（(].*?[)）]', '', name or '').strip()


def find_corridors(edges, log):
    """同じ名前・逆向き・並走する一方通行の組を見つけ、corridor（グループ）にまとめる"""
    cand = [e for e in edges if e.oneway and name_key(e.name) and e.rank <= 4 and e.length() > 15]
    by_name = collections.defaultdict(list)
    for e in cand:
        by_name[name_key(e.name)].append(e)
    parent = {e.id: e.id for e in cand}

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]; i = parent[i]
        return i

    pairs = 0
    for name, lst in by_name.items():
        for i in range(len(lst)):
            for j in range(i + 1, len(lst)):
                A, B = lst[i], lst[j]
                if math.cos(strand_heading(A) - strand_heading(B)) > -0.6:
                    continue
                fa, da = pair_score(A, B); fb, db = pair_score(B, A)
                if (fa >= 0.5 and 4 <= da <= 45) or (fb >= 0.5 and 4 <= db <= 45):
                    parent[find(A.id)] = find(B.id); pairs += 1
    groups = collections.defaultdict(list)
    for e in cand:
        groups[find(e.id)].append(e)
    cors = [g for g in groups.values() if len(g) >= 2 and any(math.cos(strand_heading(g[0]) - strand_heading(x)) < -0.6 for x in g)]
    log(f'上下線の統合：候補 {len(cand)} 本、組 {pairs}、corridor {len(cors)}')
    return cors


def chain(strands, pool=()):
    """端点がつながる strand を順につなぐ。いちばん長い鎖を返す（点列, 含まれる strand）。
    pool：鎖のすき間を埋めてよい短い道路（同じ名前の一方通行。交差点の中の区間など）"""
    rest = list(strands)
    best = ([], [])
    pool = [e for e in pool if e not in rest]
    while rest:
        cur = rest.pop(0); pts = list(cur.pts); members = [cur]
        grown = True
        while grown:
            grown = False
            for e in list(rest):
                if dist(e.a, pts[-1]) < 0.01:
                    pts += e.pts[1:]; members.append(e); rest.remove(e); grown = True
                elif dist(e.b, pts[0]) < 0.01:
                    pts = e.pts[:-1] + pts; members.insert(0, e); rest.remove(e); grown = True
            if not grown:
                for e in list(pool):
                    if e.length() > 60 or e in members:
                        continue
                    if dist(e.a, pts[-1]) < 0.01:
                        pts += e.pts[1:]; members.append(e); pool.remove(e); grown = True; break
                    if dist(e.b, pts[0]) < 0.01:
                        pts = e.pts[:-1] + pts; members.insert(0, e); pool.remove(e); grown = True; break
        if plen(pts) > plen(best[0]):
            best = (pts, members)
    return best


def make_center(ref_pts, others):
    """参照線（片側）と反対側の線から中心線を作る。(中心線, 間隔の中央値, 反対側が見つかった割合)"""
    L = plen(ref_pts); n = max(2, int(L / 4))
    mid = []; seps = []; hit = 0
    for i in range(n + 1):
        P, h = point_at(ref_pts, L * i / n)
        best = None
        for e in others:
            d, s, t, hb = nearest_on(e.pts, P)
            if d < 60 and (best is None or d < best[0]):
                best = (d, e, s)
        if best:
            d, e, s = best
            Q, _ = point_at(e.pts, s)
            mid.append(((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)); seps.append(d); hit += 1
        else:
            mid.append(P)
    sm = []
    for i in range(len(mid)):
        xs = [mid[j] for j in range(max(0, i - 2), min(len(mid), i + 3))]
        sm.append((sum(p[0] for p in xs) / len(xs), sum(p[1] for p in xs) / len(xs)))
    sm[0] = mid[0]; sm[-1] = mid[-1]
    seps.sort()
    return simplify_dp(sm, 0.35), (seps[len(seps) // 2] if seps else 10), hit / (n + 1)


def lanes_mode(strands, cls):
    """車線数：タグのある区間の最頻値。なければ種類ごとの既定（片側）"""
    vals = [e.lanes for e in strands if e.lanes]
    if vals:
        return min(4, collections.Counter(vals).most_common(1)[0][0])
    return 3 if cls == 'trunk' else 2 if cls in ('primary', 'secondary') else 1


def covered_by(e, center, band):
    pts = samples(e.pts, 6)
    return sum(1 for p in pts if nearest_on(center, p)[0] < band) >= 0.7 * len(pts)


def merge_corridor(edges, cor, nodes_moved, log):
    """corridor の上下線をひとつの道路にする。交差する道路の端は新しい中心線へ付け替える。
    片側の線がつながらない所は、つながる鎖ごとに中心線を作る。中心線でおおえない線は、そのまま残す"""
    ref0 = max(cor, key=lambda e: e.length())
    h0 = strand_heading(ref0)
    F = [e for e in cor if math.cos(strand_heading(e) - h0) > 0]
    Bk = [e for e in cor if e not in F]
    if not Bk:
        return None
    key = name_key(ref0.name)
    pool = [e for e in edges if e.oneway and e not in cor and name_key(e.name) == key]
    w = LANE_W[gtype(ref0.cls)]
    out = []
    consumed = set()
    remaining = list(F)
    while remaining:
        ref_pts, members = chain(remaining, pool)
        for m in members:
            if m in remaining:
                remaining.remove(m)
        if plen(ref_pts) < 30:
            continue
        center, sep, frac = make_center(ref_pts, Bk)
        if frac < 0.5:
            continue  # 反対側がない：一方通行のまま残す
        bside = [e for e in Bk if covered_by(e, center, sep / 2 + 8)]
        nF = lanes_mode([e for e in members if e in F], ref0.cls)
        nB = lanes_mode(bside, ref0.cls) if bside else nF
        med = max(0.6, min(8.0, sep - (nF + nB) * w / 2))
        used = set(members) | set(bside)
        for e in used:
            consumed.add(id(e))
        # corridor 上の点（使った strand の端点）を中心線へ写す
        old_nodes = set()
        for e in used:
            old_nodes.add(e.a); old_nodes.add(e.b)
        proj = {}
        for pnt in old_nodes:
            d, s, t, h = nearest_on(center, pnt)
            if d < sep / 2 + 25:
                proj[pnt] = s
        items = sorted(proj.items(), key=lambda kv: kv[1])
        clusters = []
        for pnt, s in items:
            if clusters and s - clusters[-1][-1][1] < 14:
                clusters[-1].append((pnt, s))
            else:
                clusters.append([(pnt, s)])
        newnode = {}
        stops = []
        for cl in clusters:
            s = sum(x[1] for x in cl) / len(cl)
            s = max(0, min(plen(center), s))
            P, _ = point_at(center, s)
            P = (round(P[0], 2), round(P[1], 2))
            for pnt, _s in cl:
                newnode[pnt] = P
            stops.append((s, P))
        # 交差する道路の端を付け替え
        for e in edges:
            if id(e) in consumed:
                continue
            for end in (0, 1):
                pnt = e.a if end == 0 else e.b
                if pnt in newnode:
                    q = newnode[pnt]
                    pts = list(e.pts)
                    if end == 0:
                        while len(pts) > 2 and nearest_on(center, pts[1])[0] < sep / 2 + 1.5:
                            pts.pop(1)
                        pts[0] = q
                    else:
                        while len(pts) > 2 and nearest_on(center, pts[-2])[0] < sep / 2 + 1.5:
                            pts.pop(-2)
                        pts[-1] = q
                    e.pts = pts
                    nodes_moved[pnt] = q
        # 中心線を交差点ごとに分ける
        stops.sort()
        cuts = [0.0] + [s for s, P in stops if 0.5 < s < plen(center) - 0.5] + [plen(center)]
        segs = 0
        for s0, s1 in zip(cuts, cuts[1:]):
            if s1 - s0 < 1.0:
                continue
            seg = cut_back(cut_front(center, s0), plen(center) - s1)
            for s, P in stops:
                if abs(s - s0) < 0.6:
                    seg[0] = P
                if abs(s - s1) < 0.6:
                    seg[-1] = P
            ne = Edge(-1, seg, ref0.cls, name_key(ref0.name), None, False, ref0.maxspeed, ref0.bridge, ref0.layer)
            ne.nF, ne.nB, ne.med, ne.merged = nF, nB, round(med, 2), True
            out.append(ne); segs += 1
        log(f'  {key}: 上下線 {len(members)}+{len(bside)} 本 → {segs} 区間、車線 {nF}+{nB}、間隔 {sep:.1f} m、分離帯 {med:.1f} m')
    # 使った strand を消す。両端が同じ新しい点になった道路（分離帯を横切る短い連絡路）も消す
    for e in list(edges):
        if id(e) in consumed:
            edges.remove(e)
        elif e.a == e.b or e.length() < 2:
            edges.remove(e)
    return out


def merge_all_corridors(edges, log):
    cors = find_corridors(edges, log)
    moved = {}
    newid = max(e.id for e in edges) + 1
    for cor in cors:
        cor = [e for e in cor if e in edges]
        if len(cor) < 2:
            continue
        res = merge_corridor(edges, cor, moved, log)
        if res:
            for e in res:
                e.id = newid; newid += 1
                edges.append(e)
    return edges


# ---- 範囲で切る・出入口 ----
def clip_edges(edges, half):
    out = []
    for e in edges:
        pts = e.pts
        inside = [abs(p[0]) <= half and abs(p[1]) <= half for p in pts]
        if not any(inside):
            continue
        # 最初の内側の点から最後の内側の点まで。境界との交点を端にする
        i0 = inside.index(True); i1 = len(pts) - 1 - inside[::-1].index(True)
        seg = pts[i0:i1 + 1]
        if i0 > 0:
            seg = [border_point(pts[i0 - 1], pts[i0], half)] + seg; e.dead0 = 'portal'
        if i1 < len(pts) - 1:
            seg = seg + [border_point(pts[i1 + 1], pts[i1], half)]; e.dead1 = 'portal'
        if len(seg) >= 2 and plen(seg) > 3:
            e.pts = seg; out.append(e)
    return out


def border_point(outp, inp, half):
    """outp（外）と inp（内）を結ぶ線が境界と交わる点"""
    best = inp
    for axis in (0, 1):
        for sgn in (-1, 1):
            v = sgn * half
            if (outp[axis] - v) * (inp[axis] - v) <= 0 and abs(outp[axis] - inp[axis]) > 1e-9:
                k = (v - inp[axis]) / (outp[axis] - inp[axis])
                p = (inp[0] + (outp[0] - inp[0]) * k, inp[1] + (outp[1] - inp[1]) * k)
                if abs(p[1 - axis]) <= half + 1e-6:
                    return (round(p[0], 2), round(p[1], 2))
    return best


# ---- 交差点：脚の割り当て ----
LEGS = ['N', 'E', 'S', 'W']


def leg_of(h):
    """向き h（0=北、+π/2=東）→ 方角"""
    d = (math.degrees(h) + 360) % 360
    return 'N' if d < 45 or d >= 315 else 'E' if d < 135 else 'S' if d < 225 else 'W'


def leg_candidates(h):
    """方角の候補：近い順に (ずれの角度, 方角)。ずれが100度を超えるものは候補にしない"""
    d = (math.degrees(h) + 360) % 360
    centers = {'N': 0, 'E': 90, 'S': 180, 'W': 270}
    diffs = sorted(((min(abs(d - c), 360 - abs(d - c)), L) for L, c in centers.items()))
    return [(dd, L) for dd, L in diffs if dd <= 100]


def best_assignment(items):
    """items: [(rank, [(dev, leg), ...]), ...] → 各道路の方角（None=入らない）。
    入る道路のランクの合計がいちばん大きく、そのうえでずれの合計がいちばん小さい割り当てを総当たりで探す"""
    n = len(items)
    best = (None, None)
    def rec(i, taken, cur, score, dev):
        nonlocal best
        if i == n:
            key = (score, -dev)
            if best[0] is None or key > best[0]:
                best = (key, list(cur))
            return
        rank, cands = items[i]
        w = 10 - rank
        for dd, L in cands:
            if L in taken:
                continue
            taken.add(L); cur.append(L)
            rec(i + 1, taken, cur, score + w * 10, dev + dd)
            taken.discard(L); cur.pop()
        cur.append(None)
        rec(i + 1, taken, cur, score, dev)
        cur.pop()
    rec(0, set(), [], 0, 0.0)
    return best[1]


def out_heading(e, end):
    """交差点（端 end）から見た道路の出ていく向き（最初の約12m）"""
    pts = e.pts if end == 0 else list(reversed(e.pts))
    P, _ = point_at(pts, min(12, plen(pts) * 0.6))
    return heading(pts[0], P) if dist(pts[0], P) > 0.3 else heading(pts[0], pts[1])


def assign_legs(edges, log):
    """各交差点で脚（方角）を割り当てる。同じ方角に2本以上入って置けない道路は、重要でない方を交差点の手前で切る"""
    detached = 0
    deleted = 0
    for _round in range(10):
        changed = False
        alive = set(id(e) for e in edges)
        inc = incidence(edges)
        for e in edges:
            e.leg0 = e.leg1 = None
        for p, lst in list(inc.items()):
            lst = [t for t in lst if id(t[0]) in alive]
            if len(lst) < 2:
                continue
            lst.sort(key=lambda t: (t[0].rank, -t[0].length()))
            items = [(e.rank, leg_candidates(out_heading(e, end))) for e, end in lst]
            got = best_assignment(items)
            for (e, end), L in zip(lst, got):
                if L is None:
                    if e.rank <= 2:
                        log(f'  注意：{e.name or e.cls}（{e.cls}）を交差点 ({p[0]:.0f},{p[1]:.0f}) から外します。脚: ' + ','.join(f'{x.name or x.cls}:{leg_of(out_heading(x, xe))}' for x, xe in lst))
                    back = 18
                    if e.length() < back + 25:
                        edges.remove(e); alive.discard(id(e)); deleted += 1
                    else:
                        if end == 0:
                            e.pts = cut_front(e.pts, back); e.dead0 = 'dead'
                        else:
                            e.pts = cut_back(e.pts, back); e.dead1 = 'dead'
                        detached += 1
                    changed = True
                    continue
                if end == 0:
                    e.leg0 = L
                else:
                    e.leg1 = L
        if not changed:
            break
    log(f'交差点の脚：外した道路 {detached} 本、消した道路 {deleted} 本')
    return edges


def merge_close_nodes(edges, log):
    """近すぎる交差点（道路が短すぎて切れない）：短い道路を消して、両端の交差点をひとつにする"""
    merged = 0
    changed = True
    while changed:
        changed = False
        inc = incidence(edges)
        for e in list(edges):
            if e.dead0 or e.dead1:
                continue
            da, db = len(inc.get(e.a, [])), len(inc.get(e.b, []))
            if da < 2 or db < 2:
                continue
            # 隅切りを削っても 12m 残らない道路（停止線や信号の判定ができない）は、両端の交差点をひとつにする
            need = e.min0 + e.min1 + 12
            if e.length() >= max(need, 14):
                continue
            # 消して、b 側の点を a に寄せる（重要な方の交差点に）
            keep, drop = (e.a, e.b) if sum(x[0].rank for x in inc[e.a]) <= sum(x[0].rank for x in inc[e.b]) else (e.b, e.a)
            mid = ((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2)
            mid = (round(mid[0], 2), round(mid[1], 2))
            edges.remove(e)
            for f in edges:
                if f.a in (keep, drop):
                    f.pts[0] = mid
                if f.b in (keep, drop):
                    f.pts[-1] = mid
            merged += 1; changed = True
            break
    log(f'近すぎる交差点の統合：{merged}')
    return edges


# ---- 交差点の切り取り距離 ----
def compute_cuts(edges, log):
    """交差点ごとに、各道路の端をどこで切るか（交差点の中心からの距離）を決める。
    隣り合う脚の車道の縁が交わる点（corner）より手前で切り、隅切りと歩道の角のぶんを足す。
    交差点どうしが近くて道路が短くなりすぎる所は、隅切りのぶんを削って道路を残す"""
    inc = incidence(edges)
    for e in edges:
        e.cut0 = e.cut1 = 0
        e.min0 = e.min1 = 0
    for p, lst in inc.items():
        if len(lst) < 2:
            continue
        legs = []
        for e, end in lst:
            h = out_heading(e, end)
            hl, hr = e.half_widths()
            if end == 1:
                hl, hr = hr, hl
            legs.append({'e': e, 'end': end, 'h': h, 'hl': hl, 'hr': hr, 'corner': 0.0, 'cut': 0.0})
        legs.sort(key=lambda g: g['h'])
        n = len(legs)
        for i in range(n):
            g1 = legs[i]; g2 = legs[(i + 1) % n]
            phi = wrap(g2['h'] - g1['h'])
            if phi < 0:
                phi += 2 * math.pi
            if n == 1 or phi <= 0.05 or phi >= math.pi - 0.05:
                corner = 4.0
            else:
                sn = math.sin(phi); c = math.cos(phi)
                t1 = (g2['hl'] + g1['hr'] * c) / sn
                t2 = (g1['hr'] + g2['hl'] * c) / sn
                corner = min(30.0, max(t1, t2))
            r_corner = 3.0 if max(g1['e'].rank, g2['e'].rank) >= 4 else 5.0  # 隅切り
            for g in (g1, g2):
                g['corner'] = max(g['corner'], corner)
                g['cut'] = max(g['cut'], corner + r_corner)
        for g in legs:
            e = g['e']
            cut = max(g['cut'], 4.0, max(g['hl'], g['hr']) + e.walk() + 2.0) if n >= 2 else 0
            mn = max(g['corner'] + 1.0, 3.0) if n >= 2 else 0
            if g['end'] == 0:
                e.cut0 = round(cut, 2); e.min0 = round(mn, 2)
            else:
                e.cut1 = round(cut, 2); e.min1 = round(mn, 2)
    # 短い道路：両端の切り取りを最小限まで縮めて、22m 以上残るようにする
    shrunk = 0
    for e in edges:
        L = e.length()
        if L >= e.cut0 + e.cut1 + 22 or (e.cut0 == 0 and e.cut1 == 0):
            continue
        room = L - 22 - e.min0 - e.min1  # 最小限の切り取りをしたうえで、ゆとりに使える長さ
        ex0, ex1 = e.cut0 - e.min0, e.cut1 - e.min1
        if room >= 0 and ex0 + ex1 > 0:
            k = min(1.0, room / (ex0 + ex1))
            e.cut0 = round(e.min0 + ex0 * k, 2); e.cut1 = round(e.min1 + ex1 * k, 2); shrunk += 1
        else:
            e.cut0, e.cut1 = e.min0, e.min1
    short = [e for e in edges if e.length() < e.cut0 + e.cut1 + 22]
    log(f'切り取り距離：隅切りを削った道路 {shrunk} 本、それでも短い（切ったあと22m未満）{len(short)} 本')
    return edges


def seg_cross(a, b, c, d):
    def cr(o, p, q):
        return (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0])
    d1, d2, d3, d4 = cr(c, d, a), cr(c, d, b), cr(a, b, c), cr(a, b, d)
    if (d1 > 0) != (d2 > 0) and (d3 > 0) != (d4 > 0) and all(abs(x) > 1e-9 for x in (d1, d2, d3, d4)):
        t = d1 / (d1 - d2)
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    return None


def split_at(e, i, P, edges):
    """道路 e を区間 i の点 P で2本に分ける"""
    P = (round(P[0], 2), round(P[1], 2))
    pts1 = e.pts[:i + 1] + [P]; pts2 = [P] + e.pts[i + 1:]
    if plen(pts1) < 1 or plen(pts2) < 1:
        return None
    e2 = Edge(-1, pts2, e.cls, e.name, e.lanes, e.oneway, e.maxspeed, e.bridge, e.layer)
    e2.nF, e2.nB, e2.med, e2.merged, e2.dead1 = e.nF, e.nB, e.med, e.merged, e.dead1
    e.pts = pts1; e.dead1 = False
    e2.id = max(x.id for x in edges) + 1
    edges.append(e2)
    return e2


def fix_crossings(edges, log):
    """交差点を共有せずに交わっている道路：橋（layer>0）で十分に長ければ高架にし、そうでなければ平面の交差点を作る"""
    made = 0; elev = 0
    for _pass in range(8):
        pairs = []
        for i in range(len(edges)):
            A = edges[i]
            for j in range(i + 1, len(edges)):
                Bq = edges[j]
                for ia, (a, b) in enumerate(zip(A.pts, A.pts[1:])):
                    for ib, (c, d) in enumerate(zip(Bq.pts, Bq.pts[1:])):
                        P = seg_cross(a, b, c, d)
                        if P:
                            pairs.append((A, ia, Bq, ib, P))
        if not pairs:
            break
        touched = set()
        progress = False
        for A, ia, Bq, ib, P in pairs:
            if id(A) in touched or id(Bq) in touched:
                continue
            up = None
            for e in (A, Bq):
                if e.layer > 0 and e.length() >= 90:
                    up = e
            if up is not None:
                if not up.elev:
                    up.elev = (round(nearest_on(up.pts, P)[1], 1), 6.5); elev += 1; progress = True
                continue
            P = (round(P[0], 2), round(P[1], 2))
            for e, ie in ((A, ia), (Bq, ib)):
                if dist(e.pts[0], P) < 1.5:
                    e.pts[0] = P
                elif dist(e.pts[-1], P) < 1.5:
                    e.pts[-1] = P
                else:
                    split_at(e, ie, P, edges)
                touched.add(id(e))
            made += 1; progress = True
        if not progress:
            break
    log(f'交差点のない交わり：平面交差を追加 {made}、高架 {elev}')
    return edges


def drop_stubs(edges, log):
    """交差点から出てすぐ終わる短い行き止まり（切り取ると残らない）を消す"""
    inc = incidence(edges)
    n = 0
    for e in list(edges):
        da, db = len(inc.get(e.a, [])), len(inc.get(e.b, []))
        if da >= 2 and db >= 2:
            continue
        if e.length() < e.cut0 + e.cut1 + 12:
            edges.remove(e); n += 1
    log(f'短い行き止まりの削除：{n}')
    return edges


# ---- 交差点の制御（信号・一時停止） ----
def controls(edges):
    inc = incidence(edges)
    nodes = {}
    for p, lst in inc.items():
        if len(lst) < 2:
            continue
        ranks = sorted(e.rank for e, end in lst)
        legs = {}
        for e, end in lst:
            L = e.leg0 if end == 0 else e.leg1
            if L:
                legs[L] = (e, end)
        info = {'legs': legs, 'signal': None, 'stop': []}
        major = [L for L, (e, end) in legs.items() if e.rank <= 2]
        minor = [L for L, (e, end) in legs.items() if e.rank >= 3]
        for e, end in lst:
            e.set_lanes()
        wide = any(e.rank <= 2 and e.nF + e.nB >= 4 for e, end in lst)  # 片側2車線以上の大通り
        if len(lst) >= 3 and (len(major) >= 3 or (major and wide)):
            # 大通りどうし、または片側2車線以上の大通りに道路が入る所：信号（東京の幹線道路はほぼ信号つき）
            info['signal'] = {'g': {'NS': 22, 'EW': 18}}
            if any(e.nF and e.nF >= 2 and e.nB for e, end in lst):
                info['signal']['arrow'] = True
        elif len(lst) >= 3 and major and minor:
            # 大通りに小さい道路が入る：小さい道路の側が一時停止
            info['stop'] = minor
        elif len(lst) >= 3 and ranks[0] >= 3 and ranks[0] < ranks[-1]:
            info['stop'] = [L for L, (e, end) in legs.items() if e.rank > ranks[0]]
        nodes[p] = info
    return nodes


# ---- 建物 ----
def push_buildings(bld, edges, log):
    """建物の頂点が道路（歩道を含む）にかかっていれば、道路の外へ押し出す"""
    # 道路の空間索引
    G = 40
    grid = collections.defaultdict(list)
    for e in edges:
        hl, hr = e.half_widths(); wk = e.walk()
        band = max(hl, hr) + wk + 0.4
        for a, b in zip(e.pts, e.pts[1:]):
            x0, x1 = sorted((a[0], b[0])); z0, z1 = sorted((a[1], b[1]))
            for ix in range(int((x0 - band) // G), int((x1 + band) // G) + 1):
                for iz in range(int((z0 - band) // G), int((z1 + band) // G) + 1):
                    grid[(ix, iz)].append((a, b, e, band))
    moved = 0; dropped = 0
    out = []
    for b in bld:
        poly = [tuple(p) for p in b['poly']]
        if len(poly) >= 3 and poly[0] == poly[-1]:
            poly = poly[:-1]
        poly = simplify_dp(poly + [poly[0]], 0.35)[:-1] if len(poly) >= 4 else poly
        if len(poly) < 3:
            dropped += 1; continue
        area0 = abs(poly_area(poly))
        if area0 < 4:
            dropped += 1; continue
        newp = []
        far = False
        for p in poly:
            q = p
            for _ in range(3):
                cell = grid.get((int(q[0] // G), int(q[1] // G)), [])
                best = None
                for a, bb, e, band in cell:
                    d, s, t, h = nearest_on([a, bb], q)
                    if d < band and (best is None or band - d > best[0]):
                        best = (band - d, t, h, band)
                if not best:
                    break
                push, t, h, band = best
                rx, rz = math.cos(h), math.sin(h)
                sgn = 1 if t >= 0 else -1
                q = (q[0] + rx * sgn * (push + 0.05), q[1] + rz * sgn * (push + 0.05))
            if dist(q, p) > 14:
                far = True
            newp.append((round(q[0], 2), round(q[1], 2)))
        area1 = abs(poly_area(newp))
        if far or area1 < 6 or area1 < area0 * 0.3:
            dropped += 1; continue
        if newp != poly:
            moved += 1
        out.append({'p': newp, 'h': round(b['h'] or 3.0, 1), 'u': b.get('usage') or '', 'st': to_int(b.get('storeys')) or 0})
    log(f'建物：{len(out)} 棟（押し出し {moved}、除外 {dropped}）')
    return out


# ---- 出力 ----
def export(edges, nodes_ctl, data, bld, args, log):
    inc = incidence(edges)
    node_ids = {}
    nodes = []
    for p, lst in inc.items():
        if len(lst) >= 2:
            nid = f'n{len(nodes)}'
            node_ids[p] = nid
            ctl = nodes_ctl.get(p, {})
            nd = {'id': nid, 'x': p[0], 'z': p[1], 'kind': 'x'}
            if ctl.get('signal'):
                nd['signal'] = ctl['signal']
            if ctl.get('stop'):
                nd['stop'] = ctl['stop']
            nodes.append(nd)
    roads = []
    for i, e in enumerate(edges):
        e.set_lanes()
        t = gtype(e.cls)
        rd = {'id': f'r{i}', 'name': e.name, 'cls': e.cls, 'type': t, 'nF': e.nF, 'nB': e.nB, 'w': LANE_W[t], 'path': [[round(x, 2), round(z, 2)] for x, z in e.pts]}
        if e.nB and e.merged:
            rd['med'] = {'w': e.med, 'kind': 'zebra' if e.med < 1.6 else 'planter'}
        elif e.nB and e.nF + e.nB >= 4:
            rd['med'] = {'w': 0.5, 'kind': 'yellow'}
        if e.maxspeed:
            rd['limit'] = e.maxspeed
        elif t == 'ART':
            rd['limit'] = 50
        elif t == 'COL':
            rd['limit'] = 40
        if e.bridge:
            rd['bridge'] = True
        if e.elev:
            rd['elev'] = list(e.elev)
        if e.layer:
            rd['layer'] = e.layer
        if e.a in node_ids and not e.dead0:
            rd['from'] = node_ids[e.a]; rd['leg0'] = e.leg0; rd['cut0'] = e.cut0
        elif e.dead0 == 'portal':
            rd['portal0'] = True
        if e.b in node_ids and not e.dead1:
            rd['to'] = node_ids[e.b]; rd['leg1'] = e.leg1; rd['cut1'] = e.cut1
        elif e.dead1 == 'portal':
            rd['portal1'] = True
        roads.append(rd)
    rails = []
    for r in data.get('rails', []):
        if r.get('tunnel') == 'yes' or (to_int(r.get('layer')) or 0) < 0:
            continue
        pts = [p for p in r['pts'] if abs(p[0]) <= args.half + 60 and abs(p[1]) <= args.half + 60]
        if len(pts) >= 2:
            rails.append({'pts': [[round(x, 1), round(z, 1)] for x, z in pts], 'kind': r.get('type', 'rail'), 'name': r.get('name', '')})
    green = []
    for g in data.get('green', []):
        poly = [tuple(p) for p in g['poly']]
        if len(poly) >= 3 and abs(poly_area(poly)) > 150:
            green.append({'p': [[round(x, 1), round(z, 1)] for x, z in simplify_dp(poly, 1.0)], 'kind': g.get('kind', 'grass')})
    out = {'name': '新宿駅周辺', 'center_lonlat': data.get('center_lonlat'), 'half': args.half,
           'sources': ['© OpenStreetMap contributors（ODbL）', '国土交通省 Project PLATEAU（新宿区 2025）'],
           'nodes': nodes, 'roads': roads, 'buildings': bld, 'rails': rails, 'green': green,
           'stations': [{'name': s['name'], 'x': round(s['xz'][0], 1), 'z': round(s['xz'][1], 1)} for s in data.get('stations', [])]}
    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    import os
    log(f'書き出し：{args.out}（{os.path.getsize(args.out) / 1e6:.2f} MB）道路 {len(roads)} 本、交差点 {len(nodes)}、建物 {len(bld)} 棟、線路 {len(rails)}、緑地 {len(green)}')
    return out


def draw_png(out, path, half):
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return
    S = 1.0; W = int(half * 2 * S) + 40; ox = W / 2; oz = W / 2
    img = Image.new('RGB', (W, W), (246, 244, 240)); dr = ImageDraw.Draw(img)
    for b in out['buildings']:
        pts = [(ox + x * S, oz + z * S) for x, z in b['p']]
        h = b['h']; c = (218, 214, 206) if h < 15 else (196, 192, 188) if h < 40 else (160, 150, 160) if h < 100 else (115, 95, 125)
        dr.polygon(pts, fill=c)
    for g in out['green']:
        dr.polygon([(ox + x * S, oz + z * S) for x, z in g['p']], fill=(176, 208, 156))
    for r in out['rails']:
        dr.line([(ox + x * S, oz + z * S) for x, z in r['pts']], fill=(70, 70, 70), width=2)
    col = {'ART': (235, 170, 40), 'COL': (120, 160, 220), 'RES': (150, 150, 150)}
    for r in out['roads']:
        pts = [(ox + x * S, oz + z * S) for x, z in r['path']]
        wd = int((r['nF'] + r['nB']) * r['w'] * S * 0.5) + 1
        dr.line(pts, fill=col[r['type']], width=max(2, wd))
        if r['nB'] == 0:
            n = len(pts) // 2; (x0, y0), (x1, y1) = pts[max(0, n - 1)], pts[min(len(pts) - 1, n)]
            a = math.atan2(y1 - y0, x1 - x0); mx, my = (x0 + x1) / 2, (y0 + y1) / 2
            dr.line([(mx - 6 * math.cos(a - 0.5), my - 6 * math.sin(a - 0.5)), (mx, my), (mx - 6 * math.cos(a + 0.5), my - 6 * math.sin(a + 0.5))], fill=(0, 0, 0), width=2)
    for n in out['nodes']:
        x, z = ox + n['x'] * S, oz + n['z'] * S
        c = (230, 40, 40) if n.get('signal') else (40, 40, 200) if n.get('stop') else (30, 30, 30)
        dr.ellipse([x - 3, z - 3, x + 3, z + 3], fill=c)
    img.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--out', default='shinjuku_map.json')
    ap.add_argument('--png', default=None)
    ap.add_argument('--half', type=float, default=880)
    ap.add_argument('--classes', default='trunk,primary,secondary,tertiary,unclassified,trunk_link,primary_link,secondary_link,tertiary_link')
    a = ap.parse_args()
    log = print
    data = json.load(open(a.src, encoding='utf-8'))
    keep = set(a.classes.split(','))
    edges = build_edges(data, keep)
    log(f'道路の区間：{len(edges)}')
    edges = simplify(edges)
    log(f'単純化後：{len(edges)}')
    edges = merge_all_corridors(edges, log)
    edges = simplify(edges)
    edges = clip_edges(edges, a.half)
    log(f'範囲で切ったあと：{len(edges)}')
    edges = fix_crossings(edges, log)
    edges = assign_legs(edges, log)
    edges = compute_cuts(edges, log)
    edges = merge_close_nodes(edges, log)
    for _ in range(4):
        edges = assign_legs(edges, log)
        edges = compute_cuts(edges, log)
        n0 = len(edges)
        edges = merge_close_nodes(edges, log)
        edges = drop_stubs(edges, log)
        if len(edges) == n0:
            break
    edges = assign_legs(edges, log)
    edges = compute_cuts(edges, log)
    ctl = controls(edges)
    bld = push_buildings([b for b in data['plateau_buildings'] if all(abs(p[0]) <= a.half + 30 and abs(p[1]) <= a.half + 30 for p in b['poly'])], edges, log)
    out = export(edges, ctl, data, bld, a, log)
    if a.png:
        draw_png(out, a.png, a.half)


if __name__ == '__main__':
    main()
