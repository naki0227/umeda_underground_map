import type { LocalizedText } from '../../domain/types';
import type { Place } from '../map/InteractiveMap';

const STORAGE_KEY = 'umeda-navi.favorites';
/** 端末内に保存するだけなので、念のため件数に上限を設ける */
export const MAX_FAVORITES = 50;

/** 場所を一意に表すキー（同じノードの別の店も区別する） */
export function favoriteKey(place: Place): string {
  return `${place.aboveGround ? 'poi' : 'node'}:${place.nodeId}:${place.name.ja}`;
}

function isLocalizedText(value: unknown): value is LocalizedText {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.ja === 'string' && typeof v.en === 'string';
}

function isPlace(value: unknown): value is Place {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.nodeId === 'string' && typeof v.aboveGround === 'boolean' && isLocalizedText(v.name)
  );
}

/**
 * 保存済みのお気に入り。壊れたデータ・形式違いは読み飛ばし、
 * 保存できない環境（プライベートモード等）では空にする。
 */
export function loadFavorites(): Place[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isPlace)
      .map((p) => ({
        nodeId: p.nodeId,
        name: { ja: p.name.ja, en: p.name.en },
        aboveGround: p.aboveGround,
        // 駅など、行き先の候補が複数あるもの
        ...(Array.isArray(p.nodeIds) && p.nodeIds.every((id) => typeof id === 'string')
          ? { nodeIds: p.nodeIds }
          : {}),
      }))
      .slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: Place[]): void {
  try {
    globalThis.localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify(favorites.slice(0, MAX_FAVORITES)),
    );
  } catch {
    // 保存できなくても、このセッション中のお気に入りは使える
  }
}

/** 追加と解除を切り替える。追加は先頭に入れる */
export function toggleFavorite(favorites: Place[], place: Place): Place[] {
  const key = favoriteKey(place);
  if (favorites.some((f) => favoriteKey(f) === key)) {
    return favorites.filter((f) => favoriteKey(f) !== key);
  }
  return [place, ...favorites].slice(0, MAX_FAVORITES);
}
