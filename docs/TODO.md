# TODO

## 未着手

- [ ] マップUIの磨き込み（ズーム非依存のラベルサイズ、ドラッグで高さを変えられるボトムシート、駅中心部の建物ラベル重なり解消）
- [ ] 地上POIの拡充と最寄り出口対応の検証（現在16件。src/data/pois.ts）
- [ ] マップデータの現地検証（特に出口番号: ホワイティはH-xx体系と確認済みだが、個別の番号と場所の対応は未検証。ディアモールD-xx・ドーチカC-xxは推定のまま）
- [ ] ノード座標・通路距離の精緻化（現状は概算メートル）
- [ ] 店舗密度の向上（公式サイト掲載は Whity 175店・ドーチカ 60店・ディアモール 89店。現在はランドマークになりやすい代表店のみ収録）
- [x] 簡易マップ表示（SVG俯瞰図、経路ハイライト・現在地/目的地マーカー付き）
- [ ] 中国語・韓国語の追加（i18n構造は対応済み）
- [ ] 報告フォームの回答を定期確認してデータへ反映する運用の開始
- [ ] 実機スマホでの動作確認（タップ・パン・ピンチ、PWAインストール）

## 完了

- [x] Vite + React + TS スキャフォールドとツール整備（prettier / oxlint / vitest）
- [x] CI（GitHub Actions: typecheck / format / lint / test / build）
- [x] domain層: グラフ・Dijkstra（階段回避）・位置推定・案内文生成 + テスト
- [x] 梅田地下全域の骨格マップデータ + 整合性テスト
- [x] i18n（ja/en）
- [x] UI一式（位置確定・目的地選択・経路案内・迷ったボタン・報告リンク）+ フローテスト
- [x] PWA化（vite-plugin-pwa）
- [x] GitHubリモート設定・push（https://github.com/naki0227/umeda_underground_map）
- [x] 報告用Googleフォーム作成（日本語版・英語版、2026-07-09）とURL反映
- [x] 店舗データを公式サイト情報で更新（2026-07-09時点、約60店舗）
- [x] マップ主体UI（Googleマップ風）+ アイソメトリック立体表示
- [x] GitHub Pagesデプロイ（https://naki0227.github.io/umeda_underground_map/）

## 技術的負債・注意

- 出口番号は一部推定（H-1/H-8/H-16/H-28の場所対応、D-xx/C-xx全般）。報告フォームと現地確認で修正する
- `locate()` のスコアリング定数（範囲・重み）は暫定値
- 紀伊國屋書店梅田本店は地上1F（地下ではない）が、ランドマークとして収録している

## データソース（2026-07-09参照）

- ホワイティうめだ: https://whity.osaka-chikagai.jp/ （フロアガイド・ショップガイド）
- ディアモール大阪: https://www.diamor.jp/ （フロアマップ）
- 阪急三番街: https://www.h-sanbangai.com/ （南館B2F・北館B2Fフロアガイド）
- ekimo梅田: https://www.ekimo.jp/umeda/shop/
- ドージマ地下センター: https://dotica.osaka-chikagai.jp/shopguide

## 次回最初に着手するタスク

デプロイ（GitHub Pages）。その後、報告フォームの回答確認の運用開始
