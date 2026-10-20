#!/usr/bin/env node
// OSM の抽出データ（XML）から src/data/generated/osmData.ts を作る。
//
//   node scripts/osm/build.mjs <umeda.osm> [出力先]
//
// 抽出データの取得手順は scripts/osm/README.md を参照。
// 出力は © OpenStreetMap contributors の ODbL データベースの派生物。
import { writeFileSync } from 'node:fs';
import { parseOsm } from './parseOsm.mjs';
import { buildWalkGraph, components, distanceM, simplify } from './network.mjs';
import { AREA_POLYGONS, BUILDING_ANCHORS, ORIGIN, PLACES, POIS, REGION } from './overlay.mjs';

const [input, output = 'src/data/generated/osmData.ts'] = process.argv.slice(2);
if (!input) {
  console.error('usage: node scripts/osm/build.mjs <umeda.osm> [output.ts]');
  process.exit(1);
}

const M_PER_DEG_LAT = 111_320;
const COS0 = Math.cos((ORIGIN.lat * Math.PI) / 180);
const toPlane = (p) => ({
  x: (p.lon - ORIGIN.lng) * M_PER_DEG_LAT * COS0,
  y: (p.lat - ORIGIN.lat) * M_PER_DEG_LAT,
});
const fromPlane = (x, y) => ({
  lat: ORIGIN.lat + y / M_PER_DEG_LAT,
  lon: ORIGIN.lng + x / (M_PER_DEG_LAT * COS0),
});
const round6 = (v) => Math.round(v * 1e6) / 1e6;

const osm = parseOsm(input);
const wayById = new Map(osm.ways.map((w) => [w.id, w]));
const centroid = (way) => {
  const pts = way.nds.map((id) => osm.nodes.get(id)).filter(Boolean);
  const unique = way.nds[0] === way.nds.at(-1) ? pts.slice(0, -1) : pts;
  return {
    lat: unique.reduce((s, n) => s + n.lat, 0) / unique.length,
    lon: unique.reduce((s, n) => s + n.lon, 0) / unique.length,
  };
};
const osmRef = (ref) => {
  const kind = ref[0];
  const id = ref.slice(1);
  if (kind === 'N') return osm.nodes.get(id);
  const way = wayById.get(id);
  return way ? { ...centroid(way), tags: way.tags } : undefined;
};

// ---- 1. 地下の歩行グラフ
const walk = buildWalkGraph(osm, { bridgeM: 15, entranceAttachM: 30, minComponentSize: 1 });
const adj = walk.adj;
const inRegion = (n) => {
  const { x, y } = toPlane(n);
  return x >= REGION.minX && x <= REGION.maxX && y >= REGION.minY && y <= REGION.maxY;
};
for (const id of [...adj.keys()]) if (!inRegion(osm.nodes.get(id))) adj.delete(id);
for (const m of adj.values()) for (const id of [...m.keys()]) if (!adj.has(id)) m.delete(id);

// 各点のフロア（接する OSM の通路の level から）
const vertexLevels = new Map();
for (const way of osm.ways) {
  const lv = (way.tags.level ?? '')
    .split(/[;,]/)
    .map(Number)
    .filter((n) => Number.isFinite(n) && way.tags.level);
  for (const id of way.nds) {
    if (!adj.has(id)) continue;
    if (!vertexLevels.has(id)) vertexLevels.set(id, new Set());
    for (const l of lv) vertexLevels.get(id).add(l);
  }
}
const isEntranceId = new Set(walk.entrances.map((e) => e.id));
const placeFloor = new Map(PLACES.map((p) => [p.id, p.floor ?? 'B1']));
const floorOf = (id) => placeFloor.get(id) ?? floorOfVertex(id);
const floorOfVertex = (id) => {
  if (placeFloor.has(id)) return placeFloor.get(id);
  if (isEntranceId.has(id)) return '1F';
  const lv = [...(vertexLevels.get(id) ?? [])];
  if (lv.length > 0 && lv.every((l) => l <= -2)) return 'B2';
  if (lv.length > 0 && lv.every((l) => l >= 0)) return '1F';
  return 'B1';
};

// ---- 2. 名前のある場所を重ねる
const positions = new Map(); // id -> {lat, lon}
for (const id of adj.keys()) positions.set(id, osm.nodes.get(id));
const placeInfo = new Map(); // 最終ノード ID -> place
const rename = new Map(); // OSM 点 ID -> place ID

const placePosition = (p) => {
  if (p.osmNode) return osm.nodes.get(p.osmNode);
  if (p.osmWay) return centroid(wayById.get(p.osmWay));
  return fromPlane(p.x, p.y);
};
const nearestVertex = (pos, maxM, filter = () => true) => {
  let best = null;
  for (const id of adj.keys()) {
    if (rename.has(id) || isEntranceId.has(id) || !filter(id)) continue;
    const d = distanceM(pos, positions.get(id));
    if (d <= maxM && (!best || d < best.d)) best = { id, d };
  }
  return best;
};

for (const place of PLACES) {
  const pos = placePosition(place);
  if (!pos) throw new Error(`place ${place.id}: OSM element not found`);
  const snap = place.noSnap ? null : nearestVertex(pos, 30);
  if (snap) {
    rename.set(snap.id, place.id);
    placeInfo.set(place.id, {
      ...place,
      lat: positions.get(snap.id).lat,
      lon: positions.get(snap.id).lon,
    });
  } else {
    placeInfo.set(place.id, { ...place, lat: pos.lat, lon: pos.lon });
  }
}
// rename を反映した隣接リストへ
const g = new Map();
const nid = (id) => rename.get(id) ?? id;
for (const [a, m] of adj) {
  const A = nid(a);
  if (!g.has(A)) g.set(A, new Map());
  for (const [b, e] of m) g.get(A).set(nid(b), e);
}
for (const [id, place] of placeInfo) {
  positions.set(id, { lat: place.lat, lon: place.lon });
  if (!g.has(id)) g.set(id, new Map());
}
const link = (a, b, attrs) => {
  const d = Math.max(1, distanceM(positions.get(a), positions.get(b)) * 1.15);
  g.get(a).set(b, { lengthM: d, attrs });
  g.get(b).set(a, { lengthM: d, attrs });
};
// 場所は最大の連結成分（主な通路網）につなぐ（小さな切れ端につなぐと孤立する）
const rawComp = components(g);
const compSize = new Map();
for (const c of rawComp.values()) compSize.set(c, (compSize.get(c) ?? 0) + 1);
const mainRawComp = [...compSize].sort((x, y) => y[1] - x[1])[0][0];
const snapped = new Set(rename.values());

/** 主な通路網の中で pos に最も近い線分と、その上の最寄り点 */
const nearestSegment = (pos) => {
  const p = toPlane(pos);
  let best = null;
  for (const [a, m] of g) {
    if (rawComp.get(a) !== mainRawComp || floorOfVertex(a) === '1F') continue;
    for (const [b, e] of m) {
      if (a >= b || rawComp.get(b) !== mainRawComp || floorOfVertex(b) === '1F') continue;
      if (e.attrs.length > 0) continue;
      const A = toPlane(positions.get(a));
      const B = toPlane(positions.get(b));
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.min(1, Math.max(0, ((p.x - A.x) * dx + (p.y - A.y) * dy) / len2));
      const d = Math.hypot(A.x + t * dx - p.x, A.y + t * dy - p.y);
      if (!best || d < best.d) best = { a, b, t, d, e };
    }
  }
  return best;
};

/** 線分 a-b の途中（割合 t）に点 id を入れる */
const insertOnSegment = ({ a, b, t, e }, id) => {
  const A = positions.get(a);
  const B = positions.get(b);
  positions.set(id, { lat: A.lat + (B.lat - A.lat) * t, lon: A.lon + (B.lon - A.lon) * t });
  vertexLevels.set(id, new Set([-1]));
  if (!g.has(id)) g.set(id, new Map());
  g.get(a).delete(b);
  g.get(b).delete(a);
  const first = { lengthM: Math.max(1, e.lengthM * t), attrs: [] };
  const second = { lengthM: Math.max(1, e.lengthM * (1 - t)), attrs: [] };
  g.get(a).set(id, first);
  g.get(id).set(a, first);
  g.get(id).set(b, second);
  g.get(b).set(id, second);
  rawComp.set(id, mainRawComp);
};

// 1周目: 通路の上（25m 以内）にある場所は通路の途中に入れ、離れた場所（改札など）は
// 通路上の最寄り点から枝を出してつなぐ
const ON_CORRIDOR_M = 25;
for (const [id, place] of placeInfo) {
  if (place.link || snapped.has(id)) continue;
  const seg = nearestSegment(positions.get(id));
  if (!seg || seg.d > 150) throw new Error(`place ${id}: no corridor within 150m`);
  if (seg.d <= ON_CORRIDOR_M && !place.noSnap) {
    insertOnSegment(seg, id);
    placeInfo.set(id, { ...place, lat: positions.get(id).lat, lon: positions.get(id).lon });
  } else {
    const junction = `${id}~link`;
    insertOnSegment(seg, junction);
    const differentFloor = (place.floor ?? 'B1') !== 'B1';
    link(id, junction, place.linkAttrs ?? (differentFloor ? ['stairs'] : []));
  }
}
// 番号付きの出入口で、主な通路網につながっていないもの（30m より離れている・切れ端にある）は
// 80m 以内の通路の最寄り点から階段でつなぐ
const EXIT_LINK_M = 80;
for (const e of walk.entrances) {
  if (!e.tags.ref || !inRegion(e)) continue;
  if (g.has(e.id) && rawComp.get(e.id) === mainRawComp) continue;
  const seg = nearestSegment(e);
  if (!seg || seg.d > EXIT_LINK_M) continue;
  const junction = `${e.id}~exit`;
  insertOnSegment(seg, junction);
  positions.set(e.id, e);
  if (!g.has(e.id)) g.set(e.id, new Map());
  link(e.id, junction, ['stairs']);
  rawComp.set(e.id, mainRawComp);
}
// 2周目: 場所どうしのつながり（ノースモールなど OSM に通路がない所）
for (const [id, place] of placeInfo) {
  if (place.link) for (const other of place.link) link(id, other, place.linkAttrs ?? []);
}

// ---- 3. 縮約
const keep = new Set([...placeInfo.keys()]);
for (const e of walk.entrances) if (g.has(e.id) && e.tags.ref) keep.add(e.id);
// 2つ以上の出口につながる点は残す（縮約で消すと出口どうしが直接つながってしまう）
for (const [id, m] of g) {
  const exits = [...m.keys()].filter((o) => isEntranceId.has(o) && osm.nodes.get(o)?.tags.ref);
  if (exits.length >= 2) keep.add(id);
}
let net = simplify(g, keep);

// 連結成分: JR大阪駅 御堂筋口を含む成分だけ残す
const comp = components(net);
const main = comp.get('st-jr-midosuji');
for (const id of [...net.keys()]) if (comp.get(id) !== main) net.delete(id);
for (const m of net.values()) for (const id of [...m.keys()]) if (!net.has(id)) m.delete(id);

// 番号のない出入口は、行き止まりなら落とす（出口番号が必須のため）
for (const id of [...net.keys()]) {
  if (!isEntranceId.has(id) || osm.nodes.get(id).tags.ref) continue;
  if (net.get(id).size <= 1) {
    for (const other of net.get(id).keys()) net.get(other).delete(id);
    net.delete(id);
  }
}
net = simplify(net, keep);

// 出口を通らずには主な通路網へ行けない小さなかたまり（階段の踊り場など）は、
// 主な通路網の最寄り点が近ければ直接つなぐ。出口は経路の途中では通らない（地上に出てしまう）ため
const FRAGMENT_LINK_M = 20;
const isExitNode = (id) => isEntranceId.has(id) && osm.nodes.get(id)?.tags.ref !== undefined;
const withoutExits = new Map(
  [...net]
    .filter(([id]) => !isExitNode(id))
    .map(([id, m]) => [id, new Map([...m].filter(([other]) => !isExitNode(other)))]),
);
const fragComp = components(withoutExits);
const fragSize = new Map();
for (const c of fragComp.values()) fragSize.set(c, (fragSize.get(c) ?? 0) + 1);
const mainFrag = fragComp.get('st-jr-midosuji');
let fragmentLinks = 0;
for (const c of fragSize.keys()) {
  if (c === mainFrag) continue;
  const members = [...fragComp].filter(([, k]) => k === c).map(([id]) => id);
  let best = null;
  for (const a of members)
    for (const [b, k] of fragComp) {
      if (k !== mainFrag) continue;
      const d = distanceM(positions.get(a), positions.get(b));
      if (!best || d < best.d) best = { a, b, d };
    }
  if (!best || best.d > FRAGMENT_LINK_M) continue;
  const lengthM = Math.max(1, best.d * 1.15);
  const attrs = floorOf(best.a) === floorOf(best.b) ? [] : ['stairs'];
  net.get(best.a).set(best.b, { lengthM, attrs });
  net.get(best.b).set(best.a, { lengthM, attrs });
  fragmentLinks += 1;
}

// ---- 4. エリア判定（OSM の地下街ポリゴン）
const polygons = Object.entries(AREA_POLYGONS).map(([area, name]) => {
  const way = osm.ways.find((w) => w.tags.name === name && w.nds[0] === w.nds.at(-1));
  if (!way) throw new Error(`area polygon not found: ${name}`);
  return { area, pts: way.nds.map((id) => toPlane(osm.nodes.get(id))) };
});
const inside = (p, pts) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    if (
      pts[i].y > p.y !== pts[j].y > p.y &&
      p.x < ((pts[j].x - pts[i].x) * (p.y - pts[i].y)) / (pts[j].y - pts[i].y) + pts[i].x
    )
      c = !c;
  }
  return c;
};
const areaOf = (id) => {
  if (placeInfo.has(id)) return placeInfo.get(id).area;
  const p = toPlane(positions.get(id));
  return polygons.find((poly) => inside(p, poly.pts))?.area ?? 'station';
};

// 地下街（OSM の地下街ポリゴン）の中の行き止まり（階段の下端など）は、同じ地下街の
// 近くの通路とつなぐ（今の経路が大回りのときだけ）。地下街の中は歩ける床なので、
// OSM で線がつながっていないだけとみなす
const DEAD_END_LINK_M = 25;
const polygonAreaOf = (id) => {
  const p = toPlane(positions.get(id));
  return polygons.find((poly) => inside(p, poly.pts))?.area;
};
/** 出口を通らずに a から b へ行く距離（limit を超えたら Infinity） */
const pathLengthM = (a, b, limit) => {
  const dist = new Map([[a, 0]]);
  const queue = [[0, a]];
  while (queue.length > 0) {
    queue.sort((x, y) => x[0] - y[0]);
    const [d, u] = queue.shift();
    if (u === b) return d;
    if (d > limit || d > dist.get(u)) continue;
    if (u !== a && isExitNode(u)) continue;
    for (const [v, e] of net.get(u)) {
      const nd = d + e.lengthM;
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd);
        queue.push([nd, v]);
      }
    }
  }
  return Infinity;
};
let deadEndLinks = 0;
for (const [id, m] of net) {
  if (isExitNode(id)) continue;
  const inner = [...m.keys()].filter((o) => !isExitNode(o));
  if (inner.length !== 1) continue;
  const area = polygonAreaOf(id);
  if (area === undefined) continue;
  let best = null;
  for (const other of net.keys()) {
    if (other === id || other === inner[0] || isExitNode(other) || m.has(other)) continue;
    if (polygonAreaOf(other) !== area || floorOf(other) !== floorOf(id)) continue;
    const d = distanceM(positions.get(id), positions.get(other));
    if (d <= DEAD_END_LINK_M && (!best || d < best.d)) best = { other, d };
  }
  // すでに近い経路でつながっているなら足さない
  if (!best || pathLengthM(id, best.other, best.d * 3 + 50) <= best.d * 3 + 50) continue;
  const edge = { lengthM: Math.max(1, best.d * 1.15), attrs: [] };
  m.set(best.other, edge);
  net.get(best.other).set(id, edge);
  deadEndLinks += 1;
}

// ビルの B1（大阪駅前第1・第2・第4ビル）はフロア全体が歩けるので、建物の外形の中か
// 外形から 15m 以内にある B1 の通路の点すべてとつなぐ（建物の中心から1本だけだと大回りになる）
const BUILDING_EDGE_M = 15;
const segmentDistance = (p, a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.min(
    1,
    Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
};
let buildingLinks = 0;
for (const anchor of BUILDING_ANCHORS) {
  if (!anchor.osmWay || !net.has(anchor.node)) continue;
  const pts = wayById.get(anchor.osmWay).nds.map((id) => toPlane(osm.nodes.get(id)));
  const center = positions.get(anchor.node);
  for (const id of net.keys()) {
    if (id === anchor.node || isExitNode(id) || placeInfo.get(id)?.kind === 'landmark') continue;
    if (floorOf(id) !== 'B1' || net.get(anchor.node).has(id)) continue;
    const p = toPlane(positions.get(id));
    let edgeM = Infinity;
    for (let i = 0; i < pts.length - 1; i += 1)
      edgeM = Math.min(edgeM, segmentDistance(p, pts[i], pts[i + 1]));
    if (!inside(p, pts) && edgeM > BUILDING_EDGE_M) continue;
    const edge = {
      lengthM: Math.max(1, distanceM(center, positions.get(id)) * 1.15),
      attrs: [],
    };
    net.get(anchor.node).set(id, edge);
    net.get(id).set(anchor.node, edge);
    buildingLinks += 1;
  }
}

// ---- 5. 店舗（OSM の地下の店）
const levelsOf = (t) =>
  (t.level ?? '')
    .split(/[;,]/)
    .map(Number)
    .filter((n) => Number.isFinite(n) && t.level);
const SERVICE_AMENITY = new Set(['bank', 'atm', 'clinic', 'dentist', 'post_office', 'pharmacy']);
const FOOD_AMENITY = new Set(['restaurant', 'fast_food', 'pub', 'bar', 'food_court', 'biergarten']);
const category = (t) => {
  if (FOOD_AMENITY.has(t.amenity)) return 'restaurant';
  if (t.amenity === 'cafe' || t.amenity === 'ice_cream') return 'cafe';
  if (t.amenity === 'pharmacy' || ['chemist', 'cosmetics', 'medical_supply'].includes(t.shop))
    return 'drugstore';
  if (SERVICE_AMENITY.has(t.amenity)) return 'service';
  if (['bakery', 'confectionery', 'pastry'].includes(t.shop)) return 'bakery';
  if (['convenience', 'supermarket'].includes(t.shop)) return 'convenience';
  if (['books'].includes(t.shop)) return 'bookstore';
  if (
    [
      'clothes',
      'shoes',
      'bag',
      'fashion',
      'fashion_accessories',
      'jewelry',
      'boutique',
      'watches',
    ].includes(t.shop)
  )
    return 'fashion';
  if (
    [
      'hairdresser',
      'beauty',
      'massage',
      'repair',
      'laundry',
      'dry_cleaning',
      'travel_agency',
      'ticket',
      'mobile_phone',
      'copyshop',
      'tailor',
      'shoe_repair',
      'optician',
    ].includes(t.shop)
  )
    return 'service';
  return 'goods';
};
const shopCandidates = [];
for (const n of osm.nodes.values())
  shopCandidates.push({ ref: `N${n.id}`, lat: n.lat, lon: n.lon, tags: n.tags });
for (const w of osm.ways)
  if (w.tags.name && (w.tags.shop || w.tags.amenity))
    shopCandidates.push({ ref: `W${w.id}`, ...centroid(w), tags: w.tags });
// 店舗の取り付け: 近くの点（25m 以内）か、通路の途中（45m 以内）に点を足して付ける。
// 縮約で長い通路（ドーチカなど）は途中に点がないため、途中に点を足す。
const NODE_ATTACH_M = 25;
const EDGE_ATTACH_M = 45;
const MERGE_SPLIT_M = 20;
const candidates = [];
const seenShop = new Set();
for (const s of shopCandidates) {
  const t = s.tags;
  if (
    !t.name ||
    !(
      t.shop ||
      FOOD_AMENITY.has(t.amenity) ||
      ['cafe', 'ice_cream', 'pharmacy', ...SERVICE_AMENITY].includes(t.amenity)
    )
  )
    continue;
  if (['mall', 'department_store'].includes(t.shop)) continue;
  const lv = levelsOf(t);
  if (!lv.some((l) => l < 0) || !inRegion(s)) continue;
  // level=-2 でも、近く（60m）に B2 の点がない地下街（ディアモールなど）は地下の主フロアとして扱う
  const b2Nearby = [...net.keys()].some(
    (id) => floorOf(id) === 'B2' && distanceM(s, positions.get(id)) <= 60,
  );
  candidates.push({ s, wantB2: lv.every((l) => l <= -2) && b2Nearby });
}
const floorOk = (id, wantB2) => {
  const f = floorOf(id);
  return f !== '1F' && (f === 'B2') === wantB2;
};
const splits = new Map(); // "a|b" -> [{t, shops: []}]
let splitCount = 0;
const attachToNode = new Map(); // shop index -> node id
const anchors = BUILDING_ANCHORS.map((a) => ({
  ...a,
  pts: a.osmWay ? wayById.get(a.osmWay).nds.map((id) => toPlane(osm.nodes.get(id))) : null,
}));
candidates.forEach(({ s, wantB2 }, index) => {
  const p = toPlane(s);
  const anchor = anchors.find((a) =>
    a.pts ? inside(p, a.pts) : distanceM(s, positions.get(a.node)) <= a.radiusM,
  );
  if (anchor && net.has(anchor.node)) {
    attachToNode.set(index, anchor.node);
    return;
  }
  let bestNode = null;
  for (const id of net.keys()) {
    if (!floorOk(id, wantB2)) continue;
    const d = distanceM(s, positions.get(id));
    if (!bestNode || d < bestNode.d) bestNode = { id, d };
  }
  if (bestNode && bestNode.d <= NODE_ATTACH_M) {
    attachToNode.set(index, bestNode.id);
    return;
  }
  let bestEdge = null;
  for (const [a, m] of net) {
    if (!floorOk(a, wantB2)) continue;
    for (const [b, e] of m) {
      if (a >= b || !floorOk(b, wantB2) || e.attrs.length > 0) continue;
      const A = toPlane(positions.get(a));
      const B = toPlane(positions.get(b));
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;
      const t = Math.min(1, Math.max(0, ((p.x - A.x) * dx + (p.y - A.y) * dy) / len2));
      const d = Math.hypot(A.x + t * dx - p.x, A.y + t * dy - p.y);
      if (!bestEdge || d < bestEdge.d) bestEdge = { a, b, t, d };
    }
  }
  const edgeIsBetter =
    bestEdge && bestEdge.d <= EDGE_ATTACH_M && (!bestNode || bestEdge.d < bestNode.d - 5);
  if (edgeIsBetter) {
    const key = `${bestEdge.a}|${bestEdge.b}`;
    if (!splits.has(key)) splits.set(key, []);
    splits.get(key).push({ t: bestEdge.t, index });
  } else if (bestNode && bestNode.d <= EDGE_ATTACH_M) {
    attachToNode.set(index, bestNode.id);
  }
});
// 通路を分割して点を足す
for (const [key, list] of splits) {
  const [a, b] = key.split('|');
  const e = net.get(a).get(b);
  const A = positions.get(a);
  const B = positions.get(b);
  const total = distanceM(A, B);
  list.sort((x, y) => x.t - y.t);
  const groups = [];
  for (const item of list) {
    const last = groups.at(-1);
    if (last && (item.t - last.t) * total < MERGE_SPLIT_M) last.items.push(item);
    else groups.push({ t: item.t, items: [item] });
  }
  net.get(a).delete(b);
  net.get(b).delete(a);
  let prev = a;
  let prevT = 0;
  groups.forEach((group) => {
    const t = group.items.reduce((sum, i) => sum + i.t, 0) / group.items.length;
    if (t * total < 5 || (1 - t) * total < 5) {
      const end = t < 0.5 ? a : b;
      for (const item of group.items) attachToNode.set(item.index, end);
      return;
    }
    splitCount += 1;
    const id = `split~${splitCount}`;
    positions.set(id, { lat: A.lat + (B.lat - A.lat) * t, lon: A.lon + (B.lon - A.lon) * t });
    vertexLevels.set(id, new Set([-1]));
    net.set(id, new Map());
    const seg = { lengthM: Math.max(1, e.lengthM * (t - prevT)), attrs: [] };
    net.get(prev).set(id, seg);
    net.get(id).set(prev, seg);
    for (const item of group.items) attachToNode.set(item.index, id);
    prev = id;
    prevT = t;
  });
  const last = { lengthM: Math.max(1, e.lengthM * (1 - prevT)), attrs: [] };
  net.get(prev).set(b, last);
  net.get(b).set(prev, last);
}
const netIds = [...net.keys()];
const shops = [];
for (const [index, nodeId] of attachToNode) {
  const { s } = candidates[index];
  const t = s.tags;
  const ja = t['name:ja'] ?? t.name;
  const key = `${ja}@${nodeId}`;
  if (seenShop.has(key)) continue;
  seenShop.add(key);
  const en = t['name:en'] ?? t['brand:en'] ?? (/^[\x20-\x7e]+$/.test(t.name) ? t.name : ja);
  shops.push({ id: `osm-${s.ref.toLowerCase()}`, name: { ja, en }, category: category(t), nodeId });
}

// ---- 5b. 地下とつながる駅ビル・商業ビルの中の店（地上階も含む）
// 地下の通路網が建物の真下を通っている（通路の点が建物の外形の中にある）ビルと、番号付きの出口が
// 建物の中か縁にあるビルを、地下とつながるビルとみなす。店は、店を含むいちばん小さな名前付きの建物を表示名にし、その建物（またはそれを
// 含む建物）の中の通路の点に付ける。階は level（0 → 1F、-1 → B1）
const BUILDING_SHOP_KINDS = new Set(['retail', 'commercial', 'train_station', 'office', 'yes']);
const isBuildingLike = (w) =>
  w.tags.name &&
  w.nds.length > 3 &&
  w.nds[0] === w.nds.at(-1) &&
  (['mall', 'department_store'].includes(w.tags.shop) ||
    BUILDING_SHOP_KINDS.has(w.tags.building) ||
    w.tags.railway === 'station') &&
  !Object.values(AREA_POLYGONS).includes(w.tags.name);
const polygonArea = (pts) =>
  Math.abs(
    pts.reduce(
      (sum, p, i) => sum + p.x * pts[(i + 1) % pts.length].y - pts[(i + 1) % pts.length].x * p.y,
      0,
    ),
  ) / 2;
const buildingPolys = osm.ways.filter(isBuildingLike).map((w) => {
  const pts = w.nds.map((id) => toPlane(osm.nodes.get(id)));
  return { way: w, pts, area: polygonArea(pts) };
});
const corridorIds = [...net.keys()].filter((id) => !isExitNode(id) && floorOf(id) !== '1F');
// 番号付きの出口が建物の中か縁（3m 以内）にあるビルも、その出口から入れるビルとみなす
const BUILDING_EXIT_M = 3;
const exitIds = [...net.keys()].filter(isExitNode);
const outlineDistance = (p, pts) => {
  if (inside(p, pts)) return 0;
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i += 1)
    d = Math.min(d, segmentDistance(p, pts[i], pts[i + 1]));
  return d;
};
const nodesInside = new Map(
  buildingPolys.map((b) => {
    const corridors = corridorIds.filter((id) => inside(toPlane(positions.get(id)), b.pts));
    const exits = exitIds.filter(
      (id) => outlineDistance(toPlane(positions.get(id)), b.pts) <= BUILDING_EXIT_M,
    );
    return [b.way.id, corridors.length > 0 ? corridors : exits];
  }),
);
const floorLabel = (t) => {
  const lv = levelsOf(t);
  if (lv.length === 0) return undefined;
  const l = Math.min(...lv);
  return l >= 0 ? `${l + 1}F` : `B${-l}`;
};
const usedShopRefs = new Set(shops.map((shop) => shop.id));
let buildingShopCount = 0;
for (const s of shopCandidates) {
  const t = s.tags;
  if (
    !t.name ||
    !(
      t.shop ||
      FOOD_AMENITY.has(t.amenity) ||
      ['cafe', 'ice_cream', 'pharmacy', ...SERVICE_AMENITY].includes(t.amenity)
    )
  )
    continue;
  if (['mall', 'department_store'].includes(t.shop)) continue;
  const id = `osm-${s.ref.toLowerCase()}`;
  if (usedShopRefs.has(id)) continue;
  const p = toPlane(s);
  const containing = buildingPolys.filter((b) => inside(p, b.pts)).sort((a, b) => a.area - b.area);
  const host = containing.find((b) => nodesInside.get(b.way.id).length > 0);
  if (!host) continue;
  let nodeId = null;
  let best = Infinity;
  for (const nid of nodesInside.get(host.way.id)) {
    const d = distanceM(s, positions.get(nid));
    if (d < best) {
      best = d;
      nodeId = nid;
    }
  }
  const building = containing[0].way.tags;
  const ja = t['name:ja'] ?? t.name;
  const key = `${ja}@${nodeId}`;
  if (seenShop.has(key)) continue;
  seenShop.add(key);
  const en = t['name:en'] ?? t['brand:en'] ?? (/^[\x20-\x7e]+$/.test(t.name) ? t.name : ja);
  const buildingJa = building['name:ja'] ?? building.name;
  const floor = floorLabel(t);
  shops.push({
    id,
    name: { ja, en },
    category: category(t),
    nodeId,
    building: { ja: buildingJa, en: building['name:en'] ?? buildingJa },
    ...(floor ? { floor } : {}),
  });
  usedShopRefs.add(id);
  buildingShopCount += 1;
}

// ---- 6. 名前のない分岐の名前（近くの出口 → 近くの店 → エリアの通路）
const AREA_NAME = {
  whity: { ja: 'ホワイティうめだ', en: 'Whity Umeda' },
  diamor: { ja: 'ディアモール大阪', en: 'Diamor Osaka' },
  dojima: { ja: 'ドーチカ', en: 'Dotica' },
  ekimo: { ja: 'ekimo梅田', en: 'ekimo Umeda' },
  sanbangai: { ja: '阪急三番街', en: 'Hankyu Sanbangai' },
  station: { ja: '駅', en: 'station' },
};
const exitIdOf = new Map();
const usedExitIds = new Map();
for (const id of netIds) {
  const tags = osm.nodes.get(id)?.tags;
  if (!isEntranceId.has(id) || !tags?.ref) continue;
  const base = `ex-${tags.ref.replace(/[^\w-]/g, '_')}`;
  const n = (usedExitIds.get(base) ?? 0) + 1;
  usedExitIds.set(base, n);
  exitIdOf.set(id, n === 1 ? base : `${base}-${n}`);
}
const finalId = (id) => exitIdOf.get(id) ?? (placeInfo.has(id) ? id : `n${id.replace(/~/g, '-')}`);

// 分岐の名前の目印には地下の店だけを使う（ビルの地上階の店は通路から見えない）
const namingShops = shops.filter((shop) => !shop.building || shop.floor?.startsWith('B'));
const nameJunction = (id) => {
  const pos = positions.get(id);
  let ex = null;
  for (const e of exitIdOf.keys()) {
    const d = distanceM(pos, osm.nodes.get(e));
    if (d <= 35 && (!ex || d < ex.d)) ex = { ref: osm.nodes.get(e).tags.ref, d };
  }
  if (ex) return { ja: `${ex.ref}出口付近`, en: `Near Exit ${ex.ref}` };
  const nearShop = namingShops.find((s) => s.nodeId === id);
  if (nearShop) return { ja: `${nearShop.name.ja}前`, en: `In front of ${nearShop.name.en}` };
  // 店が付いていない分岐は、30m 以内で店のある点の店名を目印にする
  let landmark = null;
  for (const shop of namingShops) {
    const d = distanceM(pos, positions.get(shop.nodeId));
    if (d <= 30 && (!landmark || d < landmark.d)) landmark = { shop, d };
  }
  if (landmark) {
    const { ja, en } = landmark.shop.name;
    return { ja: `${ja}付近`, en: `Near ${en}` };
  }
  const a = AREA_NAME[areaOf(id)];
  return { ja: `${a.ja}の通路`, en: `${a.en[0].toUpperCase()}${a.en.slice(1)} passage` };
};

// ---- 7. 出力
const nodes = netIds.map((id) => {
  const pos = positions.get(id);
  const base = { id: finalId(id), lat: round6(pos.lat), lng: round6(pos.lon), area: areaOf(id) };
  if (placeInfo.has(id)) {
    const p = placeInfo.get(id);
    return { ...base, kind: p.kind, name: p.name, ...(p.floor ? { floor: p.floor } : {}) };
  }
  if (exitIdOf.has(id)) {
    const ref = osm.nodes.get(id).tags.ref;
    return {
      ...base,
      kind: 'exit',
      exitNo: ref,
      name: { ja: `${ref} 出口`, en: `Exit ${ref}` },
      osmId: `node/${id}`,
    };
  }
  const floor = floorOfVertex(id);
  return {
    ...base,
    kind: 'junction',
    name: nameJunction(id),
    ...(floor !== 'B1' ? { floor } : {}),
  };
});
const edges = [];
for (const [a, m] of net) {
  for (const [b, e] of m) {
    if (a >= b) continue;
    const edge = {
      from: finalId(a),
      to: finalId(b),
      distanceM: Math.max(1, Math.round(e.lengthM)),
    };
    if (e.attrs.length > 0) edge.attrs = e.attrs;
    edges.push(edge);
  }
}
edges.sort((x, y) => (x.from + x.to).localeCompare(y.from + y.to));
nodes.sort((x, y) => x.id.localeCompare(y.id));
for (const s of shops) s.nodeId = finalId(s.nodeId);
shops.sort((x, y) => x.id.localeCompare(y.id));

const pois = POIS.map((p) => {
  const el = osmRef(p.osm);
  if (!el) throw new Error(`poi ${p.id}: OSM element ${p.osm} not found`);
  return { id: p.id, name: p.name, lat: round6(el.lat), lng: round6(el.lon) };
});

// 抽出データの取得日（scripts/osm/README.md の手順で記録）。未指定なら生成日
const extractDate = process.env.OSM_EXTRACT_DATE ?? new Date().toISOString().slice(0, 10);
const json = (v) => JSON.stringify(v, null, 2);
writeFileSync(
  output,
  `// このファイルは scripts/osm/build.mjs が生成する。手で編集しないこと。
// データ: © OpenStreetMap contributors（ODbL 1.0, https://www.openstreetmap.org/copyright）
// 生成日: ${extractDate}
import type { GeneratedMapData } from '../types';

export const osmData: GeneratedMapData = {
  generatedAt: '${extractDate}',
  nodes: ${json(nodes)},
  edges: ${json(edges)},
  shops: ${json(shops)},
  pois: ${json(pois)},
};
`,
);
console.log(
  `nodes ${nodes.length} (exits ${nodes.filter((n) => n.kind === 'exit').length}), edges ${edges.length}, shops ${shops.length}, pois ${pois.length}, fragment links ${fragmentLinks}, dead-end links ${deadEndLinks}, building links ${buildingLinks}, building shops ${buildingShopCount}`,
);
