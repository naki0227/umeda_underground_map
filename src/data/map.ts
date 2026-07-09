import type { MapEdge, UndergroundMap } from '../domain/types';
import { diamorEdges, diamorNodes, diamorShops } from './areas/diamor';
import { dojimaEdges, dojimaNodes, dojimaShops } from './areas/dojima';
import { ekimoEdges, ekimoNodes, ekimoShops } from './areas/ekimo';
import { sanbangaiEdges, sanbangaiNodes, sanbangaiShops } from './areas/sanbangai';
import { stationEdges, stationNodes, stationShops } from './areas/station';
import { whityEdges, whityNodes, whityShops } from './areas/whity';

/** エリアをまたぐ連絡通路 */
const interAreaEdges: MapEdge[] = [
  // 御堂筋線南改札 → ホワイティ西端
  { from: 'st-metro-s', to: 'wt-c1', distanceM: 75 },
  // 御堂筋線改札 ↔ ekimo
  { from: 'st-metro-s', to: 'ek-1', distanceM: 45 },
  { from: 'ek-2', to: 'st-metro-n', distanceM: 45 },
  // 御堂筋線北改札 → 阪急三番街
  { from: 'st-metro-n', to: 'sb-s', distanceM: 50 },
  // 阪急改札 → 三番街
  { from: 'st-hankyu', to: 'sb-s', distanceM: 60 },
  // 阪神百貨店前 → ディアモール北
  { from: 'st-j-hanshinmae', to: 'dm-n', distanceM: 85 },
  // ディアモール東 → 東梅田駅
  { from: 'dm-e', to: 'st-higashiumeda', distanceM: 190 },
  // 曽根崎地下歩道 → 東梅田駅（ホワイティ南）
  { from: 'wt-s2', to: 'st-higashiumeda', distanceM: 65 },
  // ディアモール南 → 北新地駅
  { from: 'dm-s', to: 'st-kitashinchi', distanceM: 125 },
  // ディアモール西 → 西梅田駅
  { from: 'dm-w', to: 'st-nishiumeda', distanceM: 230 },
  // 西梅田駅 → ドーチカ
  { from: 'st-nishiumeda', to: 'dj-1', distanceM: 75 },
];

/**
 * 梅田地下全域マップ。
 * 店舗情報は dataVersion 時点のスナップショットで、各施設の公式サイト
 * （whity.osaka-chikagai.jp / diamor.jp / h-sanbangai.com / ekimo.jp /
 * dotica.osaka-chikagai.jp）の掲載内容に基づく。座標・距離・出口番号の
 * 対応は現地未検証。誤りはアプリ内の報告フォームから収集して更新する。
 */
export const umedaMap: UndergroundMap = {
  dataVersion: '2026-07-09',
  nodes: [
    ...stationNodes,
    ...whityNodes,
    ...diamorNodes,
    ...sanbangaiNodes,
    ...ekimoNodes,
    ...dojimaNodes,
  ],
  edges: [
    ...stationEdges,
    ...whityEdges,
    ...diamorEdges,
    ...sanbangaiEdges,
    ...ekimoEdges,
    ...dojimaEdges,
    ...interAreaEdges,
  ],
  shops: [
    ...stationShops,
    ...whityShops,
    ...diamorShops,
    ...sanbangaiShops,
    ...ekimoShops,
    ...dojimaShops,
  ],
};
