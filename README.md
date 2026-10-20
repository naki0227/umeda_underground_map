# 梅田地下ナビ / Umeda Underground Navi

**公開URL: https://naki0227.github.io/umeda_underground_map/**

梅田の地下街専用の道案内PWA。地下ではGPSが使えない前提で、**入口・周辺店舗のヒントから初回のみ現在地を確定**し、以降は静的な経路案内を表示する。迷ったら「迷った」ボタンで再測位する。UIはアイソメトリック（立体俯瞰）のマップを主体に、地上の建物と地下通路の上下関係を可視化している。

## 設計方針

- **オフラインファースト**: マップはグラフ構造の静的データとしてバンドル。経路探索（Dijkstra）・位置推定はすべてクライアント側で完結し、地下の電波状況に依存しない。PWA（Service Worker）でキャッシュ。
- **位置は常時追跡しない**: GPSは初回確定時と「迷った」時の単発取得のみ。主材料は「近くに見える店舗」の選択。
- **i18n**: 日本語 / 英語。マップデータ自体が多言語名を持つ。
- **店舗情報はスナップショット**: `dataVersion` で作成時点を明示し、誤りはアプリ内のGoogleフォームリンクから報告してもらう。

## アーキテクチャ

```
src/
  domain/     グラフ・経路探索・位置推定・案内文生成（純粋TS、UI非依存、テスト必須）
  data/       梅田地下のマップデータ（エリア別ファイル + 結合・整合性テスト）
  i18n/       言語資源とヘルパー
  features/   画面単位のUI（locate / destination / route / navigation state）
  components/ 汎用UI（言語切替・報告リンク）
  app/        設定値（報告フォームURLなど）
```

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm test           # ユニットテスト
npm run typecheck  # 型チェック
npm run lint       # oxlint
npm run format     # prettier
npm run build      # 本番ビルド（PWA生成込み）
```

CI（GitHub Actions）で typecheck / format / lint / test / build を検証する。

## データの出典とライセンス

| データ                                                 | 出典                                                                                                                                        | ライセンス                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 通路・出口（番号・位置）・地下の店・地上スポットの位置 | © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)（2026-10-20 抽出）                                                  | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) |
| 店名の一部（公式サイト掲載の店）                       | 各地下街の公式サイト（ホワイティうめだ・ディアモール大阪・阪急三番街・ekimo梅田・ドージマ地下センター）の掲載情報（店名などの事実情報のみ） | —                                                          |
| 改札・広場・区画の名前と一部の位置                     | 手作業（`scripts/osm/overlay.mjs` に根拠を記載）                                                                                            | —                                                          |

- `src/data/generated/` は OSM の派生データベースなので ODbL で提供する。アプリのメニューにも帰属表示を出している
- 他サイトの画像・地図タイル・ロゴは使っていない（地図はアプリ内で SVG 描画）
- 再生成の手順: [scripts/osm/README.md](scripts/osm/README.md)

## データについての注意

マップは OSM の記載に基づくもので、現地での検証はしていない。出口番号や位置の誤りはアプリ内の報告フォーム、または OSM の修正 → 再生成で直す。詳細は [docs/TODO.md](docs/TODO.md) を参照。
