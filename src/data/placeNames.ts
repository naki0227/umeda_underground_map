import type { LocalizedText } from '../domain/types';

/** 地名・店名を出し分ける言語（英語以外で、英語名より読みやすい書き方がある言語） */
export interface PlaceTranslations {
  zh: string;
  'zh-Hant': string;
  ko: string;
}

type Row = readonly [ja: string, zh: string, zhHant: string, ko: string];

/**
 * 主な場所の中国語（簡体・繁体）・韓国語の名前。改札・広場・地下街の区画・地上スポット・ビル。
 * 駅名・地名は現地の案内表示や各社の多言語案内でよく使われる書き方に合わせる。
 */
const PLACES: Row[] = [
  // 改札
  [
    '阪急大阪梅田駅 地下連絡口',
    '阪急大阪梅田站 地下连接口',
    '阪急大阪梅田站 地下連絡口',
    '한큐 오사카우메다역 지하 연결 출입구',
  ],
  [
    '阪神大阪梅田駅 東改札',
    '阪神大阪梅田站 东检票口',
    '阪神大阪梅田站 東剪票口',
    '한신 오사카우메다역 동쪽 개찰구',
  ],
  [
    '谷町線東梅田駅 改札',
    '谷町线东梅田站 检票口',
    '谷町線東梅田站 剪票口',
    '다니마치선 히가시우메다역 개찰구',
  ],
  ['JR大阪駅 御堂筋口', 'JR大阪站 御堂筋口', 'JR大阪站 御堂筋口', 'JR 오사카역 미도스지 출구'],
  ['JR大阪駅 桜橋口', 'JR大阪站 樱桥口', 'JR大阪站 櫻橋口', 'JR 오사카역 사쿠라바시 출구'],
  ['JR北新地駅 改札', 'JR北新地站 检票口', 'JR北新地站 剪票口', 'JR 기타신치역 개찰구'],
  [
    '御堂筋線梅田駅 北改札',
    '御堂筋线梅田站 北检票口',
    '御堂筋線梅田站 北剪票口',
    '미도스지선 우메다역 북쪽 개찰구',
  ],
  [
    '御堂筋線梅田駅 南改札',
    '御堂筋线梅田站 南检票口',
    '御堂筋線梅田站 南剪票口',
    '미도스지선 우메다역 남쪽 개찰구',
  ],
  [
    '四つ橋線西梅田駅 改札',
    '四桥线西梅田站 检票口',
    '四橋線西梅田站 剪票口',
    '요쓰바시선 니시우메다역 개찰구',
  ],
  // 広場・地下街の区画
  ['円形広場', '圆形广场', '圓形廣場', '원형 광장'],
  [
    '泉の広場（Water Tree）',
    '泉之广场（Water Tree）',
    '泉之廣場（Water Tree）',
    '이즈미 광장 (Water Tree)',
  ],
  ['ドーチカ北', '堂岛地下中心 北', '堂島地下中心 北', '도치카 북쪽'],
  ['ドーチカ中央', '堂岛地下中心 中央', '堂島地下中心 中央', '도치카 중앙'],
  ['ドーチカ南', '堂岛地下中心 南', '堂島地下中心 南', '도치카 남쪽'],
  ['ディアモール東通路', 'Diamor 东通道', 'Diamor 東通道', '디아모르 동쪽 통로'],
  ['ディアモール北通路', 'Diamor 北通道', 'Diamor 北通道', '디아모르 북쪽 통로'],
  ['ディアモール南通路', 'Diamor 南通道', 'Diamor 南通道', '디아모르 남쪽 통로'],
  ['ディアモール西通路', 'Diamor 西通道', 'Diamor 西通道', '디아모르 서쪽 통로'],
  ['ekimo梅田 南', 'ekimo梅田 南', 'ekimo梅田 南', '에키모 우메다 남쪽'],
  ['ekimo梅田 北', 'ekimo梅田 北', 'ekimo梅田 北', '에키모 우메다 북쪽'],
  ['ホワイティうめだ', 'Whity梅田', 'Whity梅田', '화이티 우메다'],
  ['駅', '车站', '車站', '역'],
  ['三番街北館', '三番街北馆', '三番街北館', '산반가이 북관'],
  ['三番街南館', '三番街南馆', '三番街南館', '산반가이 남관'],
  ['三番街西通路', '三番街西通道', '三番街西通道', '산반가이 서쪽 통로'],
  ['センターモール西', 'Center Mall 西', 'Center Mall 西', '센터몰 서쪽'],
  ['センターモール中央', 'Center Mall 中央', 'Center Mall 中央', '센터몰 중앙'],
  ['センターモール東', 'Center Mall 东', 'Center Mall 東', '센터몰 동쪽'],
  ['イーストモール', 'East Mall', 'East Mall', '이스트몰'],
  ['ノースモール西', 'North Mall 西', 'North Mall 西', '노스몰 서쪽'],
  ['ノースモール東', 'North Mall 东', 'North Mall 東', '노스몰 동쪽'],
  ['プチシャン', 'Petit Champ', 'Petit Champ', '프티샹'],
  ['サウスモール', 'South Mall', 'South Mall', '사우스몰'],
  // 地上スポット・ビル
  [
    'HEP FIVE（赤い観覧車）',
    'HEP FIVE（红色摩天轮）',
    'HEP FIVE（紅色摩天輪）',
    'HEP FIVE (빨간 관람차)',
  ],
  ['阪急うめだ本店', '阪急梅田总店', '阪急梅田本店', '한큐 우메다 본점'],
  ['阪神梅田本店', '阪神梅田总店', '阪神梅田本店', '한신 우메다 본점'],
  ['大丸梅田店', '大丸梅田店', '大丸梅田店', '다이마루 우메다점'],
  ['ルクア大阪', 'LUCUA 大阪', 'LUCUA 大阪', '루쿠아 오사카'],
  ['ルクア イーレ', 'LUCUA 1100', 'LUCUA 1100', '루쿠아 이레'],
  [
    'ヨドバシ梅田タワー（LINKS UMEDA）',
    '友都八喜梅田塔（LINKS UMEDA）',
    '友都八喜梅田塔（LINKS UMEDA）',
    '요도바시 우메다 타워 (LINKS UMEDA)',
  ],
  ['ヨドバシ梅田タワー', '友都八喜梅田塔', '友都八喜梅田塔', '요도바시 우메다 타워'],
  ['NU茶屋町プラス', 'NU茶屋町 Plus', 'NU茶屋町 Plus', 'NU 차야마치 플러스'],
  ['茶屋町', '茶屋町', '茶屋町', '차야마치'],
  ['梅田ロフト', '梅田 LOFT', '梅田 LOFT', '우메다 로프트'],
  [
    'お初天神（露天神社）',
    '阿初天神（露天神社）',
    '阿初天神（露天神社）',
    '오하쓰텐진 (쓰유노텐 신사)',
  ],
  ['曽根崎警察署', '曾根崎警察署', '曾根崎警察署', '소네자키 경찰서'],
  ['大阪駅前第1ビル', '大阪站前第1大楼', '大阪站前第1大樓', '오사카역앞 제1빌딩'],
  ['大阪駅前第2ビル', '大阪站前第2大楼', '大阪站前第2大樓', '오사카역앞 제2빌딩'],
  ['大阪駅前第3ビル', '大阪站前第3大楼', '大阪站前第3大樓', '오사카역앞 제3빌딩'],
  ['大阪駅前第4ビル', '大阪站前第4大楼', '大阪站前第4大樓', '오사카역앞 제4빌딩'],
  [
    '大阪梅田ツインタワーズ・サウス',
    '大阪梅田双子塔·南',
    '大阪梅田雙子塔·南',
    '오사카 우메다 트윈타워즈 사우스',
  ],
  [
    '大阪梅田ツインタワーズ・ノース',
    '大阪梅田双子塔·北',
    '大阪梅田雙子塔·北',
    '오사카 우메다 트윈타워즈 노스',
  ],
  ['ハービスENT', 'HERBIS ENT', 'HERBIS ENT', '허비스 ENT'],
  ['ハービスPLAZA', 'HERBIS PLAZA', 'HERBIS PLAZA', '허비스 PLAZA'],
  ['ヒルトンプラザ ウエスト', '希尔顿广场 西', '希爾頓廣場 西', '힐튼 플라자 웨스트'],
  ['ヒルトンプラザ イースト', '希尔顿广场 东', '希爾頓廣場 東', '힐튼 플라자 이스트'],
  ['ブリーゼタワー', 'Breeze Tower', 'Breeze Tower', '브리제 타워'],
  ['KITTE大阪', 'KITTE 大阪', 'KITTE 大阪', '킷테 오사카'],
  ['JPタワー大阪', 'JP Tower 大阪', 'JP Tower 大阪', 'JP 타워 오사카'],
  ['大阪中央郵便局', '大阪中央邮局', '大阪中央郵局', '오사카 중앙우체국'],
  ['堂島アバンザ', '堂岛 Avanza', '堂島 Avanza', '도지마 아반자'],
  ['北新地', '北新地', '北新地', '기타신치'],
  ['梅田センタービル', '梅田中心大楼', '梅田中心大樓', '우메다 센터빌딩'],
  ['阪急 大阪梅田駅', '阪急 大阪梅田站', '阪急 大阪梅田站', '한큐 오사카우메다역'],
  [
    '阪急三番街バスターミナル',
    '阪急三番街巴士总站',
    '阪急三番街巴士總站',
    '한큐 산반가이 버스터미널',
  ],
  [
    '大阪駅JR高速バスターミナル',
    '大阪站 JR 高速巴士总站',
    '大阪站 JR 高速巴士總站',
    '오사카역 JR 고속버스터미널',
  ],
  ['グラングリーン大阪', 'GRAND GREEN OSAKA', 'GRAND GREEN OSAKA', '그랑 그린 오사카'],
  [
    'うめきたグリーンプレイス',
    'Umekita Green Place',
    'Umekita Green Place',
    '우메키타 그린 플레이스',
  ],
  ['HEP FIVE', 'HEP FIVE', 'HEP FIVE', 'HEP FIVE'],
  ['HEP NAVIO', 'HEP NAVIO', 'HEP NAVIO', 'HEP NAVIO'],
];

/**
 * よく見るチェーン店の中国語・韓国語の名前（各社の中国語・韓国語の案内で使われる書き方）。
 * ここにない店は、中国語では漢字だけの店名なら日本語のまま、それ以外は英語名を使う。
 */
const BRANDS: Row[] = [
  ['スターバックスコーヒー', '星巴克', '星巴克', '스타벅스'],
  ['スターバックス', '星巴克', '星巴克', '스타벅스'],
  ['ファミリーマート', '全家', '全家', '패밀리마트'],
  ['ファミリマート', '全家', '全家', '패밀리마트'],
  ['セブン-イレブン', '7-Eleven', '7-Eleven', '세븐일레븐'],
  ['ローソン', '罗森', '羅森', '로손'],
  ['ユニクロ', '优衣库', 'UNIQLO', '유니클로'],
  ['ミスタードーナツ', 'Mister Donut', 'Mister Donut', '미스터 도넛'],
  ['サブウェイ', '赛百味', 'SUBWAY', '서브웨이'],
  ['ドトールコーヒーショップ', '罗多伦咖啡', '羅多倫咖啡', '도토루 커피'],
  ['星乃珈琲店', '星乃咖啡店', '星乃咖啡店', '호시노 커피'],
  ['スリーコインズ', '3COINS', '3COINS', '쓰리코인즈'],
  ['ダイソー', '大创', '大創', '다이소'],
  ['セブン銀行', 'Seven Bank', 'Seven Bank', '세븐은행'],
  ['ココカラファイン', 'Cocokara Fine', 'Cocokara Fine', '코코카라 파인'],
  ['成城石井', '成城石井', '成城石井', '세이조이시이'],
  ['無印良品', '无印良品', '無印良品', '무인양품'],
  ['マクドナルド', '麦当劳', '麥當勞', '맥도날드'],
  ['吉野家', '吉野家', '吉野家', '요시노야'],
  ['モスバーガー', '摩斯汉堡', '摩斯漢堡', '모스버거'],
  ['コメダ珈琲店', '客美多咖啡', '客美多咖啡', '코메다 커피'],
  ['マツモトキヨシ', '松本清', '松本清', '마쓰모토키요시'],
  ['タリーズコーヒー', "Tully's Coffee", "Tully's Coffee", '털리스 커피'],
  ['一蘭', '一兰拉面', '一蘭拉麵', '이치란'],
  ['くら寿司', '藏寿司', '藏壽司', '구라즈시'],
  ['サイゼリヤ', '萨莉亚', '薩莉亞', '사이제리야'],
  ['餃子の王将', '饺子的王将', '餃子的王將', '교자노오쇼'],
  ['ロッテリア', '乐天利', '樂天利', '롯데리아'],
  ['スギ薬局', '杉药局', '杉藥局', '스기 약국'],
  ['ダイコクドラッグ', '大国药妆', '大國藥妝', '다이코쿠 드럭'],
  ['ポケモンセンター', '宝可梦中心', '寶可夢中心', '포켓몬센터'],
  ['紀伊國屋書店', '纪伊国屋书店', '紀伊國屋書店', '기노쿠니야 서점'],
];

const toMap = (rows: Row[]) =>
  new Map(rows.map(([ja, zh, zhHant, ko]) => [ja, { zh, 'zh-Hant': zhHant, ko }] as const));
const PLACE_NAMES = toMap(PLACES);
const BRAND_NAMES = toMap(BRANDS);

/** かな（ひらがな・カタカナ）を含むか。含まない日本語の店名は中国語の読み手にも読める */
const hasKana = (text: string) => /[぀-ヿ]/.test(text);

/** 長い名前から先に、店名の頭がチェーン名と同じものを探す（「タリーズコーヒー ディアモール大阪店」） */
const BRAND_KEYS = [...BRAND_NAMES.keys()].sort((a, b) => b.length - a.length);
function brandOf(ja: string): PlaceTranslations | undefined {
  const key = BRAND_KEYS.find((k) => ja === k || ja.startsWith(`${k} `) || ja.startsWith(`${k}　`));
  return key === undefined ? undefined : BRAND_NAMES.get(key);
}

/** 店名・場所の名前1つ（表 → チェーン → 漢字だけの店名 → 英語名の順）。チェーンの支店名は省く */
function nameIn(ja: string, en: string): PlaceTranslations {
  const known = PLACE_NAMES.get(ja) ?? brandOf(ja);
  if (known) return known;
  const zh = hasKana(ja) ? en : ja;
  return { zh, 'zh-Hant': zh, ko: en };
}

/** 英語名の頭の言い回し（目印の名前の英語名は「In front of …」などで作ってある） */
const inner = (en: string) => en.replace(/^(In front of|Near|Exit) /, '');

type Template = {
  pattern: RegExp;
  /** 英語名もこの形のときだけ使う（店名がたまたま「…前」で終わる場合などを除く） */
  en: RegExp;
  build: (part: PlaceTranslations, ja: RegExpExecArray) => PlaceTranslations;
};

/** 生成した場所の名前の形（scripts/osm/build.mjs と overlay.mjs） */
const TEMPLATES: Template[] = [
  {
    // 「C-7出口付近」
    pattern: /^(.+?)出口付近$/,
    en: /^Near Exit /,
    build: (_, m) => ({
      zh: `${m[1]}出口附近`,
      'zh-Hant': `${m[1]}出口附近`,
      ko: `${m[1]} 출구 부근`,
    }),
  },
  {
    // 「C-7 出口」
    pattern: /^(.+?) ?出口$/,
    en: /^Exit /,
    build: (_, m) => ({ zh: `${m[1]} 出口`, 'zh-Hant': `${m[1]} 出口`, ko: `${m[1]} 출구` }),
  },
  {
    // 「つるとんたん前」
    pattern: /^(.+)前$/,
    en: /^In front of /,
    build: (p) => ({ zh: `${p.zh}前`, 'zh-Hant': `${p['zh-Hant']}前`, ko: `${p.ko} 앞` }),
  },
  {
    // 「ローソン付近」
    pattern: /^(.+)付近$/,
    en: /^Near /,
    build: (p) => ({ zh: `${p.zh}附近`, 'zh-Hant': `${p['zh-Hant']}附近`, ko: `${p.ko} 부근` }),
  },
  {
    // 「ホワイティうめだの通路」
    pattern: /^(.+)の通路$/,
    en: / passage$/,
    build: (p) => ({ zh: `${p.zh}通道`, 'zh-Hant': `${p['zh-Hant']}通道`, ko: `${p.ko} 통로` }),
  },
  {
    // 「大阪駅前第1ビル B1」「三番街北館 B2」
    pattern: /^(.+) (B\d|\dF)$/,
    en: / (B\d|\dF)$/,
    build: (p, m) => ({
      zh: `${p.zh} ${m[2]}`,
      'zh-Hant': `${p['zh-Hant']} ${m[2]}`,
      ko: `${p.ko} ${m[2]}`,
    }),
  },
];

/**
 * 地名・店名に中国語（簡体・繁体）・韓国語の名前を足す。主な場所は表から、
 * 「◯◯出口付近」「◯◯前」などは形に合わせて組み立てる。
 */
export function withPlaceTranslations(text: LocalizedText): LocalizedText {
  if (text.zh !== undefined) return text;
  const known = PLACE_NAMES.get(text.ja) ?? brandOf(text.ja);
  if (known) return { ...text, ...known };
  for (const { pattern, en, build } of TEMPLATES) {
    const m = pattern.exec(text.ja);
    if (m && en.test(text.en)) {
      const part = nameIn(
        m[1],
        inner(text.en)
          .replace(/ (B\d|\dF)$/, '')
          .replace(/ passage$/, ''),
      );
      return { ...text, ...build(part, m) };
    }
  }
  return { ...text, ...nameIn(text.ja, text.en) };
}
