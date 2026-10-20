# 公開（デプロイ）手順

## デプロイ先

- **GitHub Pages**: https://naki0227.github.io/umeda_underground_map/
- 静的サイト（Vite のビルド成果物 `dist/`）。サーバー・データベース・API キーは使わない

## 仕組み

| ワークフロー                   | いつ動くか                                                                  | 内容                                                     |
| ------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------- |
| `.github/workflows/ci.yml`     | PR・main への push                                                          | typecheck / format check / lint / test / build           |
| `.github/workflows/deploy.yml` | main への push、手動実行（Actions → Deploy to GitHub Pages → Run workflow） | `npm ci` → `npm run build` → Pages へアップロード → 公開 |

PR をマージすると main に push され、数分で公開 URL が更新される。PWA（Service Worker）は `autoUpdate` なので、利用者の端末は次回アクセス時に新しい版へ切り替わる。

## オーナーの手作業

### 1. GitHub Pages の設定（初回のみ。設定済み）

1. リポジトリの **Settings → Pages** を開く
2. **Build and deployment → Source** を **GitHub Actions** にする
3. 保存後、Actions の「Deploy to GitHub Pages」が成功すれば公開 URL が使える

### 2. マージ後の確認（毎回）

1. PR をマージする
2. **Actions** で「Deploy to GitHub Pages」が緑になるのを待つ
3. 公開 URL を開き、次を確かめる
   - 地図が表示される、検索 → 「ここへ行く」→ 道案内が出る
   - メニューの「店舗・出口情報は ◯◯ 時点」が新しい日付になっている
   - スマホで開き、ホーム画面に追加（PWA インストール）できる
4. 古い表示のままなら、ページを再読み込みする（Service Worker の更新は次回アクセス時）

### 3. 独自ドメインを使う場合（任意）

1. ドメインを取得する（レジストラは任意）
2. DNS を設定する
   - サブドメイン（例: `navi.example.com`）: `CNAME` レコードを `naki0227.github.io` に向ける
   - Apex ドメイン（例: `example.com`）: GitHub のドキュメントにある Pages 用の `A` / `AAAA` レコードを登録する
3. **Settings → Pages → Custom domain** にドメインを入力して保存し、**Enforce HTTPS** を有効にする
4. **Settings → Secrets and variables → Actions → Variables** でリポジトリ変数 `BASE_PATH` を作り、値を `/` にする（ドメイン直下で配信するため）
5. Actions の「Deploy to GitHub Pages」を手動実行し、新しいドメインで表示を確かめる

独自ドメインをやめるときは、Custom domain を空にし、変数 `BASE_PATH` を削除してから再デプロイする。

### 4. 誤り報告フォームの管理

- 報告用の Google フォーム（日本語版・英語版）のURLは `src/app/config.ts` の `REPORT_FORM_URLS`
- フォームの回答は Google フォームの「回答」タブ（または連携したスプレッドシート）で確認する
- 出口・通路の誤りは OpenStreetMap を直してから `scripts/osm/README.md` の手順で再生成するのが望ましい。店名の誤りは `src/data/officialShops.ts`、改札・広場は `scripts/osm/overlay.mjs`

## ロールバック

- **問題のある変更を戻す**: その PR を GitHub の「Revert」で戻す PR を作ってマージする。main への push でデプロイが走り、前の状態に戻る
- **急いで前の版に戻す**: Actions の「Deploy to GitHub Pages」で過去の成功した実行を開き「Re-run all jobs」を押す（その時点のコミットで再ビルド・再公開される）

## ローカルで本番ビルドを確認する

```bash
npm ci
npm run build
npx vite preview   # http://localhost:4173/umeda_underground_map/
```

独自ドメイン用のビルドは `BASE_PATH=/ npm run build`。
