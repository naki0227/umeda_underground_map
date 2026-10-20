# 作業報告書: データセーバー設定で常に動くアニメーションを止める

## 作業日時

2026年10月20日 12時38分14秒

## 作業目的

LP の品質基準（lp-anatomy の §6-1「`navigator.connection.saveData` が true ならアンビエントアニメを止める」）を当てはめる。このアプリで常に動いているのは、選んだ場所の目印（輪）の点滅だけなので、それを止める。

## 変更内容

- `src/app/saveData.ts`（新規）: データセーバーがオンなら `<html data-save-data="true">` を付ける。対応していないブラウザでは何もしない
- `src/main.tsx`: 起動時に呼ぶ
- `src/index.css`: `:root[data-save-data] .selection-ring ellipse { animation: none; }`（reduced-motion と同じ止め方）

## 確かめたこと

- Playwright で `navigator.connection.saveData` を差し替えて場所を選び、目印の `animation-name` を確認
  - オフ: `selection-pulse`（点滅する）
  - オン: `none`（止まる）。`data-save-data="true"` が付く

## 追加・更新したテスト

`src/app/__tests__/saveData.test.ts`: オンで属性が付く、オフ・未対応で付かない

## 実行した確認コマンド

typecheck / lint / format:check / test（146件）/ build → 成功
