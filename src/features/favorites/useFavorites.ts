import { useCallback, useState } from 'react';
import type { Place } from '../map/InteractiveMap';
import { favoriteKey, loadFavorites, saveFavorites, toggleFavorite } from './favoritesStore';

/** お気に入りの場所（端末内の localStorage にのみ保存） */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Place[]>(loadFavorites);

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
