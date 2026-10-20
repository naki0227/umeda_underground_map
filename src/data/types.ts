import type {
  AreaId,
  EdgeAttr,
  FloorId,
  LocalizedText,
  MapEdge,
  NodeKind,
  Shop,
} from '../domain/types';

/** 生成データのノード。平面座標 x, y は緯度経度から読み込み時に計算する */
export interface GeneratedNode {
  id: string;
  kind: NodeKind;
  name: LocalizedText;
  area: AreaId;
  lat: number;
  lng: number;
  floor?: FloorId;
  exitNo?: string;
  /** 出典の OSM 要素（例: node/123） */
  osmId?: string;
}

/** 地上スポット。最寄り出口は読み込み時に緯度経度から決める */
export interface GeneratedPoi {
  id: string;
  name: LocalizedText;
  lat: number;
  lng: number;
}

export interface GeneratedMapData {
  /** OSM 抽出データの取得日 */
  generatedAt: string;
  nodes: GeneratedNode[];
  edges: (Omit<MapEdge, 'attrs'> & { attrs?: EdgeAttr[] })[];
  shops: Shop[];
  pois: GeneratedPoi[];
}
