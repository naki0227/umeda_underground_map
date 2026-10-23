// 地図の下地（地上の道路・建物の輪郭と、地下街の床の形）を OSM から作る。
// 座標は平面メートル（x=東, y=北）を 1m 単位に丸めた [x, y, x, y, ...] の平らな配列にする（データを小さくするため）。

/** Douglas-Peucker 法で点を間引く（eps メートル） */
export function simplify(points, eps) {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points.at(-1)];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  let farthest = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = points[i];
    const d =
      length === 0
        ? Math.hypot(p.x - a.x, p.y - a.y)
        : Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / length;
    if (d > farthest) {
      farthest = d;
      index = i;
    }
  }
  if (farthest <= eps) return [a, b];
  return [
    ...simplify(points.slice(0, index + 1), eps).slice(0, -1),
    ...simplify(points.slice(index), eps),
  ];
}

/** 閉じた輪郭を間引く（始点から一番遠い点で 2 つに分けてから間引く） */
export function simplifyRing(points, eps) {
  const ring =
    points.at(-1).x === points[0].x && points.at(-1).y === points[0].y
      ? points.slice(0, -1)
      : points;
  if (ring.length < 4) return ring;
  let far = 0;
  let index = 0;
  ring.forEach((p, i) => {
    const d = Math.hypot(p.x - ring[0].x, p.y - ring[0].y);
    if (d > far) {
      far = d;
      index = i;
    }
  });
  const first = simplify(ring.slice(0, index + 1), eps);
  const second = simplify([...ring.slice(index), ring[0]], eps);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

const flat = (points) => points.flatMap((p) => [Math.round(p.x), Math.round(p.y)]);

const MAJOR_ROADS = new Set([
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'motorway_link',
  'trunk_link',
  'primary_link',
  'secondary_link',
]);
const MINOR_ROADS = new Set([
  'tertiary',
  'tertiary_link',
  'unclassified',
  'residential',
  'living_street',
  'pedestrian',
]);
const isSurface = (tags) =>
  tags.tunnel !== 'yes' && !(Number(tags.layer) < 0) && !String(tags.level ?? '').startsWith('-');

/**
 * @param {ReturnType<import('./parseOsm.mjs').parseOsm>} osm
 * @param {{ toPlane: (p: {lat:number, lon:number}) => {x:number, y:number}, bounds: {minX:number,maxX:number,minY:number,maxY:number}, malls: Record<string, string> }} opts
 *   malls: アプリのエリア → OSM の地下街ポリゴンの name
 */
export function buildBasemap(osm, { toPlane, bounds, malls }) {
  const inBounds = (p) =>
    p.x >= bounds.minX && p.x <= bounds.maxX && p.y >= bounds.minY && p.y <= bounds.maxY;
  const pointsOf = (way) =>
    way.nds
      .map((id) => osm.nodes.get(id))
      .filter(Boolean)
      .map(toPlane);
  const mallByName = new Map(Object.entries(malls).map(([area, name]) => [name, area]));
  const result = { malls: [], buildings: [], majorRoads: [], minorRoads: [] };
  for (const way of osm.ways) {
    const closed = way.nds.length > 3 && way.nds[0] === way.nds.at(-1);
    const mallArea = mallByName.get(way.tags.name);
    if (mallArea && closed) {
      result.malls.push({ area: mallArea, points: flat(simplifyRing(pointsOf(way), 1)) });
      continue;
    }
    const points = pointsOf(way);
    if (!points.some(inBounds)) continue;
    if (way.tags.building && closed && isSurface(way.tags)) {
      const ring = simplifyRing(points, 1.5);
      if (ring.length >= 3) result.buildings.push(flat(ring));
    } else if (MAJOR_ROADS.has(way.tags.highway) && isSurface(way.tags)) {
      result.majorRoads.push(flat(simplify(points, 1.5)));
    } else if (MINOR_ROADS.has(way.tags.highway) && isSurface(way.tags)) {
      result.minorRoads.push(flat(simplify(points, 1.5)));
    }
  }
  return result;
}
