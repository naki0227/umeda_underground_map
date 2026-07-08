/** 多言語表記。UIの言語設定に応じて切り替える。 */
export interface LocalizedText {
  ja: string;
  en: string;
}

export type NodeId = string;

/** 地下街の区画 */
export type AreaId =
  | 'whity' // ホワイティうめだ
  | 'diamor' // ディアモール大阪
  | 'sanbangai' // 阪急三番街
  | 'ekimo' // ekimo梅田
  | 'dojima' // ドージマ地下センター
  | 'station'; // 駅構内・連絡通路

export type NodeKind =
  | 'junction' // 通路の交差点・分岐
  | 'exit' // 地上出口
  | 'gate' // 駅改札
  | 'landmark'; // 広場・目印（泉の広場など）

export interface MapNode {
  id: NodeId;
  kind: NodeKind;
  name: LocalizedText;
  area: AreaId;
  /** 表示・距離計算用の平面座標（メートル相当、東=+x / 北=+y） */
  x: number;
  y: number;
  /** 出口・改札のみ: GPS照合用の緯度経度 */
  lat?: number;
  lng?: number;
  /** 出口番号（例: "C-60"） */
  exitNo?: string;
}

export type EdgeAttr = 'stairs' | 'escalator' | 'elevator' | 'slope';

/** 通路。省略時は双方向。 */
export interface MapEdge {
  from: NodeId;
  to: NodeId;
  distanceM: number;
  attrs?: EdgeAttr[];
}

export type ShopCategory =
  | 'restaurant'
  | 'cafe'
  | 'fashion'
  | 'goods'
  | 'service'
  | 'convenience'
  | 'drugstore'
  | 'bakery'
  | 'bookstore';

export interface Shop {
  id: string;
  name: LocalizedText;
  category: ShopCategory;
  /** 店舗前にあたるノード */
  nodeId: NodeId;
}

export interface UndergroundMap {
  /** データ作成時点。店舗情報はこの時点のスナップショット。 */
  dataVersion: string;
  nodes: MapNode[];
  edges: MapEdge[];
  shops: Shop[];
}
