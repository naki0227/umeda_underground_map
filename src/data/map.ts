import { projectToPlane } from '../domain/geo';
import type { LocalizedText, MapNode, Poi, UndergroundMap } from '../domain/types';
import { osmData } from './generated/osmData';
import { withEnglishName } from './englishNames';
import { withPlaceTranslations } from './placeNames';
import { mergeShops } from './mergeShops';
import { officialShops } from './officialShops';
import type { GeneratedNode, GeneratedPoi } from './types';

/** 英語名の日本語を置き換え、中国語・韓国語の名前を足す */
const localizeName = (text: LocalizedText) => withPlaceTranslations(withEnglishName(text));

/** 生成データのノードに平面座標を付ける（x, y は緯度経度から一意に決まる） */
function toMapNode({ osmId: _osmId, ...node }: GeneratedNode): MapNode {
  return { ...node, name: localizeName(node.name), ...projectToPlane(node) };
}

/** 地上スポットの最寄り出口（直線距離）。出口がなければ改札 */
export function nearestExitId(nodes: MapNode[], poi: Pick<GeneratedPoi, 'lat' | 'lng'>): string {
  const p = projectToPlane(poi);
  const candidates = nodes.filter((n) => n.kind === 'exit');
  const pool = candidates.length > 0 ? candidates : nodes.filter((n) => n.kind === 'gate');
  let best = pool[0];
  let bestD = Infinity;
  for (const node of pool) {
    const d = Math.hypot(node.x - p.x, node.y - p.y);
    if (d < bestD) {
      best = node;
      bestD = d;
    }
  }
  return best.id;
}

const nodes = osmData.nodes.map(toMapNode);
const areaById = new Map(nodes.map((n) => [n.id, n.area]));
const pois: Poi[] = osmData.pois.map((poi) => ({
  id: poi.id,
  name: localizeName(poi.name),
  lat: poi.lat,
  lng: poi.lng,
  nodeId: nearestExitId(nodes, poi),
}));

/**
 * 梅田地下全域マップ。
 * - 通路・出口・地下の店・地上スポットの位置: © OpenStreetMap contributors（ODbL）。
 *   scripts/osm/build.mjs で生成（src/data/generated/osmData.ts）
 * - 改札・広場・地下街の区画名など: scripts/osm/overlay.mjs（根拠をコメントに記載）
 * - 公式サイト掲載の店名: src/data/officialShops.ts
 * 誤りはアプリ内の報告フォームから収集して更新する。
 */
export const umedaMap: UndergroundMap = {
  dataVersion: osmData.generatedAt,
  nodes,
  edges: osmData.edges,
  shops: mergeShops(officialShops, osmData.shops, (id) => areaById.get(id)).map((shop) => ({
    ...shop,
    name: localizeName(shop.name),
    ...(shop.building ? { building: localizeName(shop.building) } : {}),
  })),
  pois,
};
