import type { PlanePoint } from './perspective';

/** 通路の壁に並べる店・出口・脇道 */
export interface SceneItem {
  key: string;
  kind: 'shop' | 'exit' | 'passage';
  side: 'left' | 'right';
  /** 経路の起点からの距離（m） */
  distanceM: number;
  /** 看板の文字（出口番号・店名） */
  name: string;
  icon: string;
  color: string;
}

export interface ScenePolygon {
  key: string;
  points: string;
  fill: string;
}

export interface SceneLabel {
  key: string;
  kind: SceneItem['kind'] | 'turn' | 'goal';
  /** 吹き出しの下端の中央（SVG 座標） */
  x: number;
  y: number;
  fontPx: number;
  icon: string;
  text: string;
  color: string;
  /** 目からの距離（m）。近いほど優先して出す */
  depthM: number;
}

export interface Scene {
  width: number;
  height: number;
  polygons: ScenePolygon[];
  labels: SceneLabel[];
}

export interface SceneInput {
  /** 経路の折れ線（起点 = いまいる所） */
  path: PlanePoint[];
  items: SceneItem[];
  /** 曲がる所（起点からの距離 m）と、そのアイコン */
  turn?: { distanceM: number; icon: string };
  /** 折れ線の終点が目的地なら、そのアイコンと名前 */
  goal?: { icon: string; text: string };
}
