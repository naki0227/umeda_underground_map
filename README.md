# 梅田地下ナビ / Umeda Underground Navi

梅田の地下街専用の道案内PWA。地下ではGPSが使えない前提で、**入口・周辺店舗のヒントから初回のみ現在地を確定**し、以降は静的な経路案内を表示する。迷ったら「迷った」ボタンで再測位する。

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

## データについての注意

`src/data/` のマップ・店舗データは **2026-07-08時点の下書きスナップショット**であり、現地未検証。出口番号・店舗の位置・通路の距離は実地確認またはユーザー報告で更新すること。詳細は [docs/TODO.md](docs/TODO.md) を参照。
