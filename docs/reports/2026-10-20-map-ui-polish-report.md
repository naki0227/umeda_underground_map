# 作業報告書: マップ UI の磨き込み（B-1）

## 作業日時

2026年10月20日 02時02分43秒

## 作業対象

`src/features/map/`（InteractiveMap / MapGroundLayer / MapMarkers / useMapViewport / ground / labelLayout / mapLabels）、`src/components/BottomSheet.tsx`、各シート

## 作業目的

`docs/COMPLETION.md` B-1: ズーム非依存のラベルサイズ、ドラッグで高さを変えられるボトムシート、駅中心部の建物ラベル重なり解消。

## 変更内容

1. **ズーム非依存のラベル**: `useMapViewport` が表示サイズを ResizeObserver で測り、`unitsPerPixel`（画面1pxあたりのマップ単位）を返す。ラベル・出口バッジ・ピン・設備チップ・現在地/目的地マーカーは `translate(...) scale(unitsPerPixel)` の中に画面 px で描く。CSS の文字サイズも画面 px に変更
2. **ラベルの重なり解消**: `labelLayout.placeLabels` が優先度順に貪欲に配置し、重なるラベルを隠す（出口番号 > 建物名 > 広場名 > 改札名 > 設備チップ > エリア名）。隠れた出口は点で表示し、タップ・キーボード操作は維持。判定は画面 px なのでズーム倍率が変わったときだけ再計算
3. **建物の重なり解消**: 最寄りノードが近い建物（駅中心部）を1列にまとめて並べ、ラベルを2段に互い違いにした
4. **初期表示**: 縦長画面で全体を収めて小さくなっていたため、画面の縦を埋める倍率（全体幅の55〜100%）で表示。⌂ も同じ
5. **ボトムシート**: 全シートを `BottomSheet` に統一。ハンドルのドラッグで高さを変え、30% / 55% / 85% に吸着。ハンドルはボタンで、タップ・Enter・Space で段階を切り替え。場所シートは低め、位置確定は高めで開く

## 追加・更新したテスト

- `labelLayout.test.ts`: 文字幅、重なり時の優先度、同順位、接するだけの場合
- `mapLabels.test.ts`: 実データで k=0.5〜6 のどの倍率でも表示ラベルが重ならない、拡大時は全出口番号と全建物名が出る、建物ボックス同士が重ならない
- `BottomSheet.test.tsx`: 段階の計算、ハンドルのタップ/Enter、ドラッグで吸着、ドラッグ後の click を無視

## 実行した確認コマンド

- typecheck / lint / format:check / test（89件）/ build → すべて成功
- `vite preview` + Playwright（375x812）: 初期表示・拡大のスクリーンショット確認、シートを下へドラッグして peek に吸着、コンソールエラー 0

## 未解決の課題

- ラベルと建物ボックス本体（ラベル以外の図形）の重なりは判定していない。建物は立体表現のため一部ピンを覆うことがある
- 実機でのピンチ・ドラッグ確認はオーナー作業（COMPLETION §4）

## 次にやること

B-2 起動直後の GPS による大まかな現在地表示

## 次回最初に見るべきファイル

`docs/COMPLETION.md`、`src/features/locate/useGeolocation.ts`、`src/domain/locate.ts`
