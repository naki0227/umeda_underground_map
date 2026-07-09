# 作業報告書

## 作業日時

2026年07月09日 20時15分35秒

## 作業対象

UI全体をマップ主体（Googleマップ風）に再構成。

## 作業目的

「フォームの中に小さい地図」ではなく、全画面マップを中心に検索・ピンタップ・ボトムシートで操作できるUXにする。

## 変更内容

1. **InteractiveMap**（`src/features/map/`）: 全画面SVGマップ。ドラッグパン・ホイール/ピンチズーム・ズームボタン。出口/改札/広場ピン（タップ可）、店舗ピン（オレンジ、ノード周りに円周配置）、経路ハイライト、現在地/目的地マーカー
2. **useMapViewport**: viewBox管理のhook（パン/ズーム/ピンチ、ドラッグ後のクリック誤爆防止）
3. **SearchBar**（`src/features/search/`）: 地上スポット・地下の店・出口/駅の横断検索
4. **PlaceSheet / useMapNavigation**: 場所選択→「ここへ行く」「いまここにいる」。現在地未設定で行き先を選ぶと位置確定シートに誘導し、確定後に自動で経路シートへ
5. LocateScreen / RouteScreenをシート内コンテンツ化（旧DestinationScreen・MapView・useNavigationStateは削除）
6. 初期表示はウェルカムシート（現在地を設定ボタン・報告リンク・dataVersion）

## 変更したファイル

- 追加: `src/features/map/{InteractiveMap,PlaceSheet}.tsx` `src/features/map/useMapViewport.ts` `src/features/search/SearchBar.tsx` `src/features/navigation/useMapNavigation.ts` + テスト
- 変更: `src/App.tsx` `src/index.css` `src/i18n/locales/{ja,en}.ts` `src/features/locate/LocateScreen.tsx` `src/features/route/RouteScreen.tsx` `src/App.test.tsx`
- 削除: `src/components/MapView.tsx` `src/features/destination/DestinationScreen.tsx` `src/features/navigation/useNavigationState.ts` + 各テスト

## 設計上の意図

- domain層（経路探索・位置推定・案内文生成）は無変更。UI再構成が探索ロジックに波及しない分離を維持
- 「場所」を `Place {nodeId, name, aboveGround}` に統一し、POI/店/出口を同じ操作（ここへ行く・ここにいる）で扱う
- 位置は引き続き静的（追跡なし）。「迷った」で位置確定シートへ戻る動線は維持

## 追加・更新したテスト

50件全通過。useMapNavigation 7件、InteractiveMap 3件、Appフロー3件（検索→場所→位置確定→経路、ピンタップ→現在地設定、報告リンク）

## 実行した確認コマンド

`npm test` / `typecheck` / `lint` / `format:check` / `build` 全通過。ブラウザ確認: 検索「阪急百貨店」→ここへ行く→ドーチカで位置確定→経路1110m表示（地上ヒント付き）、モバイル表示、コンソールエラーなし

## 未解決の課題

- シートがモバイルで画面の6割を占める（ドラッグで縮められるシートは未実装）
- ズーム時のラベル文字サイズが固定（拡大するとラベルも拡大される）

## 次にやること

1. GitHub Pagesデプロイ
2. ラベルのズーム非依存化・シートの高さ調整
3. データ現地検証

## 次回最初に見るべきファイル

- `src/App.tsx`（画面構成の入口）
- `src/features/map/InteractiveMap.tsx`
