# 作業報告書

## 作業日時

2026年07月09日 21時02分59秒

## 作業対象

GitHub Pagesへの本番デプロイ。

## 作業目的

アプリを公開URLで配信し、実機スマホで触れる状態にする。

## 変更内容

1. `vite.config.ts` に `base: '/umeda_underground_map/'` を追加（Pages配信のサブパス対応）
2. `.github/workflows/deploy.yml` を追加（build → upload-pages-artifact → deploy-pages。main push と手動実行で起動）
3. GitHub Pages を workflow ビルドタイプで有効化（`gh api ... pages -X POST -f build_type=workflow`）

## 変更したファイル

- `vite.config.ts`
- `.github/workflows/deploy.yml`（新規）
- `README.md`（公開URL追記）
- `docs/TODO.md`（デプロイ完了・実機確認タスク追加）

## 設計上の意図

- CI（ci.yml: 検証）とデプロイ（deploy.yml: 公開）をワークフロー分離。デプロイは検証と独立して回る
- Pagesのサブパス配信のため `base` を設定。これによりビルド成果物のアセットURLが `/umeda_underground_map/assets/...` になる
- PWA（vite-plugin-pwa）はbase配下のスコープでSW登録される

## 影響範囲

配信のみ。アプリのロジック・UIに変更なし。ローカルの `npm run dev` は base の影響を受けるが動作に支障なし。

## 追加・更新したテスト

なし（設定・CIの変更のため）。既存51テストは変更なしで通過。

## 実行した確認コマンド

- `npm run build` → 成功、アセットが `/umeda_underground_map/` プレフィックス付きで生成
- `npm test` → 51 passed
- deploy.yml run → `completed success`
- 公開URL検証（curl）:
  - `https://naki0227.github.io/umeda_underground_map/` → HTTP 200
  - `<title>梅田地下ナビ | Umeda Underground Navi</title>` を確認
  - JSアセット `/umeda_underground_map/assets/index-*.js` → HTTP 200

## CIで確認される内容

- ci.yml: typecheck / format / lint / test / build
- deploy.yml: build → Pages デプロイ

## 未解決の課題

- 実機スマホでの動作確認は未実施（ブラウザMCPがgithub.ioドメイン非許可のためcurl検証で代替）
- 駅中心部の建物ラベル重なり、ズーム非依存ラベル、ドラッグ可能シートは未対応

## 次にやること

1. 実機スマホで公開URLを開き、タップ/パン/ピンチ・PWAインストールを確認
2. マップUIの磨き込み（ラベル重なり・シート高さ）
3. データ現地検証、報告フォーム回答の反映運用

## 次回最初に見るべきファイル

- `docs/TODO.md`
- `.github/workflows/deploy.yml`
- `vite.config.ts`

## 引き継ぎ事項

- 公開URL: https://naki0227.github.io/umeda_underground_map/
- mainへpushすると deploy.yml が自動で再デプロイする
- `base` を変える場合はリポジトリ名と揃える必要がある（独自ドメインやユーザーページに移す場合は要調整）
