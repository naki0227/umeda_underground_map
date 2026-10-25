import { shopPlaceName } from '../domain/shopLabel';
import { STATIONS, stationGates } from '../domain/stations';
import type { Graph } from '../domain/graph';
import type { Poi, Shop } from '../domain/types';
import type { Place } from '../features/map/InteractiveMap';

/**
 * 場所を URL で渡す（共有・待ち合わせ）。?to=<ノード>&n=<日本語名>。
 * 開いた人の画面では、その場所を選んだ状態で始まる
 */
export function placeUrl(base: string, place: Place): string {
  const url = new URL(base);
  url.search = '';
  url.hash = '';
  url.searchParams.set('to', place.nodeId);
  url.searchParams.set('n', place.name.ja);
  return url.toString();
}

/** URL の場所を、いまのデータから探す（駅・地上スポット・店・ノードの順）。見つからなければ null */
export function placeFromUrl(
  search: string,
  graph: Graph,
  data: { shops: Shop[]; pois: Poi[] },
): Place | null {
  const params = new URLSearchParams(search);
  const nodeId = params.get('to');
  const name = params.get('n');
  if (nodeId === null || !graph.nodes.has(nodeId)) return null;
  const station = STATIONS.find((s) => s.name.ja === name);
  if (station) {
    const gates = stationGates(station, graph.nodes.values());
    if (gates.length > 0) {
      return { nodeId: gates[0], nodeIds: gates, name: station.name, aboveGround: false };
    }
  }
  const poi = data.pois.find((p) => p.nodeId === nodeId && p.name.ja === name);
  if (poi) return { nodeId, name: poi.name, aboveGround: true };
  // 検索から選んだビルの店は「店名（ビル 階）」の名前になっている
  const shop = data.shops.find(
    (s) => s.nodeId === nodeId && (s.name.ja === name || shopPlaceName(s).ja === name),
  );
  if (shop) return { nodeId, name: shopPlaceName(shop), aboveGround: false };
  const node = graph.nodes.get(nodeId);
  return node ? { nodeId, name: node.name, aboveGround: false } : null;
}

/**
 * 共有する（スマホは共有シート、なければリンクをコピー）。
 * 共有したら 'shared'、コピーしたら 'copied'、どちらもできなければ 'failed'
 */
export async function sharePlace(
  url: string,
  title: string,
  nav: Navigator = navigator,
): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title, text: title, url });
      return 'shared';
    } catch (error) {
      // 共有シートを閉じただけなら何もしない
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared';
    }
  }
  try {
    await nav.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
