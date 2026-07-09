import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapView } from '../../components/MapView';
import type { Graph } from '../../domain/graph';
import { locate, type LocationCandidate } from '../../domain/locate';
import type { NodeId, Shop } from '../../domain/types';
import { localized } from '../../i18n';
import { useGeolocation } from './useGeolocation';

interface Props {
  graph: Graph;
  shops: Shop[];
  onConfirm: (nodeId: NodeId) => void;
}

export function LocateScreen({ graph, shops, onConfirm }: Props) {
  const { t, i18n } = useTranslation();
  const gps = useGeolocation();
  const [entranceNodeId, setEntranceNodeId] = useState<string>('');
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
  const [shopQuery, setShopQuery] = useState('');
  const [candidates, setCandidates] = useState<LocationCandidate[] | null>(null);

  const entrances = useMemo(
    () => [...graph.nodes.values()].filter((n) => n.kind === 'exit' || n.kind === 'gate'),
    [graph],
  );

  const filteredShops = useMemo(() => {
    const query = shopQuery.trim().toLowerCase();
    if (query === '') return shops;
    return shops.filter(
      (s) => s.name.ja.toLowerCase().includes(query) || s.name.en.toLowerCase().includes(query),
    );
  }, [shops, shopQuery]);

  const toggleShop = (shopId: string) => {
    setSelectedShopIds((prev) =>
      prev.includes(shopId) ? prev.filter((id) => id !== shopId) : [...prev, shopId],
    );
  };

  const runLocate = () => {
    const result = locate(graph, shops, {
      entranceNodeId: entranceNodeId === '' ? undefined : entranceNodeId,
      gps: gps.position ?? undefined,
      nearbyShopIds: selectedShopIds,
    });
    setCandidates(result);
  };

  const nodeName = (nodeId: NodeId) => {
    const node = graph.nodes.get(nodeId);
    return node ? localized(node.name, i18n.language) : nodeId;
  };

  return (
    <section className="screen">
      <h2>{t('locate.title')}</h2>
      <p className="description">{t('locate.description')}</p>

      <MapView graph={graph} candidateNodeIds={candidates?.map((c) => c.nodeId)} />

      <label className="field">
        <span>{t('locate.entranceLabel')}</span>
        <select value={entranceNodeId} onChange={(e) => setEntranceNodeId(e.target.value)}>
          <option value="">{t('locate.entranceNone')}</option>
          {entrances.map((node) => (
            <option key={node.id} value={node.id}>
              {node.exitNo !== undefined ? `${node.exitNo} ` : ''}
              {localized(node.name, i18n.language)}
            </option>
          ))}
        </select>
      </label>

      <div className="field">
        <button type="button" className="secondary" onClick={gps.acquire}>
          {t('locate.gpsButton')}
        </button>
        {gps.status === 'success' && <p className="hint ok">{t('locate.gpsAcquired')}</p>}
        {gps.status === 'error' && <p className="hint warn">{t('locate.gpsFailed')}</p>}
      </div>

      <div className="field">
        <span>{t('locate.shopsLabel')}</span>
        <input
          type="search"
          value={shopQuery}
          placeholder={t('locate.shopsPlaceholder')}
          onChange={(e) => setShopQuery(e.target.value)}
        />
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
      </div>

      <button type="button" className="primary" onClick={runLocate}>
        {t('locate.locateButton')}
      </button>

      {candidates !== null && candidates.length === 0 && (
        <p className="hint warn">{t('locate.noCandidates')}</p>
      )}
      {candidates !== null && candidates.length > 0 && (
        <div className="candidates">
          <h3>{t('locate.candidatesTitle')}</h3>
          <ul className="choice-list">
            {candidates.map((c) => (
              <li key={c.nodeId}>
                <button type="button" className="candidate" onClick={() => onConfirm(c.nodeId)}>
                  <span>{nodeName(c.nodeId)}</span>
                  <span className="confidence">
                    {t('locate.candidateConfidence', {
                      percent: Math.round(c.confidence * 100),
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
