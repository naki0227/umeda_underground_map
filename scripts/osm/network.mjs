// OSM の地下歩行空間から、アプリ用の通路グラフ（ノード・エッジ）を作る。
// 手順: 地下の通路を集める → 近い切れ目をつなぐ → 出入口をつなぐ →
// 連結成分を選ぶ → 次数2の点を縮約して交差点・出入口・端点だけ残す。

const R = 6_371_008.8;

export function distanceM(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function levels(tags) {
  return (tags.level ?? '')
    .split(/[;,]/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && (tags.level ?? '').trim() !== '');
}

const WALK = new Set(['footway', 'steps', 'corridor', 'pedestrian', 'elevator', 'path']);

export function isWalkway(tags) {
  return WALK.has(tags.highway) || tags.indoor === 'corridor';
}

export function isUnderground(tags) {
  const lv = levels(tags);
  return (
    lv.some((l) => l < 0) ||
    tags.location === 'underground' ||
    Number(tags.layer) < 0 ||
    tags.tunnel === 'yes'
  );
}

/** 出入口（地下鉄出入口・番号付きの出入口） */
export function isEntrance(tags) {
  return (
    tags.railway === 'subway_entrance' || (tags.entrance !== undefined && tags.ref !== undefined)
  );
}

/** エッジの設備属性 */
export function wayAttrs(tags) {
  if (tags.highway === 'steps') return tags.conveying ? ['escalator'] : ['stairs'];
  if (tags.highway === 'elevator') return ['elevator'];
  if (tags.conveying) return ['escalator'];
  if (tags.incline) return ['slope'];
  return [];
}

/**
 * @param {ReturnType<import('./parseOsm.mjs').parseOsm>} osm
 * @param {{ bridgeM: number, entranceAttachM: number, minComponentSize: number }} opts
 */
export function buildWalkGraph(osm, opts) {
  const { nodes, ways } = osm;
  /** @type {Map<string, Map<string, {lengthM:number, attrs:string[]}>>} */
  const adj = new Map();
  const link = (a, b, lengthM, attrs) => {
    if (a === b) return;
    if (!adj.has(a)) adj.set(a, new Map());
    if (!adj.has(b)) adj.set(b, new Map());
    const prev = adj.get(a).get(b);
    if (prev && prev.lengthM <= lengthM) return;
    adj.get(a).set(b, { lengthM, attrs });
    adj.get(b).set(a, { lengthM, attrs });
  };
  const addWay = (way) => {
    const attrs = wayAttrs(way.tags);
    for (let i = 0; i < way.nds.length - 1; i += 1) {
      const a = nodes.get(way.nds[i]);
      const b = nodes.get(way.nds[i + 1]);
      if (a && b) link(a.id, b.id, distanceM(a, b), attrs);
    }
  };

  // 1. 地下の通路
  for (const way of ways) if (isWalkway(way.tags) && isUnderground(way.tags)) addWay(way);
  // 2. 地下の通路に触れる階段・エレベーター・通路（地上への上り下り）
  for (const way of ways) {
    if (!isWalkway(way.tags) || isUnderground(way.tags)) continue;
    const vertical =
      way.tags.highway === 'steps' || way.tags.highway === 'elevator' || way.tags.conveying;
    if (!vertical) continue;
    if (way.nds.some((id) => adj.has(id))) addWay(way);
  }

  const entrances = [...nodes.values()].filter((n) => isEntrance(n.tags));

  // 3. 近い切れ目をつなぐ（別の連結成分の点同士）
  const bridge = (maxM) => {
    const comp = components(adj);
    const cell = maxM;
    const grid = new Map();
    const key = (n) =>
      `${Math.floor((n.lat * 111_320) / cell)},${Math.floor((n.lon * 91_470) / cell)}`;
    for (const id of adj.keys()) {
      const n = nodes.get(id);
      const k = key(n);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(id);
    }
    let added = 0;
    for (const id of adj.keys()) {
      const n = nodes.get(id);
      const [gy, gx] = key(n).split(',').map(Number);
      let best = new Map();
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1)
          for (const other of grid.get(`${gy + dy},${gx + dx}`) ?? []) {
            if (comp.get(other) === comp.get(id)) continue;
            const d = distanceM(n, nodes.get(other));
            const c = comp.get(other);
            if (d <= maxM && (!best.has(c) || best.get(c).d > d)) best.set(c, { other, d });
          }
      for (const { other, d } of best.values()) {
        link(id, other, d, []);
        added += 1;
      }
    }
    return added;
  };
  const bridges = bridge(opts.bridgeM);

  // 4. 出入口をつなぐ
  let attached = 0;
  for (const e of entrances) {
    if (adj.has(e.id)) continue;
    let best = null;
    for (const id of adj.keys()) {
      const d = distanceM(e, nodes.get(id));
      if (d <= opts.entranceAttachM && (!best || d < best.d)) best = { id, d };
    }
    if (best) {
      link(e.id, best.id, best.d, ['stairs']);
      attached += 1;
    }
  }

  // 5. 小さな連結成分を捨てる
  const comp = components(adj);
  const sizes = new Map();
  for (const c of comp.values()) sizes.set(c, (sizes.get(c) ?? 0) + 1);
  for (const [id, c] of comp) if (sizes.get(c) < opts.minComponentSize) adj.delete(id);
  for (const m of adj.values()) for (const id of [...m.keys()]) if (!adj.has(id)) m.delete(id);

  return {
    adj,
    entrances,
    stats: { bridges, attached, components: [...sizes.values()].sort((a, b) => b - a) },
  };
}

export function components(adj) {
  const comp = new Map();
  let n = 0;
  for (const start of adj.keys()) {
    if (comp.has(start)) continue;
    const stack = [start];
    comp.set(start, n);
    while (stack.length) {
      const x = stack.pop();
      for (const y of adj.get(x).keys()) {
        if (!comp.has(y)) {
          comp.set(y, n);
          stack.push(y);
        }
      }
    }
    n += 1;
  }
  return comp;
}

/**
 * 次数2の点を縮約する。keep に含まれる点（出入口・名前付きの点）は残す。
 * 設備属性が変わる点も残す（階段の始点など）。
 */
export function simplify(adj, keep) {
  const g = new Map([...adj].map(([k, v]) => [k, new Map(v)]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, nbrs] of g) {
      if (keep.has(id) || nbrs.size !== 2) continue;
      const [[a, ea], [b, eb]] = [...nbrs];
      if (a === b) continue;
      const attrs = [...new Set([...ea.attrs, ...eb.attrs])];
      const lengthM = ea.lengthM + eb.lengthM;
      const existing = g.get(a).get(b);
      if (existing) continue; // 三角形はそのまま残す
      g.get(a).delete(id);
      g.get(b).delete(id);
      g.get(a).set(b, { lengthM, attrs });
      g.get(b).set(a, { lengthM, attrs });
      g.delete(id);
      changed = true;
    }
  }
  return g;
}
