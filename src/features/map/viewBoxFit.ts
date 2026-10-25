export interface Bounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 初期表示で最低限見せる範囲（全体幅に対する割合） */
const MIN_INITIAL_WIDTH_RATIO = 0.55;

/**
 * 初期表示（と ⌂ ボタン）の表示範囲。縦長の画面で全体を収めると地図が
 * 小さくなりすぎるため、画面の縦を埋める倍率を基本にし、横幅は全体の
 * 55%〜100% の範囲に収める。中心は全体の中心。
 */
export function fitViewBox(bounds: Bounds, pixel: { width: number; height: number }): ViewBox {
  const fillHeightWidth = bounds.height * (pixel.width / pixel.height);
  const w = Math.min(
    bounds.width,
    Math.max(fillHeightWidth, bounds.width * MIN_INITIAL_WIDTH_RATIO),
  );
  const h = w * (pixel.height / pixel.width);
  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** 画面のうち地図が隠れずに見える縦の範囲（上下から隠れる割合） */
export interface ViewInsets {
  top: number;
  bottom: number;
}

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** 矩形のまわりに取る余白（矩形の大きさに対する割合） */
const FIT_PADDING_RATIO = 0.15;

/**
 * 矩形（経路や区間）が、上下の UI に隠れない範囲にちょうど収まる表示範囲。
 * 小さすぎる矩形は最大拡大（minWidth）で止め、大きすぎる場合は maxWidth まで。
 */
export function fitRectViewBox(
  rect: Rect,
  pixel: { width: number; height: number },
  insets: ViewInsets,
  limits: { minWidth: number; maxWidth: number },
): ViewBox {
  const aspect = pixel.height / pixel.width;
  const band = Math.max(0.2, 1 - insets.top - insets.bottom);
  const rw = (rect.maxX - rect.minX) * (1 + FIT_PADDING_RATIO * 2);
  const rh = (rect.maxY - rect.minY) * (1 + FIT_PADDING_RATIO * 2);
  const w = Math.min(limits.maxWidth, Math.max(limits.minWidth, rw, rh / band / aspect));
  const h = w * aspect;
  const cx = (rect.minX + rect.maxX) / 2;
  const cy = (rect.minY + rect.maxY) / 2;
  return { x: cx - w / 2, y: cy - h * (insets.top + band / 2), w, h };
}
