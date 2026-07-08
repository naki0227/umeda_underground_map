import type { Graph } from './graph';
import type { MapNode, NodeId, Shop } from './types';

export interface LocateInput {
  /** ユーザーが選んだ入口（出口ノード）。任意。 */
  entranceNodeId?: NodeId;
  /** 端末GPS。地下では不正確なので弱いヒントとしてのみ使う。任意。 */
  gps?: { lat: number; lng: number };
  /** ユーザーが「近くに見える」と選んだ店舗。位置確定の主材料。 */
  nearbyShopIds: string[];
}

export interface LocationCandidate {
  nodeId: NodeId;
  /** 0..1 の相対信頼度（候補中最大が1） */
  confidence: number;
}

/** 店舗ヒントが効く範囲（通路距離） */
const SHOP_HINT_RANGE_M = 60;
/** 入口ヒントが効く範囲（通路距離） */
const ENTRANCE_HINT_RANGE_M = 150;
/** GPSヒントが効く範囲（直線距離）。地下GPSの誤差を見込んで広め。 */
const GPS_HINT_RANGE_M = 250;

const SHOP_WEIGHT = 1.0;
const ENTRANCE_WEIGHT = 0.6;
const GPS_WEIGHT = 0.3;

/** source から各ノードへの通路距離（maxDistanceM まで） */
export function graphDistancesFrom(
  graph: Graph,
  source: NodeId,
  maxDistanceM: number,
): Map<NodeId, number> {
  const dist = new Map<NodeId, number>();
  if (!graph.nodes.has(source)) return dist;
  dist.set(source, 0);
  // 範囲が小さいので素朴な探索で十分
  const queue: NodeId[] = [source];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    const base = dist.get(current) ?? 0;
    for (const edge of graph.adjacency.get(current) ?? []) {
      const next = base + edge.distanceM;
      if (next > maxDistanceM) continue;
      const known = dist.get(edge.to);
      if (known === undefined || next < known) {
        dist.set(edge.to, next);
        queue.push(edge.to);
      }
    }
  }
  return dist;
}

/** 緯度経度間の概算距離（メートル）。梅田程度の範囲なら平面近似で十分。 */
export function approxDistanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const latMid = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dLat = (a.lat - b.lat) * 111_320;
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos(latMid);
  return Math.hypot(dLat, dLng);
}

function proximityScore(distanceM: number, rangeM: number): number {
  if (distanceM > rangeM) return 0;
  return 1 - distanceM / rangeM;
}

function shopById(shops: Shop[], id: string): Shop | undefined {
  return shops.find((s) => s.id === id);
}

/**
 * 入口・GPS・周辺店舗のヒントから現在地候補をスコアリングする。
 * 店舗ヒントを最重視し、GPSは補助にとどめる（地下で不正確なため）。
 * ヒントが1つもない場合は空配列を返す。
 */
export function locate(graph: Graph, shops: Shop[], input: LocateInput): LocationCandidate[] {
  const scores = new Map<NodeId, number>();
  const add = (nodeId: NodeId, score: number) => {
    if (score <= 0) return;
    scores.set(nodeId, (scores.get(nodeId) ?? 0) + score);
  };

  let shopHintCount = 0;
  for (const shopId of input.nearbyShopIds) {
    const shop = shopById(shops, shopId);
    if (!shop) continue;
    shopHintCount += 1;
    const distances = graphDistancesFrom(graph, shop.nodeId, SHOP_HINT_RANGE_M);
    for (const [nodeId, d] of distances) {
      add(nodeId, SHOP_WEIGHT * proximityScore(d, SHOP_HINT_RANGE_M));
    }
  }

  if (input.entranceNodeId !== undefined) {
    const distances = graphDistancesFrom(graph, input.entranceNodeId, ENTRANCE_HINT_RANGE_M);
    for (const [nodeId, d] of distances) {
      add(nodeId, ENTRANCE_WEIGHT * proximityScore(d, ENTRANCE_HINT_RANGE_M));
    }
  }

  if (input.gps !== undefined) {
    for (const node of graph.nodes.values()) {
      if (node.lat === undefined || node.lng === undefined) continue;
      const d = approxDistanceM(input.gps, { lat: node.lat, lng: node.lng });
      add(node.id, GPS_WEIGHT * proximityScore(d, GPS_HINT_RANGE_M));
    }
  }

  // 店舗ヒントが複数ある場合、全店舗の近傍に入っているノードを優先したいので
  // 交差点らしさ（junction / landmark）を軽く優遇する
  const ranked = [...scores.entries()]
    .map(([nodeId, score]) => {
      const node = graph.nodes.get(nodeId) as MapNode;
      const kindBonus = node.kind === 'junction' || node.kind === 'landmark' ? 1.05 : 1;
      return { nodeId, score: score * kindBonus };
    })
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return [];

  const max = ranked[0].score;
  const minUseful = shopHintCount >= 2 ? max * 0.5 : 0;
  return ranked
    .filter((c) => c.score >= minUseful)
    .slice(0, 5)
    .map((c) => ({ nodeId: c.nodeId, confidence: c.score / max }));
}
