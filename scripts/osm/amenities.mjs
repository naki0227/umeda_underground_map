// 梅田の地下と駅まわりの設備（トイレ・コインロッカー・ATM・エレベーター・案内所・AED）を OSM から取り出し、
// src/data/generated/amenities.ts に書き出す。どの通路の点に付けるかはアプリ側（src/data/amenities.ts）で決める。
// 使い方: node scripts/osm/amenities.mjs .osm/umeda.osm
import { writeFileSync } from 'node:fs';
import { parseOsm } from './parseOsm.mjs';

/** 取得範囲（fetch.mjs の FETCH_BOUNDS と同じ。fetch.mjs は読み込むと取得を始めるので値を写す） */
const FETCH_BOUNDS = { minLat: 34.686, maxLat: 34.714, minLon: 135.482, maxLon: 135.512 };

const input = process.argv[2] ?? '.osm/umeda.osm';
const output = 'src/data/generated/amenities.ts';

/** OSM のタグ → 種類 */
function kindOf(tags) {
  if (tags.amenity === 'toilets') return 'toilet';
  if (tags.amenity === 'luggage_locker' || tags.amenity === 'locker') return 'locker';
  if (tags.amenity === 'atm' || (tags.amenity === 'bank' && tags.atm === 'yes')) return 'atm';
  if (tags.highway === 'elevator') return 'elevator';
  if (tags.tourism === 'information' && tags.information === 'office') return 'info';
  if (tags.emergency === 'defibrillator') return 'aed';
  return null;
}

/** level の値 → 階（-1 → B1、0 → 1F）。「-1;0」のような複数階は一番下 */
function floorOf(level) {
  if (level === undefined) return undefined;
  const values = level
    .split(/[;,]/)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  if (values.length === 0) return undefined;
  const lowest = Math.min(...values);
  return lowest < 0 ? `B${-lowest}` : `${lowest + 1}F`;
}

const inside = ({ lat, lon }) =>
  lat >= FETCH_BOUNDS.minLat &&
  lat <= FETCH_BOUNDS.maxLat &&
  lon >= FETCH_BOUNDS.minLon &&
  lon <= FETCH_BOUNDS.maxLon;

const { nodes, ways } = parseOsm(input);
const items = [];
const add = (id, point, tags) => {
  const kind = kindOf(tags);
  if (kind === null || !inside(point)) return;
  const item = {
    id,
    kind,
    lat: Number(point.lat.toFixed(6)),
    lng: Number(point.lon.toFixed(6)),
  };
  const floor = floorOf(tags.level ?? tags['level:ref']);
  if (floor) item.floor = floor;
  if (tags.name) item.name = { ja: tags.name, en: tags['name:en'] ?? tags.name };
  if (tags['toilets:wheelchair'] === 'yes' || (kind === 'toilet' && tags.wheelchair === 'yes')) {
    item.wheelchair = true;
  }
  if (tags.opening_hours) item.hours = tags.opening_hours;
  items.push(item);
};
for (const node of nodes.values()) add(`n${node.id}`, node, node.tags);
for (const way of ways) {
  // 面で描かれた設備は、角の点の平均を位置にする
  const points = way.nds.map((id) => nodes.get(id)).filter(Boolean);
  if (points.length === 0) continue;
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lon = points.reduce((s, p) => s + p.lon, 0) / points.length;
  add(`w${way.id}`, { lat, lon }, way.tags);
}
items.sort((a, b) => a.id.localeCompare(b.id));

const today = process.env.OSM_EXTRACT_DATE ?? new Date().toISOString().slice(0, 10);
writeFileSync(
  output,
  `// このファイルは scripts/osm/amenities.mjs が生成する。手で編集しないこと。
// データ: © OpenStreetMap contributors（ODbL 1.0, https://www.openstreetmap.org/copyright）
// 生成日: ${today}
import type { GeneratedAmenity } from '../types';

export const amenities: GeneratedAmenity[] = ${JSON.stringify(items)};
`,
);
const count = {};
for (const item of items) count[item.kind] = (count[item.kind] ?? 0) + 1;
console.log(`wrote ${items.length} amenities`, count);
