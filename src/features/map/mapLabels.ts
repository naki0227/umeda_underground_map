import type { AreaId, LocalizedText, MapNode, NodeId } from '../../domain/types';
import { localized } from '../../i18n';
import { detailLevel } from './detail';
import { pinShortName } from './mapIcons';
import { BUILDING_ICON_TOP_PX, type Building } from './ground';
import type { ScreenPoint } from './projection';
import { textWidthPx, type LabelBox } from './labelLayout';

/*
 * 地図ラベルの寸法（すべて画面 px）。ラベル類はズームに関係なくこの大きさで描く。
 */
export const EXIT_FONT_PX = 12;
export const EXIT_BADGE_HEIGHT_PX = 20;
export const LABEL_FONT_PX = 12;
export const ZONE_FONT_PX = 14;
export const FACILITY_FONT_PX = 11;
/** 案内中に出す沿道の店名（目印なので少し大きめ） */
export const SHOP_LABEL_FONT_PX = 13;
/** 店名ラベルの位置（ノードからの画面 px。左下が基準） */
export const SHOP_LABEL_OFFSET_PX = { x: 12, y: 20 };
const CHIP_PADDING_PX = 6;
/** 建物ラベルのベースライン（建物の基準点からの画面 px） */
export const buildingLabelYPx = BUILDING_ICON_TOP_PX - 4;
/** 建物ラベルを目印の下に置くときの、上に置くときからの差分（画面 px） */
export const BUILDING_LABEL_BELOW_DY_PX = -BUILDING_ICON_TOP_PX + LABEL_FONT_PX + 10;

/** 目印（広場・改札）のアイコンの半径と、名前の札の位置・高さ（画面 px） */
export const PIN_ICON_RADIUS_PX = 10;
export const PIN_LABEL_X_PX = PIN_ICON_RADIUS_PX + 3;
export const PIN_LABEL_HEIGHT_PX = 18;

/**
 * 目印の名前。拡大したとき（詳細表示）はフルの名前、それ以外は短い名前（改札は路線名）。
 * null ならアイコンだけ
 */
export function pinLabelText(node: MapNode, k: number, language: string): string | null {
  if (detailLevel(k) === 'detail') return localized(node.name, language);
  const short = pinShortName(node);
  return short === null ? null : localized(short, language);
}

export function chipWidthPx(text: string, fontPx: number): number {
  return textWidthPx(text, fontPx) + CHIP_PADDING_PX * 2;
}

export interface MapLabelInput {
  /** 画面 1px あたりのマップ単位 */
  k: number;
  language: string;
  exits: MapNode[];
  pins: MapNode[];
  screenOf: Map<NodeId, ScreenPoint>;
  buildings: Building[];
  facilities: { key: string; label: string; mid: ScreenPoint }[];
  zones: { area: AreaId; center: ScreenPoint }[];
  areaName: (area: AreaId) => string;
  /** 案内中のステップ沿いの店（目印として名前を出す） */
  focusShops?: { id: string; name: LocalizedText; at: ScreenPoint }[];
  /** 詳細表示で出す店名（案内中の店名より優先度は低い） */
  otherShops?: { id: string; name: LocalizedText; at: ScreenPoint }[];
}

/**
 * 重なり判定用のラベル矩形を作る。建物の名前は詳細表示のときだけ（ふだんはアイコン）。優先度: 広場名 > 改札名 > 地下街の名前 > 案内中の沿道の店名 >
 * 出口番号 > 建物名 > 店名（詳細表示）> 設備チップ。いつも見たい目印を先に置き、細かいものは空いた所に出す。id は `exit:` `shop:` `building:` `pin:` `facility:` `zone:` + 元の id。
 */
export function buildMapLabelBoxes(input: MapLabelInput): LabelBox[] {
  const { k, language, exits, pins, screenOf, buildings, facilities, zones, areaName } = input;
  const focusIds = new Set((input.focusShops ?? []).map((shop) => shop.id));
  const focusShops = [
    ...(input.focusShops ?? []).map((shop) => ({ ...shop, priority: 2.5 })),
    ...(input.otherShops ?? [])
      .filter((shop) => !focusIds.has(shop.id))
      .map((shop) => ({ ...shop, priority: 0.8 })),
  ];
  const nameOf = (text: LocalizedText) => localized(text, language);
  const toPx = (p: ScreenPoint) => ({ x: p.px / k, y: p.py / k });
  const at = (id: NodeId) => screenOf.get(id) as ScreenPoint;
  const boxes: LabelBox[] = [];

  for (const node of exits) {
    const { x, y } = toPx(at(node.id));
    const width = chipWidthPx(node.exitNo ?? nameOf(node.name), EXIT_FONT_PX);
    boxes.push({
      id: `exit:${node.id}`,
      x: x - width / 2,
      y: y - EXIT_BADGE_HEIGHT_PX / 2,
      width,
      height: EXIT_BADGE_HEIGHT_PX,
      priority: 2,
    });
  }
  // 建物はアイコンだけ。名前は拡大したとき（詳細表示）に出す
  for (const { poi, base } of detailLevel(k) === 'detail' ? buildings : []) {
    const { x, y } = toPx(base);
    const width = textWidthPx(nameOf(poi.name), LABEL_FONT_PX);
    boxes.push({
      id: `building:${poi.id}`,
      x: x - width / 2,
      y: y + buildingLabelYPx - LABEL_FONT_PX,
      width,
      height: LABEL_FONT_PX + 2,
      priority: 1.5,
      // 上に置けなければ目印の下に置く（同じ建物の中のスポットどうしなど）
      alternatives: [{ dx: 0, dy: BUILDING_LABEL_BELOW_DY_PX }],
    });
  }
  // 同じノードの店名は縦に並べる
  const shopRowByNode = new Map<string, number>();
  for (const shop of focusShops) {
    const key = `${shop.at.px},${shop.at.py}`;
    const row = shopRowByNode.get(key) ?? 0;
    shopRowByNode.set(key, row + 1);
    const { x, y } = toPx(shop.at);
    boxes.push({
      id: `shop:${shop.id}`,
      x: x + SHOP_LABEL_OFFSET_PX.x,
      y: y + SHOP_LABEL_OFFSET_PX.y - SHOP_LABEL_FONT_PX + row * (SHOP_LABEL_FONT_PX + 4),
      width: textWidthPx(nameOf(shop.name), SHOP_LABEL_FONT_PX),
      height: SHOP_LABEL_FONT_PX + 2,
      priority: shop.priority,
    });
  }
  for (const node of pins) {
    const text = pinLabelText(node, k, language);
    if (text === null) continue;
    const { x, y } = toPx(at(node.id));
    boxes.push({
      id: `pin:${node.id}`,
      x: x + PIN_LABEL_X_PX,
      y: y - PIN_LABEL_HEIGHT_PX / 2,
      width: chipWidthPx(text, LABEL_FONT_PX),
      height: PIN_LABEL_HEIGHT_PX,
      priority: node.kind === 'landmark' ? 4 : 3.5,
    });
  }
  for (const { key, label, mid } of facilities) {
    const { x, y } = toPx(mid);
    const width = chipWidthPx(label, FACILITY_FONT_PX);
    boxes.push({
      id: `facility:${key}`,
      x: x - width / 2,
      y: y - 8,
      width,
      height: 16,
      priority: 0.5,
    });
  }
  for (const zone of zones) {
    if (zone.area === 'station') continue;
    const { x, y } = toPx(zone.center);
    const width = textWidthPx(areaName(zone.area), ZONE_FONT_PX);
    boxes.push({
      id: `zone:${zone.area}`,
      x: x - width / 2,
      y: y - ZONE_FONT_PX,
      width,
      height: ZONE_FONT_PX + 2,
      priority: 3,
    });
  }
  return boxes;
}
