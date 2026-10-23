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
  /** 置けなかったときに試す代わりの位置（x, y の差分。画面 px） */
  alternatives?: { dx: number; dy: number }[];
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
 * 重ならないように表示するラベルと、その位置を選ぶ（優先度の高い順に貪欲に置く）。
 * 元の位置で重なるときは代わりの位置を順に試す。同じ優先度なら入力順。
 * 戻り値は表示するラベルの id → 使った位置（0 = 元の位置、1 以降 = alternatives の番号 + 1）。
 */
export function placeLabelLayout(boxes: LabelBox[]): Map<string, number> {
  const ordered = boxes
    .map((box, index) => ({ box, index }))
    .sort((a, b) => b.box.priority - a.box.priority || a.index - b.index);
  const placed: LabelBox[] = [];
  const layout = new Map<string, number>();
  for (const { box } of ordered) {
    const candidates = [
      box,
      ...(box.alternatives ?? []).map(({ dx, dy }) => ({ ...box, x: box.x + dx, y: box.y + dy })),
    ];
    const position = candidates.findIndex((c) => !placed.some((other) => overlaps(c, other)));
    if (position < 0) continue;
    placed.push(candidates[position]);
    layout.set(box.id, position);
  }
  return layout;
}

/** 重ならないように表示するラベルを選ぶ。戻り値は表示するラベルの id */
export function placeLabels(boxes: LabelBox[]): Set<string> {
  return new Set(placeLabelLayout(boxes).keys());
}
