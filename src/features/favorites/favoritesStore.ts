import type { Graph } from '../../domain/graph';
import { STATIONS, stationGates } from '../../domain/stations';
import type { LocalizedText, NodeId } from '../../domain/types';
import type { Place } from '../map/InteractiveMap';

const STORAGE_KEY = 'umeda-navi.favorites';
/** 端末内に保存するだけなので、念のため件数に上限を設ける */
export const MAX_FAVORITES = 50;

/** 場所を一意に表すキー（同じノードの別の店も区別する） */
export function favoriteKey(place: Place): string {
  return `${place.aboveGround ? 'poi' : 'node'}:${place.nodeId}:${place.name.ja}`;
}

function isLocalizedText(value: unknown): value is LocalizedText {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.ja === 'string' && typeof v.en === 'string';
}

function isPlace(value: unknown): value is Place {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.nodeId === 'string' && typeof v.aboveGround === 'boolean' && isLocalizedText(v.name)
  );
}

/**
 * 保存済みのお気に入り。壊れたデータ・形式違いは読み飛ばし、
 * 保存できない環境（プライベートモード等）では空にする。
 */
export function loadFavorites(): Place[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isPlace)
      .map((p) => ({
        nodeId: p.nodeId,
        name: { ja: p.name.ja, en: p.name.en },
        aboveGround: p.aboveGround,
        // 駅など、行き先の候補が複数あるもの
        ...(Array.isArray(p.nodeIds) && p.nodeIds.every((id) => typeof id === 'string')
          ? { nodeIds: p.nodeIds }
          : {}),
      }))
      .slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: Place[]): void {
  try {
    globalThis.localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify(favorites.slice(0, MAX_FAVORITES)),
    );
  } catch {
    // 保存できなくても、このセッション中のお気に入りは使える
  }
}

/** 追加と解除を切り替える。追加は先頭に入れる */
export function toggleFavorite(favorites: Place[], place: Place): Place[] {
  const key = favoriteKey(place);
  if (favorites.some((f) => favoriteKey(f) === key)) {
    return favorites.filter((f) => favoriteKey(f) !== key);
  }
  return [place, ...favorites].slice(0, MAX_FAVORITES);
}

interface Named {
  nodeId: NodeId;
  name: LocalizedText;
}

/**
 * 保存済みのお気に入りを、いまの地図データに合わせ直す。地図データを作り直すと
 * ノードの番号が変わることがあるため、無くなったノードは同じ名前の場所に付け替え、
 * 見つからなければ外す。駅は改札の候補をいまのデータから引き直す。
 */
export function reconcileFavorites(
  favorites: Place[],
  graph: Graph,
  places: { shops: Named[]; pois: Named[] },
): Place[] {
  const byName = new Map<string, NodeId>();
  for (const node of graph.nodes.values()) byName.set(node.name.ja, node.id);
  for (const item of [...places.shops, ...places.pois]) {
    if (graph.nodes.has(item.nodeId) && !byName.has(item.name.ja)) {
      byName.set(item.name.ja, item.nodeId);
    }
  }
  return favorites.flatMap((place): Place[] => {
    if (place.nodeIds !== undefined) {
      const station = STATIONS.find((s) => s.name.ja === place.name.ja);
      const gates = station ? stationGates(station, graph.nodes.values()) : [];
      return gates.length > 0 ? [{ ...place, nodeId: gates[0], nodeIds: gates }] : [];
    }
    // 名前が同じなら付け替えずにそのまま。名前が別の場所になっていたら名前で探し直す
    const sameName = favoriteNodeName(place, graph, places);
    if (sameName) return [place];
    const nodeId = byName.get(place.name.ja);
    return nodeId === undefined ? [] : [{ ...place, nodeId }];
  });
}

/** そのノードに、お気に入りと同じ名前の場所（ノード・店・地上スポット）がまだあるか */
function favoriteNodeName(
  place: Place,
  graph: Graph,
  places: { shops: Named[]; pois: Named[] },
): boolean {
  const node = graph.nodes.get(place.nodeId);
  if (node === undefined) return false;
  if (node.name.ja === place.name.ja) return true;
  return [...places.shops, ...places.pois].some(
    (item) => item.nodeId === place.nodeId && item.name.ja === place.name.ja,
  );
}
