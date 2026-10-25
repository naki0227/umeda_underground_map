import { useCallback, useState } from 'react';
import type { Place } from '../map/InteractiveMap';
import type { Graph } from '../../domain/graph';
import {
  favoriteKey,
  loadFavorites,
  reconcileFavorites,
  saveFavorites,
  toggleFavorite,
} from './favoritesStore';

type Places = Parameters<typeof reconcileFavorites>[2];

/** お気に入りの場所（端末内の localStorage にのみ保存） */
export function useFavorites(graph: Graph, places: Places) {
  // 読み込むときに、いまの地図データにない場所を付け替える・外す
  const [favorites, setFavorites] = useState<Place[]>(() =>
    reconcileFavorites(loadFavorites(), graph, places),
  );

  const toggle = useCallback((place: Place) => {
    setFavorites((prev) => {
      const next = toggleFavorite(prev, place);
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (place: Place) => favorites.some((f) => favoriteKey(f) === favoriteKey(place)),
    [favorites],
  );

  return { favorites, toggle, isFavorite };
}
