# 作業報告書: タッチ端末でホバーの色を残さない・スクロールを reduced-motion に合わせる

## 作業日時

2026年10月20日 12時23分40秒

## 作業目的

LP の品質基準（lp-anatomy の §7-6-7「ホバーはマウス端末だけに閉じる」、§4「reduced-motion のときは動きを止める」）を当てはめる。このアプリはスマホで使うのが主なので、タップ後にホバーの色が残らないようにする。

## 変更内容

- `src/index.css`: `:hover` の 6 ルール（検索結果・地図のピン・主ボタン・候補ボタン・建物・出口バッジ）を、それぞれ元の位置のまま `@media (hover: hover) and (pointer: fine)` で囲んだ。末尾にまとめると、同じ詳細度の `.map-exit-badge.on-route rect` と `.building.selected .building-top` より後ろになり、経路上の出口・選んだ建物の色がホバーに負けるため、位置は動かしていない
- `src/features/locate/LocateScreen.tsx`: 推定位置カードへのスクロールを、「視差効果を減らす」設定のときはアニメーションなし（`behavior: 'auto'`）にした

## 確かめたこと

- Playwright で検索結果の行にポインタを当てたときの背景色
  - パソコン（マウス）: 変更前後とも `rgb(227, 243, 248)`（ホバーの色が出る）
  - iPhone 13 のエミュレーション（タッチ）: 変更前 `rgb(227, 243, 248)`（色が残る）→ 変更後 透明（残らない）

## 追加・更新したテスト

- `src/__tests__/hoverStyles.test.ts`: `index.css` の `:hover` がすべて `@media (hover: hover) and (pointer: fine)` の中にあること（変更前の CSS では失敗する）
- `src/features/locate/__tests__/LocateScreen.test.tsx`: 推定位置カードへ、通常は smooth、reduced-motion のときは auto でスクロールすること

## 実行した確認コマンド

typecheck / lint / format:check / test（144件）/ build → 成功
