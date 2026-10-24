/** 平面の点（x=東, y=北。メートル） */
export interface PlanePoint {
  x: number;
  y: number;
}

/**
 * 進む方向が上になる小さな地図の座標変換。center を地図の中心に置き、heading（進む向き）が
 * 真上を向くよう回転して、scale（px/m）で縮める。戻り値は SVG の座標（size × size の正方形）
 */
export function headingUpProjector(
  center: PlanePoint,
  heading: PlanePoint,
  scale: number,
  size: number,
): (p: PlanePoint) => { px: number; py: number } {
  // 北から時計回りの角度。この角度だけ反時計回りに回すと、進む向きが北（上）になる
  const bearing = Math.atan2(heading.x, heading.y);
  const cos = Math.cos(bearing);
  const sin = Math.sin(bearing);
  return (p) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const x = dx * cos - dy * sin;
    const y = dx * sin + dy * cos;
    return { px: size / 2 + x * scale, py: size / 2 - y * scale };
  };
}

/**
 * headingUpProjector と同じ変換を、地図の画面座標（x, -y）で描いた要素にかける SVG の transform にする。
 * 大きな地図の下地や地下街の形をそのまま回して使える
 */
export function headingUpTransform(
  center: PlanePoint,
  heading: PlanePoint,
  scale: number,
  size: number,
): string {
  const bearing = Math.atan2(heading.x, heading.y);
  const c = Math.cos(bearing) * scale;
  const s = Math.sin(bearing) * scale;
  const e = size / 2 - c * center.x + s * center.y;
  const f = size / 2 + s * center.x + c * center.y;
  return `matrix(${c} ${-s} ${s} ${c} ${e} ${f})`;
}
