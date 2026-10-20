/**
 * 地図ラベルの配置。ラベルは画面上で一定サイズ（px）で描くため、
 * 重なり判定も画面 px で行う。パンでは相対位置が変わらないので、
 * 座標は「マップ座標 / 1px あたりのマップ単位」で求めればよい。
 */

/** 画面 px 単位の矩形。x, y は左上 */
export interface LabelBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 大きいほど優先して表示する */
  priority: number;
}

/** 文字列の表示幅（px）の概算。全角 = 1em、半角 = 0.6em */
export function textWidthPx(text: string, fontPx: number): number {
  let width = 0;
  for (const ch of text) width += ch.charCodeAt(0) > 0xff ? fontPx : fontPx * 0.6;
  return width;
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * 重ならないように表示するラベルを選ぶ（優先度の高い順に貪欲に置く）。
 * 同じ優先度なら入力順。戻り値は表示するラベルの id。
 */
export function placeLabels(boxes: LabelBox[]): Set<string> {
  const ordered = boxes
    .map((box, index) => ({ box, index }))
    .sort((a, b) => b.box.priority - a.box.priority || a.index - b.index);
  const placed: LabelBox[] = [];
  const visible = new Set<string>();
  for (const { box } of ordered) {
    if (placed.some((other) => overlaps(box, other))) continue;
    placed.push(box);
    visible.add(box.id);
  }
  return visible;
}
