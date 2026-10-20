# 作業報告書: 案内中の数字の桁幅をそろえる

## 作業日時

2026年10月20日 12時39分39秒

## 作業目的

LP の品質基準（lp-anatomy の §7-4、Stripe の「生きた数字は `tabular-nums`」）を当てはめる。道案内では「次へ」を押すたびに距離・ステップ番号・残り距離が切り替わるので、数字の幅がそろっていないと文字が左右にずれる。

## 変更内容

- `src/index.css`: `.step-counter`（1 / 4）、`.next-distance`（約53m進む）、`.step-distance`（一覧の距離）、`.total.eta`（到着まで）に `font-variant-numeric: tabular-nums` を指定

## 確かめたこと

- Playwright で道案内を開き、次の動作カードの文字で数字の幅を測った（この環境で使われたフォント）
  - 変更前: 「111」15.63px、「888」23.77px（数字によって幅が違う）
  - 変更後: どちらも 24.91px（そろう）

## 実行した確認コマンド

typecheck / lint / format:check / test（144件）/ build → 成功
