import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import type { Poi, Shop } from '../../domain/types';
import { localized } from '../../i18n';
import type { Place } from '../map/InteractiveMap';

interface Props {
  graph: Graph;
  shops: Shop[];
  pois: Poi[];
  onPick: (place: Place) => void;
}

interface Result {
  key: string;
  place: Place;
  kindLabel: string;
}

const MAX_RESULTS = 12;

/** 地上スポット・地下の店・出口/駅を横断検索する検索バー */
export function SearchBar({ graph, shops, pois, onPick }: Props) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return [];
    const matches = (ja: string, en: string) =>
      ja.toLowerCase().includes(q) || en.toLowerCase().includes(q);

    const poiResults: Result[] = pois
      .filter((p) => matches(p.name.ja, p.name.en))
      .map((p) => ({
        key: p.id,
        place: { nodeId: p.nodeId, name: p.name, aboveGround: true },
        kindLabel: t('search.kindPoi'),
      }));
    const shopResults: Result[] = shops
      .filter((s) => matches(s.name.ja, s.name.en))
      .map((s) => ({
        key: s.id,
        place: { nodeId: s.nodeId, name: s.name, aboveGround: false },
        kindLabel: t('search.kindShop'),
      }));
    const nodeResults: Result[] = [...graph.nodes.values()]
      .filter((n) => n.kind !== 'junction' && matches(n.name.ja, n.name.en))
      .map((n) => ({
        key: n.id,
        place: { nodeId: n.id, name: n.name, aboveGround: false },
        kindLabel: t('search.kindNode'),
      }));

    return [...poiResults, ...shopResults, ...nodeResults].slice(0, MAX_RESULTS);
  }, [query, pois, shops, graph, t]);

  const pick = (result: Result) => {
    setQuery('');
    onPick(result.place);
  };

  return (
    <div className="search-bar">
      <input
        type="search"
        value={query}
        placeholder={t('search.placeholder')}
        aria-label={t('search.placeholder')}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((result) => (
            <li key={result.key}>
              <button type="button" onClick={() => pick(result)}>
                <span>{localized(result.place.name, i18n.language)}</span>
                <span className="search-kind">{result.kindLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
