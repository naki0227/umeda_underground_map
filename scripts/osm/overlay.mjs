// OSM から作る通路グラフに重ねる手作業のデータ（キュレーション）。
// 位置は「原点（ORIGIN）からの東西・南北のメートル」で書く（x=東, y=北）。
// 各値の根拠をコメントに残す。OSM 由来の位置は OSM の要素 ID を書く。

/** 平面座標の原点。src/domain/geo.ts の PLANE_ORIGIN と同じ値にすること */
export const ORIGIN = { lat: 34.7025, lng: 135.4959 };

/** 取り込む範囲（メートル）。梅田の地下街と駅の連絡通路が入る大きさ */
export const REGION = { minX: -320, maxX: 640, minY: -800, maxY: 420 };

/** OSM の地下街ポリゴン（way の name）→ アプリのエリア */
export const AREA_POLYGONS = {
  whity: 'Whityうめだ',
  diamor: 'ディアモール大阪',
  dojima: 'ドージマ地下センター',
  ekimo: 'ekimo梅田',
};

/**
 * 名前のある場所。近くの通路の点（snapM 以内、出口以外）があればその点に
 * 名前と ID を付け、なければ点を足して近くの通路へつなぐ。
 * ID は旧データと同じものを使い、店舗・テストの参照を保つ。
 */
export const PLACES = [
  // --- ホワイティうめだ（OSM の Whityうめだ ポリゴン内の東西の通路 y≈-50 に沿って配置）
  {
    id: 'wt-c1',
    kind: 'junction',
    area: 'whity',
    x: 330,
    y: -45,
    name: { ja: 'センターモール西', en: 'Center Mall West' },
  },
  {
    id: 'wt-c2',
    kind: 'junction',
    area: 'whity',
    x: 400,
    y: -48,
    name: { ja: 'センターモール中央', en: 'Center Mall Central' },
  },
  {
    id: 'wt-c3',
    kind: 'junction',
    area: 'whity',
    x: 460,
    y: -50,
    name: { ja: 'センターモール東', en: 'Center Mall East' },
  },
  {
    id: 'wt-c4',
    kind: 'junction',
    area: 'whity',
    x: 505,
    y: -50,
    name: { ja: 'イーストモール', en: 'East Mall' },
  },
  // OSM node 5018031057（place=square, level=-1, name=泉の広場）
  {
    id: 'wt-izumi',
    kind: 'landmark',
    area: 'whity',
    osmNode: '5018031057',
    name: { ja: '泉の広場（Water Tree）', en: 'Izumi Plaza (Water Tree)' },
  },
  // ノースモール・サウスモールは OSM に通路がないため推定位置（センターモールの北・南）
  {
    id: 'wt-n1',
    kind: 'junction',
    area: 'whity',
    x: 400,
    y: 5,
    link: ['wt-c2'],
    name: { ja: 'ノースモール西', en: 'North Mall West' },
  },
  {
    id: 'wt-n2',
    kind: 'junction',
    area: 'whity',
    x: 460,
    y: 5,
    link: ['wt-n1', 'wt-c3'],
    name: { ja: 'ノースモール東', en: 'North Mall East' },
  },
  {
    id: 'wt-petit',
    kind: 'junction',
    area: 'whity',
    x: 505,
    y: 0,
    link: ['wt-n2', 'wt-c4'],
    name: { ja: 'プチシャン', en: 'Petit Champ' },
  },
  {
    id: 'wt-s1',
    kind: 'junction',
    area: 'whity',
    x: 400,
    y: -100,
    link: ['wt-c2'],
    name: { ja: 'サウスモール', en: 'South Mall' },
  },

  // --- ディアモール大阪（OSM の円形広場 way 1313639738 と大阪駅前ビルの位置から）
  {
    id: 'dm-circle',
    kind: 'landmark',
    area: 'diamor',
    osmWay: '1313639738',
    name: { ja: '円形広場', en: 'Circular Plaza' },
  },
  {
    id: 'dm-n',
    kind: 'junction',
    area: 'diamor',
    x: 125,
    y: -185,
    name: { ja: 'ディアモール北通路', en: 'Diamor North Passage' },
  },
  {
    id: 'dm-e',
    kind: 'junction',
    area: 'diamor',
    x: 220,
    y: -300,
    name: { ja: 'ディアモール東通路', en: 'Diamor East Passage' },
  },
  {
    id: 'dm-s',
    kind: 'junction',
    area: 'diamor',
    x: 120,
    y: -375,
    name: { ja: 'ディアモール南通路', en: 'Diamor South Passage' },
  },
  {
    id: 'dm-w',
    kind: 'junction',
    area: 'diamor',
    x: 60,
    y: -300,
    name: { ja: 'ディアモール西通路', en: 'Diamor West Passage' },
  },
  // 大阪駅前第1・第2・第4ビル: OSM way 70561756 / 70561758 / 135624700。
  // 第3ビルは建物ポリゴンがないため、住所に第3ビルとある OSM node 5858941191 の位置
  {
    id: 'dm-b1',
    kind: 'landmark',
    area: 'diamor',
    osmWay: '70561756',
    noSnap: true,
    name: { ja: '大阪駅前第1ビル B1', en: 'Ekimae Dai-1 Bldg. B1' },
  },
  {
    id: 'dm-b2',
    kind: 'landmark',
    area: 'diamor',
    osmWay: '70561758',
    noSnap: true,
    name: { ja: '大阪駅前第2ビル B1', en: 'Ekimae Dai-2 Bldg. B1' },
  },
  {
    id: 'dm-b3',
    kind: 'landmark',
    area: 'diamor',
    osmNode: '5858941191',
    noSnap: true,
    name: { ja: '大阪駅前第3ビル B1', en: 'Ekimae Dai-3 Bldg. B1' },
  },
  {
    id: 'dm-b4',
    kind: 'landmark',
    area: 'diamor',
    osmWay: '135624700',
    noSnap: true,
    name: { ja: '大阪駅前第4ビル B1', en: 'Ekimae Dai-4 Bldg. B1' },
  },

  // --- 阪急三番街（OSM node 3668881125 = 南館、5017837519 = 北館）。南館・北館とも B1 と B2
  {
    id: 'sb-s',
    kind: 'junction',
    area: 'sanbangai',
    osmNode: '3668881125',
    name: { ja: '三番街南館 B1', en: 'Sanbangai South B1' },
  },
  {
    id: 'sb-n',
    kind: 'junction',
    area: 'sanbangai',
    osmNode: '5017837519',
    link: ['sb-s'],
    name: { ja: '三番街北館 B1', en: 'Sanbangai North B1' },
  },
  {
    id: 'sb-w',
    kind: 'junction',
    area: 'sanbangai',
    x: 190,
    y: 320,
    link: ['sb-s', 'sb-n'],
    name: { ja: '三番街西通路', en: 'Sanbangai West Passage' },
  },
  {
    id: 'sb-s-b2',
    kind: 'junction',
    area: 'sanbangai',
    osmNode: '3668881125',
    floor: 'B2',
    link: ['sb-s'],
    linkAttrs: ['escalator'],
    noSnap: true,
    name: { ja: '三番街南館 B2', en: 'Sanbangai South B2' },
  },
  {
    id: 'sb-n-b2',
    kind: 'junction',
    area: 'sanbangai',
    osmNode: '5017837519',
    floor: 'B2',
    link: ['sb-n', 'sb-s-b2'],
    linkAttrs: ['escalator'],
    noSnap: true,
    name: { ja: '三番街北館 B2', en: 'Sanbangai North B2' },
  },

  // --- ekimo梅田（OSM way 1304559277 のポリゴン内、御堂筋線の駅に沿って南北）
  {
    id: 'ek-1',
    kind: 'junction',
    area: 'ekimo',
    x: 195,
    y: 0,
    name: { ja: 'ekimo梅田 南', en: 'ekimo Umeda South' },
  },
  {
    id: 'ek-2',
    kind: 'junction',
    area: 'ekimo',
    x: 200,
    y: 50,
    name: { ja: 'ekimo梅田 北', en: 'ekimo Umeda North' },
  },

  // --- ドージマ地下センター（OSM way 1304559274 のポリゴン内の南北の通路 x≈-35）
  {
    id: 'dj-1',
    kind: 'junction',
    area: 'dojima',
    x: -30,
    y: -480,
    name: { ja: 'ドーチカ北', en: 'Dotica North' },
  },
  {
    id: 'dj-2',
    kind: 'junction',
    area: 'dojima',
    x: -33,
    y: -580,
    name: { ja: 'ドーチカ中央', en: 'Dotica Central' },
  },
  {
    id: 'dj-3',
    kind: 'junction',
    area: 'dojima',
    x: -36,
    y: -680,
    name: { ja: 'ドーチカ南', en: 'Dotica South' },
  },

  // --- 改札（駅の位置は OSM の駅ノード。地上の改札は 1F）
  // JR大阪駅 御堂筋口: OSM で「御堂筋改札内」とある店舗（node 11371408291 / 11472452557）の位置
  {
    id: 'st-jr-midosuji',
    kind: 'gate',
    area: 'station',
    x: 99,
    y: 66,
    floor: '1F',
    noSnap: true,
    name: { ja: 'JR大阪駅 御堂筋口', en: 'JR Osaka Sta. Midosuji Gate' },
  },
  // JR大阪駅 桜橋口: OSM node 3375274239（entrance=main, name=桜橋口）
  {
    id: 'st-jr-sakurabashi',
    kind: 'gate',
    area: 'station',
    osmNode: '3375274239',
    floor: '1F',
    noSnap: true,
    name: { ja: 'JR大阪駅 桜橋口', en: 'JR Osaka Sta. Sakurabashi Gate' },
  },
  // 御堂筋線 梅田駅: OSM node 7811929025（駅）の北・南（推定）
  {
    id: 'st-metro-n',
    kind: 'gate',
    area: 'station',
    x: 165,
    y: 165,
    noSnap: true,
    name: { ja: '御堂筋線梅田駅 北改札', en: 'Metro Umeda Sta. North Gate' },
  },
  {
    id: 'st-metro-s',
    kind: 'gate',
    area: 'station',
    x: 175,
    y: 30,
    noSnap: true,
    name: { ja: '御堂筋線梅田駅 南改札', en: 'Metro Umeda Sta. South Gate' },
  },
  // 阪神 大阪梅田駅: OSM node 3632936957
  {
    id: 'st-hanshin',
    kind: 'gate',
    area: 'station',
    osmNode: '3632936957',
    noSnap: true,
    name: { ja: '阪神大阪梅田駅 東改札', en: 'Hanshin Osaka-Umeda Sta. East Gate' },
  },
  // 阪急 大阪梅田駅: 駅ビル（OSM way 139168082）の南端。改札は地上階
  {
    id: 'st-hankyu',
    kind: 'gate',
    area: 'station',
    x: 225,
    y: 240,
    floor: '1F',
    noSnap: true,
    linkAttrs: ['escalator'],
    name: { ja: '阪急大阪梅田駅 地下連絡口', en: 'Hankyu Osaka-Umeda Sta. (underground access)' },
  },
  // 東梅田駅: OSM node 5411378288 / 西梅田駅: OSM node 7893338340 / 北新地駅: OSM node 7944201016
  {
    id: 'st-higashiumeda',
    kind: 'gate',
    area: 'station',
    osmNode: '5411378288',
    noSnap: true,
    name: { ja: '谷町線東梅田駅 改札', en: 'Higashi-Umeda Sta. Gate' },
  },
  {
    id: 'st-nishiumeda',
    kind: 'gate',
    area: 'station',
    osmNode: '7893338340',
    noSnap: true,
    name: { ja: '四つ橋線西梅田駅 改札', en: 'Nishi-Umeda Sta. Gate' },
  },
  {
    id: 'st-kitashinchi',
    kind: 'gate',
    area: 'station',
    osmNode: '7944201016',
    noSnap: true,
    name: { ja: 'JR北新地駅 改札', en: 'JR Kitashinchi Sta. Gate' },
  },
];

/**
 * 建物の地下階の店をまとめて付ける点。OSM の建物ポリゴン内（ポリゴンがなければ
 * 半径内）にある地下の店は、通路ではなくこの点に付ける。
 */
export const BUILDING_ANCHORS = [
  { node: 'dm-b1', osmWay: '70561756' },
  { node: 'dm-b2', osmWay: '70561758' },
  { node: 'dm-b3', radiusM: 55 },
  { node: 'dm-b4', osmWay: '135624700' },
];

/**
 * 地上のスポット（POI）。位置は OSM の要素（N=node / W=way の重心）。
 * 最寄り出口はアプリ側で緯度経度から計算する。
 */
export const POIS = [
  {
    id: 'poi-hepfive',
    osm: 'W161451126',
    name: { ja: 'HEP FIVE（赤い観覧車）', en: 'HEP FIVE (Red Ferris Wheel)' },
  },
  { id: 'poi-hepnavio', osm: 'W174789734', name: { ja: 'HEP NAVIO', en: 'HEP NAVIO' } },
  {
    id: 'poi-hankyu-dept',
    osm: 'N9840655056',
    name: { ja: '阪急うめだ本店', en: 'Hankyu Umeda Main Store' },
  },
  {
    id: 'poi-hanshin-dept',
    osm: 'N5865318031',
    name: { ja: '阪神梅田本店', en: 'Hanshin Umeda Main Store' },
  },
  { id: 'poi-daimaru', osm: 'N1740969658', name: { ja: '大丸梅田店', en: 'Daimaru Umeda' } },
  { id: 'poi-lucua', osm: 'W1313244351', name: { ja: 'ルクア大阪', en: 'LUCUA Osaka' } },
  {
    id: 'poi-yodobashi',
    osm: 'W788888925',
    name: { ja: 'ヨドバシ梅田タワー（LINKS UMEDA）', en: 'Yodobashi Umeda Tower (LINKS UMEDA)' },
  },
  {
    id: 'poi-nu-chayamachi',
    osm: 'W162157502',
    name: { ja: 'NU茶屋町プラス', en: 'NU Chayamachi Plus' },
  },
  { id: 'poi-chayamachi', osm: 'N2441014637', name: { ja: '茶屋町', en: 'Chayamachi' } },
  { id: 'poi-umeda-loft', osm: 'N1734162900', name: { ja: '梅田ロフト', en: 'Umeda Loft' } },
  {
    id: 'poi-ohatsutenjin',
    osm: 'N6633527974',
    name: { ja: 'お初天神（露天神社）', en: 'Ohatsu Tenjin Shrine (Tsuyunoten)' },
  },
  {
    id: 'poi-sonezaki-police',
    osm: 'W162157848',
    name: { ja: '曽根崎警察署', en: 'Sonezaki Police Station' },
  },
  {
    id: 'poi-ekimae-1',
    osm: 'W70561756',
    name: { ja: '大阪駅前第1ビル', en: 'Osaka Ekimae Dai-1 Building' },
  },
  {
    id: 'poi-ekimae-2',
    osm: 'W70561758',
    name: { ja: '大阪駅前第2ビル', en: 'Osaka Ekimae Dai-2 Building' },
  },
  {
    id: 'poi-ekimae-4',
    osm: 'W135624700',
    name: { ja: '大阪駅前第4ビル', en: 'Osaka Ekimae Dai-4 Building' },
  },
  {
    id: 'poi-twin-south',
    osm: 'W1014011074',
    name: { ja: '大阪梅田ツインタワーズ・サウス', en: 'Osaka Umeda Twin Towers South' },
  },
  {
    id: 'poi-twin-north',
    osm: 'W588689735',
    name: { ja: '大阪梅田ツインタワーズ・ノース', en: 'Osaka Umeda Twin Towers North' },
  },
  { id: 'poi-herbis-ent', osm: 'W162158152', name: { ja: 'ハービスENT', en: 'HERBIS ENT' } },
  { id: 'poi-herbis-plaza', osm: 'W588689750', name: { ja: 'ハービスPLAZA', en: 'HERBIS PLAZA' } },
  {
    id: 'poi-hilton-west',
    osm: 'W162158150',
    name: { ja: 'ヒルトンプラザ ウエスト', en: 'Hilton Plaza West' },
  },
  {
    id: 'poi-hilton-east',
    osm: 'W162158151',
    name: { ja: 'ヒルトンプラザ イースト', en: 'Hilton Plaza East' },
  },
  { id: 'poi-breeze', osm: 'W162158413', name: { ja: 'ブリーゼタワー', en: 'Breeze Tower' } },
  { id: 'poi-kitte', osm: 'N12095159227', name: { ja: 'KITTE大阪', en: 'KITTE OSAKA' } },
  { id: 'poi-jp-tower', osm: 'W1146510724', name: { ja: 'JPタワー大阪', en: 'JP Tower Osaka' } },
  {
    id: 'poi-central-post',
    osm: 'N5197886446',
    name: { ja: '大阪中央郵便局', en: 'Osaka Central Post Office' },
  },
  { id: 'poi-dojima-avanza', osm: 'W178958655', name: { ja: '堂島アバンザ', en: 'Dojima Avanza' } },
  { id: 'poi-kitashinchi', osm: 'N7944201016', name: { ja: '北新地', en: 'Kitashinchi' } },
  {
    id: 'poi-umeda-center',
    osm: 'W958343155',
    name: { ja: '梅田センタービル', en: 'Umeda Center Building' },
  },
  {
    id: 'poi-hankyu-sta',
    osm: 'W139168082',
    name: { ja: '阪急 大阪梅田駅', en: 'Hankyu Osaka-Umeda Station' },
  },
  {
    id: 'poi-sanbangai-bus',
    osm: 'N3059628059',
    name: { ja: '阪急三番街バスターミナル', en: 'Hankyu Sanbangai Bus Terminal' },
  },
  {
    id: 'poi-jr-bus',
    osm: 'N4198473387',
    name: { ja: '大阪駅JR高速バスターミナル', en: 'Osaka Sta. JR Expressway Bus Terminal' },
  },
  {
    id: 'poi-grand-green',
    osm: 'W1491742303',
    name: { ja: 'グラングリーン大阪', en: 'Grand Green Osaka' },
  },
];
