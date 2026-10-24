# 共有カード（OGP・X）

- 日時: 2026-10-24
- ブランチ: claude/ogp

## なぜ

X に URL を貼って投稿したとき、画像つきの大きなカードで出るようにする（いままでは OGP が無く、タイトルだけの小さなカード）。

## やったこと

- `public/ogp.jpg`（1200×630、94KB）。アプリと同じ紙色・焦げ茶の文字で、題「梅田地下ナビ」、できること3つ、道案内の地図と一人称の画面。HTML を Playwright で撮って作った（`src/assets/fonts/round-600.woff2` の丸い字を使用）。
- `index.html`: description、og:type / site_name / title / description / url / image（幅・高さ・代わりの文）/ locale、twitter:card（summary_large_image）/ title / description / image。
- 画像の URL は絶対 URL が必要なので、`index.html` には `%SITE_URL%` と書き、`vite.config.ts` で `SITE_ORIGIN`（既定 https://naki0227.github.io）＋ `BASE_PATH` に置き換える。デプロイの設定と docs/DEPLOY.md（独自ドメインのとき `SITE_ORIGIN` を設定）も更新。

## テスト

- `ogp.test.ts`（タグがそろっている・画像は絶対 URL・1200×630・300KB 未満）
- ビルド結果の `dist/index.html` で og:image が `https://naki0227.github.io/umeda_underground_map/ogp.jpg` になるのを確認
- test 228件・typecheck・lint・format・build 通過
