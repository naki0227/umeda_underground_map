import { isUndergroundShop } from '../domain/shopLabel';
import type { Shop } from '../domain/types';

/** 比較用に店名を正規化する（空白・中黒・記号を除き小文字に） */
export function normalizeShopName(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s・･\-‐ー'’.&＆]/g, '');
}

/** 公式サイトの店名の先頭（「◯◯ △△店」の ◯◯）。短すぎるものは照合に使わない */
function brandPart(name: string): string {
  return normalizeShopName(name.split(/[\s　]/)[0]);
}

const MIN_MATCH_LENGTH = 3;

function sameShop(official: Shop, osm: Shop): boolean {
  const brand = brandPart(official.name.ja);
  if (brand.length < MIN_MATCH_LENGTH) return false;
  return (
    normalizeShopName(osm.name.ja).includes(brand) || normalizeShopName(osm.name.en).includes(brand)
  );
}

/**
 * 公式サイト由来の店と OSM 由来の店をまとめる。同じ店が両方にあれば OSM 側
 * （店名・種別・位置）を使い、公式サイト由来の方は捨てる（出典を OSM に一本化する）。
 * OSM にない店だけ公式サイト由来のものを残す。
 * 同じ地下街の地下の店どうしだけを照合するため、areaOf でエリアを渡す（ビルの地上階の同名の店とは照合しない）。
 */
export function mergeShops(
  official: Shop[],
  osm: Shop[],
  areaOf: (nodeId: string) => string | undefined,
): Shop[] {
  const used = new Set<string>();
  const officialOnly = official.filter((shop) => {
    const area = areaOf(shop.nodeId);
    const match = osm.find(
      (candidate) =>
        !used.has(candidate.id) &&
        isUndergroundShop(candidate) &&
        areaOf(candidate.nodeId) === area &&
        sameShop(shop, candidate),
    );
    if (match === undefined) return true;
    used.add(match.id);
    return false;
  });
  return [...officialOnly, ...osm];
}
