import type { ShopCategory } from '../../../domain/types';

/** 店の種類ごとのアイコンと看板の色（一人称の表示の店先） */
export const SHOP_STYLE: Record<ShopCategory, { icon: string; color: string }> = {
  restaurant: { icon: '🍜', color: '#f97316' },
  cafe: { icon: '☕', color: '#a0612b' },
  fashion: { icon: '👗', color: '#ec4899' },
  goods: { icon: '🎁', color: '#8b5cf6' },
  service: { icon: '✂️', color: '#64748b' },
  convenience: { icon: '🏪', color: '#16a34a' },
  drugstore: { icon: '💊', color: '#0ea5e9' },
  bakery: { icon: '🥐', color: '#eab308' },
  bookstore: { icon: '📚', color: '#2563eb' },
};

/** 種類が分からない店 */
export const DEFAULT_SHOP_STYLE = { icon: '🛍️', color: '#e11d48' };

/** 出口の看板（梅田の出口案内の黄色） */
export const EXIT_STYLE = { icon: '⬆', color: '#facc15' };

/** "#rrggbb" どうしを t（0〜1）で混ぜる */
export function mixColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const ca = (pa >> shift) & 0xff;
    const cb = (pb >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * t);
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}
