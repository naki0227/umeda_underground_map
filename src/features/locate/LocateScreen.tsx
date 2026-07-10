import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import { locate, type LocationCandidate } from '../../domain/locate';
import { nodeFloor, type NodeId, type Poi, type Shop } from '../../domain/types';
import { localized } from '../../i18n';
import { useGeolocation } from './useGeolocation';

interface Props {
  graph: Graph;
  shops: Shop[];
  pois: Poi[];
  onConfirm: (nodeId: NodeId) => void;
}

const QUICK_PICK_COUNT = 8;

export function LocateScreen({ graph, shops, pois, onConfirm }: Props) {
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

  /** よく使う目印: 広場（ランドマーク）を先頭に、続けて改札をチップで出す */
  const quickPicks = useMemo(() => {
    const nodes = [...graph.nodes.values()];
    const landmarks = nodes.filter((n) => n.kind === 'landmark');
    const gates = nodes.filter((n) => n.kind === 'gate');
    return [...landmarks, ...gates].slice(0, QUICK_PICK_COUNT);
  }, [graph]);

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

  const floorOf = (nodeId: NodeId) => {
    const node = graph.nodes.get(nodeId);
    return node ? nodeFloor(node) : 'B1';
  };

  const top = candidates !== null && candidates.length > 0 ? candidates[0] : null;

  return (
    <section>
      <p className="description">{t('locate.description')}</p>

      <div className="field">
        <span>{t('locate.quickLabel')}</span>
        <div className="quick-chips">
          {quickPicks.map((node) => (
            <button
              key={node.id}
              type="button"
              className={entranceNodeId === node.id ? 'chip active' : 'chip'}
              onClick={() => setEntranceNodeId((prev) => (prev === node.id ? '' : node.id))}
            >
              {localized(node.name, i18n.language)}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>{t('locate.entranceLabel')}</span>
        <select value={entranceNodeId} onChange={(e) => setEntranceNodeId(e.target.value)}>
          <option value="">{t('locate.entranceNone')}</option>
          <optgroup label={t('locate.entrancePoiGroup')}>
            {pois.map((poi) => (
              <option key={poi.id} value={poi.nodeId}>
                {localized(poi.name, i18n.language)}
              </option>
            ))}
          </optgroup>
          <optgroup label={t('locate.entranceExitGroup')}>
            {entrances.map((node) => (
              <option key={node.id} value={node.id}>
                {node.exitNo !== undefined ? `${node.exitNo} ` : ''}
                {localized(node.name, i18n.language)}
              </option>
            ))}
          </optgroup>
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
      {top !== null && (
        <div className="estimate-card">
          <p className="estimate-title">{t('locate.estimatedTitle')}</p>
          <p className="estimate-place">
            {t('locate.estimatedNear', { name: nodeName(top.nodeId) })}
          </p>
          <p className="estimate-meta">
            <span className="floor-badge">{floorOf(top.nodeId)}</span>
            <span className="confidence">
              {t('locate.candidateConfidence', { percent: Math.round(top.confidence * 100) })}
            </span>
          </p>
          <button type="button" className="primary" onClick={() => onConfirm(top.nodeId)}>
            {t('locate.startHere')}
          </button>
          <p className="hint">{t('locate.fixedNote')}</p>
        </div>
      )}
      {candidates !== null && candidates.length > 1 && (
        <div className="candidates">
          <h3>{t('locate.candidatesTitle')}</h3>
          <ul className="choice-list">
            {candidates.slice(1).map((c) => (
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
