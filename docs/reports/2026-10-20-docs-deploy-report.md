# 作業報告書: 公開手順と README（D・E）

## 作業日時

2026年10月20日 02時44分07秒

## 作業目的

`docs/COMPLETION.md` の D（公開）と E（README）。

## 変更内容

- `docs/DEPLOY.md`（新規）: デプロイ先、ワークフローの仕組み、オーナーの手作業（Pages の Source 設定・マージ後の確認・独自ドメインと DNS・報告フォームの管理）、ロールバック、ローカルでの本番ビルド確認
- 独自ドメイン対応: `vite.config.ts` の `base` を環境変数 `BASE_PATH` で上書きできるようにし、`deploy.yml` はリポジトリ変数 `BASE_PATH`（未設定なら従来どおり `/umeda_underground_map/`）を渡す
- README を全面更新: 概要・自前のスクリーンショット・使い方・誤りの報告・設計方針・アーキテクチャ・開発コマンド・公開・ライセンス・データの出典
- スクリーンショット（`docs/images/`）はこのアプリをローカルで表示して撮ったもの

## 実行した確認コマンド

- typecheck / lint / format:check / test（132件）/ build → 成功
- `BASE_PATH=/ npx vite build` でアセットが `/assets/...` になることを確認

## 未解決の課題

- マージ後のデプロイ確認はオーナーが行う（DEPLOY.md「マージ後の確認」）
- コードのライセンスは未設定（COMPLETION §5-3）
