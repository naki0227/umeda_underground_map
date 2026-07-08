import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import type { MapNode, NodeId, Shop } from '../../domain/types';
import { localized } from '../../i18n';

interface Props {
  graph: Graph;
  shops: Shop[];
  onChoose: (nodeId: NodeId) => void;
}

type Tab = 'exits' | 'shops';

export function DestinationScreen({ graph, shops, onChoose }: Props) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>('exits');
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

  const filteredExits = exits.filter((n) => matches(n.name.ja, n.name.en));
  const filteredShops = shops.filter((s) => matches(s.name.ja, s.name.en));

  const exitLabel = (node: MapNode) =>
    `${node.exitNo !== undefined ? `${node.exitNo} ` : ''}${localized(node.name, i18n.language)}`;

  return (
    <section className="screen">
      <h2>{t('destination.title')}</h2>
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'exits'}
          className={tab === 'exits' ? 'tab active' : 'tab'}
          onClick={() => setTab('exits')}
        >
          {t('destination.exitsTab')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'shops'}
          className={tab === 'shops' ? 'tab active' : 'tab'}
          onClick={() => setTab('shops')}
        >
          {t('destination.shopsTab')}
        </button>
      </div>

      <input
        type="search"
        value={query}
        placeholder={t('destination.searchPlaceholder')}
        onChange={(e) => setQuery(e.target.value)}
      />

      <ul className="choice-list">
        {tab === 'exits'
          ? filteredExits.map((node) => (
              <li key={node.id}>
                <button type="button" className="candidate" onClick={() => onChoose(node.id)}>
                  {exitLabel(node)}
                </button>
              </li>
            ))
          : filteredShops.map((shop) => (
              <li key={shop.id}>
                <button type="button" className="candidate" onClick={() => onChoose(shop.nodeId)}>
                  {localized(shop.name, i18n.language)}
                </button>
              </li>
            ))}
      </ul>
    </section>
  );
}
