import type { AreaId, LocalizedText, MapNode, NodeId } from '../../domain/types';
import { localized } from '../../i18n';
import { BUILDING_HALF_WIDTH, BUILDING_HEIGHT, type Building } from './ground';
import type { ScreenPoint } from './iso';
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
/** 建物ラベルを屋根からどれだけ上に出すか */
export const BUILDING_LABEL_GAP_PX = 6;
/** 互い違いにした2段目のラベルの追加の高さ */
export const BUILDING_LABEL_ROW_PX = 16;

/** 建物ラベルのベースライン（屋根の頂点からの画面 px） */
export function buildingLabelOffsetPx(labelRow: 0 | 1): number {
  return -BUILDING_LABEL_GAP_PX - labelRow * BUILDING_LABEL_ROW_PX;
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
}

/**
 * 重なり判定用のラベル矩形を作る。優先度: 出口番号 > 案内中の沿道の店名 > 建物名 > 広場名 > 改札名 >
 * 設備チップ > エリア名。id は `exit:` `shop:` `building:` `pin:` `facility:` `zone:` + 元の id。
 */
export function buildMapLabelBoxes(input: MapLabelInput): LabelBox[] {
  const { k, language, exits, pins, screenOf, buildings, facilities, zones, areaName } = input;
  const focusShops = input.focusShops ?? [];
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
      priority: 3,
    });
  }
  for (const { poi, base, labelRow } of buildings) {
    const roofTop = { px: base.px, py: base.py - BUILDING_HEIGHT - BUILDING_HALF_WIDTH * 0.5 };
    const { x, y } = toPx(roofTop);
    const width = textWidthPx(nameOf(poi.name), LABEL_FONT_PX);
    boxes.push({
      id: `building:${poi.id}`,
      x: x - width / 2,
      y: y + buildingLabelOffsetPx(labelRow) - LABEL_FONT_PX,
      width,
      height: LABEL_FONT_PX + 2,
      priority: 2,
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
      priority: 2.5,
    });
  }
  for (const node of pins) {
    const { x, y } = toPx(at(node.id));
    boxes.push({
      id: `pin:${node.id}`,
      x: x + 10,
      y: y - 6 - LABEL_FONT_PX,
      width: textWidthPx(nameOf(node.name), LABEL_FONT_PX),
      height: LABEL_FONT_PX + 2,
      priority: node.kind === 'landmark' ? 1.5 : 1,
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
      priority: 0,
    });
  }
  return boxes;
}
