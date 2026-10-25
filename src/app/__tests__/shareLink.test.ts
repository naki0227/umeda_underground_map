import { describe, expect, it, vi } from 'vitest';
import { umedaMap } from '../../data/map';
import { buildGraph } from '../../domain/graph';
import { shopPlaceName } from '../../domain/shopLabel';
import { placeFromUrl, placeUrl, sharePlace } from '../shareLink';

const graph = buildGraph(umedaMap);
const base = 'https://umeda.enludus.com/?old=1#x';

describe('share links', () => {
  it('opens the same place from the link (shop in a building, spot above ground, station)', () => {
    const shop = umedaMap.shops.find((s) => s.building !== undefined)!;
    const shopPlace = { nodeId: shop.nodeId, name: shopPlaceName(shop), aboveGround: false };
    const url = new URL(placeUrl(base, shopPlace));
    expect(url.searchParams.get('old')).toBeNull();
    expect(placeFromUrl(url.search, graph, umedaMap)?.name.ja).toBe(shopPlace.name.ja);

    const poi = umedaMap.pois[0];
    const poiUrl = new URL(
      placeUrl(base, { nodeId: poi.nodeId, name: poi.name, aboveGround: true }),
    );
    expect(placeFromUrl(poiUrl.search, graph, umedaMap)?.aboveGround).toBe(true);

    const gate = [...graph.nodes.values()].find((n) => n.name.ja.startsWith('JR大阪駅'))!;
    const station = new URL(
      placeUrl(base, {
        nodeId: gate.id,
        nodeIds: [gate.id],
        name: { ja: 'JR大阪駅', en: 'JR Osaka Station' },
        aboveGround: false,
      }),
    );
    expect(placeFromUrl(station.search, graph, umedaMap)?.nodeIds?.length).toBeGreaterThan(1);
  });

  it('ignores links to places that are not on the map', () => {
    expect(placeFromUrl('?to=nowhere&n=x', graph, umedaMap)).toBeNull();
    expect(placeFromUrl('', graph, umedaMap)).toBeNull();
  });

  it('copies the link when the share sheet is not available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const nav = { clipboard: { writeText } } as unknown as Navigator;
    expect(await sharePlace('https://x/', 't', nav)).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://x/');
  });
});
