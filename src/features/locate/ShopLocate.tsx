import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import { locate, type LocationCandidate } from '../../domain/locate';
import type { NodeId, Poi, Shop } from '../../domain/types';
import { localized } from '../../i18n';
import { LocateEstimate } from './LocateEstimate';
import { useGeolocation } from './useGeolocation';

interface Props {
  graph: Graph;
  shops: Shop[];
  pois: Poi[];
  initialGps: { lat: number; lng: number } | null;
  onConfirm: (nodeId: NodeId) => void;
}

/**
 * 入口セレクトの値。地上スポット同士・出口と同じノードを指すことがあるため、
 * ノードIDではなく「種類:ID」で一意にする。
 */
type EntranceKey = '' | `poi:${string}` | `node:${string}`;

/** 店の候補は数百件あるため、入力した文字に合うものだけをこの件数まで出す */
const MAX_SHOP_RESULTS = 30;

/**
 * 見えているお店から位置を推定する。入った場所・GPS は「ほかの手がかり」にたたんでおく
 */
export function ShopLocate({ graph, shops, pois, initialGps, onConfirm }: Props) {
  const { t, i18n } = useTranslation();
  const gps = useGeolocation();
  const [entranceKey, setEntranceKey] = useState<EntranceKey>('');
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
  const [shopQuery, setShopQuery] = useState('');
  const [located, setLocated] = useState<{ key: string; result: LocationCandidate[] } | null>(null);
  // 推定に使った入口・店・GPS が変わったら、古い推定結果は出さない
  const inputKey = [
    entranceKey,
    selectedShopIds.join(','),
    gps.position ? `${gps.position.lat},${gps.position.lng}` : '',
  ].join('|');
  const candidates = located?.key === inputKey ? located.result : null;

  const entranceNodeId = useMemo(() => {
    if (entranceKey.startsWith('poi:')) {
      const poiId = entranceKey.slice('poi:'.length);
      return pois.find((p) => p.id === poiId)?.nodeId ?? '';
    }
    return entranceKey.startsWith('node:') ? entranceKey.slice('node:'.length) : '';
  }, [entranceKey, pois]);

  const entrances = useMemo(
    () => [...graph.nodes.values()].filter((n) => n.kind === 'exit' || n.kind === 'gate'),
    [graph],
  );

  /** 選んだ店（常に表示）＋ 入力に合う店（最大 MAX_SHOP_RESULTS 件） */
  const filteredShops = useMemo(() => {
    const query = shopQuery.trim().toLowerCase();
    const selected = shops.filter((s) => selectedShopIds.includes(s.id));
    if (query === '') return selected;
    const matches = shops
      .filter((s) => !selectedShopIds.includes(s.id))
      .filter((s) =>
        Object.values(s.name).some((text: string) => text.toLowerCase().includes(query)),
      )
      .slice(0, MAX_SHOP_RESULTS);
    return [...selected, ...matches];
  }, [shops, shopQuery, selectedShopIds]);

  const toggleShop = (shopId: string) => {
    setSelectedShopIds((prev) =>
      prev.includes(shopId) ? prev.filter((id) => id !== shopId) : [...prev, shopId],
    );
  };

  const runLocate = () => {
    const result = locate(graph, shops, {
      entranceNodeId: entranceNodeId === '' ? undefined : entranceNodeId,
      gps: gps.position ?? initialGps ?? undefined,
      nearbyShopIds: selectedShopIds,
    });
    setLocated({ key: inputKey, result });
  };

  return (
    <div className="locate-panel">
      <p className="description">{t('locate.shopHelp')}</p>
      <label className="visually-hidden" htmlFor="locate-shop-query">
        {t('locate.shopsLabel')}
      </label>
      <input
        id="locate-shop-query"
        type="search"
        value={shopQuery}
        placeholder={t('locate.shopsPlaceholder')}
        onChange={(e) => setShopQuery(e.target.value)}
      />
      {filteredShops.length > 0 && (
        <ul className="choice-list">
          {filteredShops.map((shop) => (
            <li key={shop.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedShopIds.includes(shop.id)}
                  onChange={() => toggleShop(shop.id)}
                />
                {localized(shop.name, i18n.language)}
              </label>
            </li>
          ))}
        </ul>
      )}

      <details className="locate-more">
        <summary>{t('locate.moreHints')}</summary>
        <label className="field">
          <span>{t('locate.entranceLabel')}</span>
          <select
            value={entranceKey}
            onChange={(e) => setEntranceKey(e.target.value as EntranceKey)}
          >
            <option value="">{t('locate.entranceNone')}</option>
            <optgroup label={t('locate.entrancePoiGroup')}>
              {pois.map((poi) => (
                <option key={poi.id} value={`poi:${poi.id}`}>
                  {localized(poi.name, i18n.language)}
                </option>
              ))}
            </optgroup>
            <optgroup label={t('locate.entranceExitGroup')}>
              {entrances.map((node) => (
                <option key={node.id} value={`node:${node.id}`}>
                  {node.exitNo !== undefined ? `${node.exitNo} ` : ''}
                  {localized(node.name, i18n.language)}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <button
          type="button"
          className="link-button"
          onClick={gps.acquire}
          disabled={gps.status === 'loading'}
          aria-busy={gps.status === 'loading'}
        >
          {gps.status === 'loading' ? t('locate.gpsLoading') : t('locate.gpsButton')}
        </button>
        {gps.status === 'success' && <p className="hint ok">{t('locate.gpsAcquired')}</p>}
        {gps.status === 'error' && <p className="hint warn">{t('locate.gpsFailed')}</p>}
      </details>

      <button
        type="button"
        className="primary"
        onClick={runLocate}
        disabled={
          selectedShopIds.length === 0 &&
          entranceNodeId === '' &&
          gps.position === null &&
          initialGps === null
        }
      >
        {t('locate.locateButton')}
      </button>

      {candidates !== null && (
        <LocateEstimate graph={graph} candidates={candidates} onConfirm={onConfirm} />
      )}
    </div>
  );
}
