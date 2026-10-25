import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import { shopPlaceName } from '../../domain/shopLabel';
import { matchStations, stationGates } from '../../domain/stations';
import type { LocalizedText, Poi, Shop } from '../../domain/types';
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
    // 日本語・英語に加えて、中国語・韓国語の名前でも見つける
    const exitLabel = (nodeId: string) => {
      const exitNo = graph.nodes.get(nodeId)?.exitNo;
      return exitNo === undefined ? undefined : t('search.kindPoiExit', { exit: exitNo });
    };
    const matches = (name: LocalizedText) =>
      Object.values(name).some((text: string) => text.toLowerCase().includes(q));

    // 駅（改札がいくつもある）は先頭に。選ぶと、いまいる所から一番近い改札へ案内する
    const stationResults: Result[] = matchStations(q).flatMap((station) => {
      const gates = stationGates(station, graph.nodes.values());
      if (gates.length === 0) return [];
      return [
        {
          key: `station:${station.id}`,
          place: { nodeId: gates[0], nodeIds: gates, name: station.name, aboveGround: false },
          kindLabel: t('search.kindStation'),
        },
      ];
    });
    const poiResults: Result[] = pois
      .filter((p) => matches(p.name))
      .map((p) => ({
        key: p.id,
        place: { nodeId: p.nodeId, name: p.name, aboveGround: true },
        // 地上の建物は、いちばん近い出口の番号も出す（「阪神百貨店 → 地上・出口 17」）
        kindLabel: exitLabel(p.nodeId) ?? t('search.kindPoi'),
      }));
    // ビルの中の店はビル名でも見つかるようにする（「ヨドバシ」で中の店も出る）
    const shopResults: Result[] = shops
      .map((s) => ({ shop: s, name: shopPlaceName(s) }))
      .filter(({ name }) => matches(name))
      .map(({ shop: s, name }) => ({
        key: s.id,
        place: { nodeId: s.nodeId, name, aboveGround: false },
        kindLabel: t(s.building === undefined ? 'search.kindShop' : 'search.kindBuildingShop'),
      }));
    // 出口・駅・広場を先に、通路の分岐（「ekimo梅田 北」など）は後ろに並べる
    const nodeResults: Result[] = [...graph.nodes.values()]
      .filter((n) => matches(n.name) || (n.exitNo ?? '').toLowerCase() === q)
      .sort((a, b) => Number(a.kind === 'junction') - Number(b.kind === 'junction'))
      .map((n) => ({
        key: n.id,
        place: { nodeId: n.id, name: n.name, aboveGround: false },
        kindLabel: t('search.kindNode'),
      }));

    return [...stationResults, ...poiResults, ...shopResults, ...nodeResults].slice(0, MAX_RESULTS);
  }, [query, pois, shops, graph, t]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** 結果のボタンを ↑↓ で行き来する。先頭で ↑ なら入力欄へ戻る */
  const moveFocus = (from: number, step: number) => {
    const buttons = listRef.current?.querySelectorAll('button');
    if (!buttons || buttons.length === 0) return;
    const next = from + step;
    if (next < 0) inputRef.current?.focus();
    else buttons[Math.min(next, buttons.length - 1)].focus();
  };
  const onResultKey = (index: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(index, e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Escape') {
      setQuery('');
      inputRef.current?.focus();
    }
  };
  const searching = query.trim() !== '';

  const pick = (result: Result) => {
    setQuery('');
    onPick(result.place);
  };

  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        type="search"
        value={query}
        placeholder={t('search.placeholder')}
        aria-label={t('search.placeholder')}
        aria-describedby="search-count"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setQuery('');
          if (e.key === 'ArrowDown' && results.length > 0) {
            e.preventDefault();
            moveFocus(-1, 1);
          }
        }}
      />
      {/* 読み上げ向けに件数を伝える（画面には出さない） */}
      <p id="search-count" className="visually-hidden" role="status">
        {searching ? t('search.count', { count: results.length }) : ''}
      </p>
      {results.length > 0 && (
        <ul ref={listRef} className="search-results" aria-label={t('search.results')}>
          {results.map((result, index) => (
            <li key={result.key}>
              <button type="button" onClick={() => pick(result)} onKeyDown={onResultKey(index)}>
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
