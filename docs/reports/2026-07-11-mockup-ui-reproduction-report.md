# 作業報告書: モックアップUI再現（2026-07-11）

## 概要

ユーザー提供の5枚のUIモックアップの意図を汲み取り、アプリシェル・位置確定・経路案内のUIを刷新した。フロア概念（B2/B1/1F）をデータモデルに導入し、フロア移動を含むターンバイターン案内に対応した。

## 変更内容

### 1. フロア概念の導入（domain層）

- `FloorId = 'B2' | 'B1' | '1F'` と `nodeFloor()` を追加（`src/domain/types.ts`）。未指定は地下ノード=B1、出口=1F。
- `buildSteps` がフロアの変わるエッジで `action: 'floor-change'` ステップを生成（`src/domain/directions.ts`）。接近歩行を統合し、終点がフロア移動の場合は到着ステップを兼ねる（「◯m先のエスカレーターで1Fへ上がります」相当）。設備は エスカレーター > エレベーター > スロープ > 階段 の優先で表示。

### 2. マップ表示強化（モックアップ5）

- エリアごとの地下街ゾーンポリゴン（padded convex hull、`src/features/map/zones.ts`）+ エリア名ラベル
- 出口番号バッジ（H-8等の角丸チップ）、通路中間の設備チップ（エスカ/EV/階段）
- 地上建物をベージュ系の3面ボックスで描画（`ground.ts` / `MapGroundLayer.tsx`）
- 凡例（地下街/地上）

### 3. アプリシェル刷新（モックアップ5）

- 上部に「現在地 + 目的地」のデュアル入力カード、未設定時はセットアップバナー
- 下部タブバー（地図 / スポット / メニュー）。スポットは地上POIカード（徒歩時間付き）、メニューは言語切替・報告リンク・データ版数

### 4. 位置確定UI刷新（モックアップ1）

- よく使う目印のクイック選択チップ（ランドマーク優先で8件）
- 推定結果は「推定位置」カード（推定地点・フロアバッジ・確度%・「この位置で案内開始」ボタン・位置固定の注記）

### 5. 経路案内UI刷新（モックアップ2・4）

- 次の動作ヒーローカード（方向アイコン・距離・動作文・フロア移動時は 現在:B1 → 次:1F バッジ）
- 「到着まで 約◯分・◯m」表示（徒歩70m/分、`src/app/config.ts`）
- ステップ一覧に方向アイコンと B1→1F のフロア移動バッジ、先頭ステップをハイライト
- 「階段を避ける」トグル（Dijkstra階段ペナルティ×5と連動）、「迷った」+「終了」ボタン

## テスト

- 57テスト全件パス（vitest）。typecheck / lint / format も通過。
- 追加テスト: フロア移動ステップ生成（`directions.test.ts`）、ゾーンhull（`zones.test.ts`）、出口バッジ・凡例（`InteractiveMap.test.tsx`）、タブバー・推定カード経由のフルフロー（`App.test.tsx`）。
- ブラウザ実機確認（モバイル375x812）: 検索→ここへ行く→クイックチップ→推定→案内開始→ヒーローカード・ETA・B1→1Fバッジ・階段回避トグルまで動作をスクリーンショットで確認済み。

## モックアップのうち未対応（TODOへ追加）

元プロンプト（三人称視点・色付きボックスの軽量3D・静的案内・フロア案内重視）の確認により、モックアップ3は「一人称3D」ではなく現状のアイソメトリックビューが意図に合致すると判明。残る未対応は:

- 起動直後のマップにGPSで大まかな現在地を表示（初回とボタン押下時のみ）
- 地上ルートが最適な場合の提案とGoogle Mapsへの誘導
- 案内中ビューの磨き込み（三人称追従表示・注目店名の視認性向上）
- 音声案内
- B2フロアの実データ割当（阪急三番街など。現状は全地下ノードB1既定）
- タブバーの「お気に入り」

## コミット

- feat(domain): floor concept and floor-change steps
- feat(map): area zones, exit badges, facility chips, legend, ground buildings
- refactor(map): move building layout helpers out of component file
- feat(app): map-first shell with dual location fields, tab bar, spots and menu sheets
- feat(locate): quick landmark chips and estimated-position card with floor badge
- feat(route): next-maneuver hero card, ETA, floor badges and avoid-stairs toggle

## 次にやること

- push（GitHub Pagesへ自動デプロイ）
- 実機スマホでの動作確認、報告フォーム回答の定期確認運用
