# 作業報告書

## 作業日時

2026年07月09日 13時48分15秒

## 作業対象

報告用Googleフォーム作成、GitHubリモート設定、マップデータの公式情報反映。

## 作業目的

1. 「この店違う」報告動線を実フォームにする（日英）
2. リポジトリをGitHub（naki0227/umeda_underground_map）へpushしCIを稼働させる
3. 店舗データを各施設の公式サイトの最新掲載内容へ更新する

## 変更内容

1. Chrome連携でGoogleフォームを2つ作成・公開
   - 日本語版「梅田地下ナビ 間違い報告」／英語版「Umeda Underground Navi - Report an Error」
   - 質問: 間違いの種類（ラジオ+その他・必須）／どこの情報か（短文・必須）／正しい情報（段落・必須）
   - `src/app/config.ts` に実URLを反映
2. `git remote add origin` → push。CI（GitHub Actions）稼働開始
3. 店舗データ更新（`dataVersion: 2026-07-09`、約60店舗）
   - ホワイティ: 公式エリア構成（センター/ノース1・2/サウス/イースト/プチシャン/mikke/FARURU/NOMOKA）に合わせ実テナントへ全面差し替え。プチシャンノード追加。出口をH-xx体系へ修正。泉の広場を「Water Tree」表記に更新
   - ディアモール/ekimo/ドーチカ/阪急三番街: 公式ショップガイドの実テナントへ差し替え

## 変更したファイル

- `src/app/config.ts`（フォームURL）
- `src/data/areas/{whity,diamor,ekimo,dojima,sanbangai}.ts`
- `src/data/map.ts`（dataVersion・出典コメント）
- `src/App.test.tsx`（実店舗名・出口番号に追従）
- `docs/TODO.md`、本報告書

## 変更意図・設計上の意図

- 位置推定の主材料は「周辺店舗」なので、店舗データの実在性がアプリの精度に直結する。公式サイト掲載のテナントに限定して収録した
- 全店収録ではなく「ランドマークになりやすい代表店」を各ノードに配置（多すぎると選択UIが破綻するため）。密度向上はTODOに残した

## 影響範囲

マップデータと報告リンクのみ。domain層・UI構造に変更なし。

## 追加・更新したテスト

App.test.tsxのフローテストを実店舗名（スターバックス/古潭→H-28出口）に更新。43件全て通過。

## 実行した確認コマンド

- `npm test` → 43 passed / `npm run typecheck` / `npm run lint` / `prettier` → 通過
- ブラウザでフォーム2件の公開と回答リンク取得を確認

## CIで確認される内容

typecheck / format check / lint / unit test / build（push済み、GitHub Actionsで実行）

## 未解決の課題

- 出口番号の場所対応が一部推定（H-1/H-8/H-16/H-28、D-xx、C-xx）
- 座標・距離は概算のまま

## 次にやること

1. デプロイ（GitHub Pages: `vite.config.ts` に `base` 設定 + Actionsデプロイ）
2. フォーム回答の定期確認とデータ反映運用
3. 出口番号・座標の現地検証

## 次回最初に見るべきファイル

- `docs/TODO.md`
- `vite.config.ts`（デプロイ時にbase設定）

## 引き継ぎ事項

- フォームURLは `src/app/config.ts` で管理。フォーム編集はGoogleアカウント（フォーム所有者）から
- データ出典と参照日はTODO.mdの「データソース」節に記録
