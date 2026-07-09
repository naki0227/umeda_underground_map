import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapView } from '../../components/MapView';
import type { Graph } from '../../domain/graph';
import type { LocalizedText, MapNode, NodeId, Poi, Shop } from '../../domain/types';
import { localized } from '../../i18n';

interface Props {
  graph: Graph;
  shops: Shop[];
  pois: Poi[];
  currentNodeId: NodeId | null;
  onChoose: (nodeId: NodeId, label?: LocalizedText) => void;
}

type Tab = 'pois' | 'exits' | 'shops';

export function DestinationScreen({ graph, shops, pois, currentNodeId, onChoose }: Props) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>('pois');
  const [query, setQuery] = useState('');

  const exits = useMemo(
    () =>
      [...graph.nodes.values()].filter(
        (n) => n.kind === 'exit' || n.kind === 'gate' || n.kind === 'landmark',
      ),
    [graph],
  );

  const matches = (ja: string, en: string) => {
    const q = query.trim().toLowerCase();
    return q === '' || ja.toLowerCase().includes(q) || en.toLowerCase().includes(q);
  };

  const filteredPois = pois.filter((p) => matches(p.name.ja, p.name.en));
  const filteredExits = exits.filter((n) => matches(n.name.ja, n.name.en));
  const filteredShops = shops.filter((s) => matches(s.name.ja, s.name.en));

  const exitLabel = (node: MapNode) =>
    `${node.exitNo !== undefined ? `${node.exitNo} ` : ''}${localized(node.name, i18n.language)}`;

  const tabButton = (key: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      className={tab === key ? 'tab active' : 'tab'}
      onClick={() => setTab(key)}
    >
      {label}
    </button>
  );

  return (
    <section className="screen">
      <h2>{t('destination.title')}</h2>

      <MapView graph={graph} currentNodeId={currentNodeId} />

      <div className="tabs" role="tablist">
        {tabButton('pois', t('destination.poisTab'))}
        {tabButton('exits', t('destination.exitsTab'))}
        {tabButton('shops', t('destination.shopsTab'))}
      </div>

      <input
        type="search"
        value={query}
        placeholder={t('destination.searchPlaceholder')}
        onChange={(e) => setQuery(e.target.value)}
      />

      {tab === 'pois' && <p className="hint">{t('destination.poisHint')}</p>}

      <ul className="choice-list">
        {tab === 'pois' &&
          filteredPois.map((poi) => (
            <li key={poi.id}>
              <button
                type="button"
                className="candidate"
                onClick={() => onChoose(poi.nodeId, poi.name)}
              >
                {localized(poi.name, i18n.language)}
              </button>
            </li>
          ))}
        {tab === 'exits' &&
          filteredExits.map((node) => (
            <li key={node.id}>
              <button type="button" className="candidate" onClick={() => onChoose(node.id)}>
                {exitLabel(node)}
              </button>
            </li>
          ))}
        {tab === 'shops' &&
          filteredShops.map((shop) => (
            <li key={shop.id}>
              <button
                type="button"
                className="candidate"
                onClick={() => onChoose(shop.nodeId, shop.name)}
              >
                {localized(shop.name, i18n.language)}
              </button>
            </li>
          ))}
      </ul>
    </section>
  );
}
