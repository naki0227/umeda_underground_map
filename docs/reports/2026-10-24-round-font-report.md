# 数字・英字に丸い字（Umeda Round）

- 日時: 2026-10-24
- ブランチ: claude/round-font（claude/warm-cards の上）

## なぜ

#33 で数字・ラベルを丸ゴシック（Hiragino Maru Gothic）にしたが、これは iPhone・Mac にしかなく、Android・Windows ではふつうの字に戻っていた。解剖ノート（びっくりドンキー）は英数字に丸い英字（Fredoka One）を使っている。

## やったこと

- Fredoka（SIL OFL 1.1）から、英数字（U+0020〜007E）だけ・太さ600だけ・**数字の幅をそろえた**（0〜9 を同じ幅にして中央に寄せた）woff2 を作った。7.7KB。元の Fredoka は数字の幅がばらばら（「1」が細い）で、tabular-nums の機能も無いため、距離が変わるたびに字がずれるのを防ぐ。
- `@font-face`（`unicode-range: U+0020-007E`・`font-display: swap`）で読み、`--font-round` の先頭に置いた。日本語の字は端末の字のまま（日本語の Web フォントは数MBになるので読まない。lp-anatomy「使う言語のフォントだけ読む」）。
- 使う所: 次の動きの距離・手順の距離・到着までの時間と距離・ステップ番号・階の札・一人称の画面の距離・おすすめスポットの徒歩・地図の出口番号。
- PWA でオフラインでも使えるよう、woff2 も先に保存する（`workbox.globPatterns`）。
- ライセンス文は `src/assets/fonts/OFL-Fredoka.txt`。

## テスト

- `roundFont.test.ts`（英数字だけ・swap・12KB 未満・`--font-round` の先頭・ライセンスあり）
- test 210件・typecheck・lint・format・build 通過。ブラウザで `document.fonts` が読み込み済みになり、数字が丸い字になるのをスクリーンショットで確認
