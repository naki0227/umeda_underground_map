// 梅田周辺の OSM データを、OSM API の map 呼び出しで小さなマスに分けて取得し、1つのファイルにまとめる。
// map 呼び出しは 1 回あたりの点の数に上限があるため、0.005 度（約 500m）四方ずつ取る。依存なし。
// 使い方: node scripts/osm/fetch.mjs [出力 = .osm/umeda.osm]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** 取得範囲（緯度経度）。梅田の地下とつながる通路網が収まる大きさ（約 2.7km × 3.1km） */
export const FETCH_BOUNDS = { minLat: 34.686, maxLat: 34.714, minLon: 135.482, maxLon: 135.512 };
const STEP = 0.005;

const output = process.argv[2] ?? '.osm/umeda.osm';
const tiles = [];
for (let lat = FETCH_BOUNDS.minLat; lat < FETCH_BOUNDS.maxLat - 1e-9; lat += STEP)
  for (let lon = FETCH_BOUNDS.minLon; lon < FETCH_BOUNDS.maxLon - 1e-9; lon += STEP)
    tiles.push([
      lon,
      lat,
      Math.min(lon + STEP, FETCH_BOUNDS.maxLon),
      Math.min(lat + STEP, FETCH_BOUNDS.maxLat),
    ]);

const nodes = new Map();
const ways = new Map();
/** 1 枚分の XML から node / way を取り出す（relation は使わない） */
const collect = (xml) => {
  const lines = xml.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].trim().match(/^<(node|way|relation) id="(\d+)"/);
    if (!m) continue;
    const [, kind, id] = m;
    let block = `${lines[i]}\n`;
    if (!lines[i].trim().endsWith('/>')) {
      while (!lines[i].trim().startsWith(`</${kind}>`)) {
        i += 1;
        block += `${lines[i]}\n`;
      }
    }
    if (kind === 'node' && !nodes.has(id)) nodes.set(id, block);
    if (kind === 'way' && !ways.has(id)) ways.set(id, block);
  }
};

for (const [index, bbox] of tiles.entries()) {
  const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${bbox.map((v) => v.toFixed(3)).join(',')}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'umeda_underground_map data build' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  collect(await res.text());
  console.log(`${index + 1}/${tiles.length} nodes ${nodes.size} ways ${ways.size}`);
  await new Promise((resolve) => setTimeout(resolve, 1000)); // API に負担をかけない
}

const b = FETCH_BOUNDS;
mkdirSync(dirname(output), { recursive: true });
writeFileSync(
  output,
  `<?xml version="1.0" encoding="UTF-8"?>\n<osm version="0.6" generator="scripts/osm/fetch.mjs">\n` +
    ` <bounds minlat="${b.minLat}" minlon="${b.minLon}" maxlat="${b.maxLat}" maxlon="${b.maxLon}"/>\n` +
    [...nodes.values()].join('') +
    [...ways.values()].join('') +
    '</osm>\n',
);
console.log(`wrote ${output}`);
