# 公開（デプロイ）手順

## デプロイ先

- **GitHub Pages（独自ドメイン）**: https://umeda.enludus.com/ （旧 https://naki0227.github.io/umeda_underground_map/ は GitHub が自動で転送）
- DNS: Cloudflare で `umeda` の CNAME を `naki0227.github.io` へ（Proxy は DNS only）。Settings → Pages の Custom domain は `umeda.enludus.com`、Enforce HTTPS をオン
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

### 3. 独自ドメイン（いまは https://umeda.enludus.com/）

いまの設定（2026-10-25）:

1. Cloudflare の DNS で `umeda` の `CNAME` を `naki0227.github.io` に向ける（Proxy status は **DNS only**。オレンジの Proxied にすると GitHub が HTTPS の証明書を作れない）
2. **Settings → Pages → Custom domain** に `umeda.enludus.com`、証明書ができたら **Enforce HTTPS** をオン
3. ビルドの既定は `BASE_PATH=/`・`SITE_ORIGIN=https://umeda.enludus.com`（`vite.config.ts` と `.github/workflows/deploy.yml`）。リポジトリ変数 `BASE_PATH`・`SITE_ORIGIN` があればそちらが優先される
4. 旧 URL（https://naki0227.github.io/umeda_underground_map/）は GitHub が新しいドメインへ自動で転送する

ドメインを変えるときは、DNS と Custom domain を変え、リポジトリ変数 `SITE_ORIGIN` を `https://<新しいドメイン>` にして再デプロイする。
独自ドメインをやめて github.io の下に戻すときは、Custom domain を空にし、リポジトリ変数を `BASE_PATH=/umeda_underground_map/`・`SITE_ORIGIN=https://naki0227.github.io` にして再デプロイする。

切り替え直後は GitHub の CDN が古いページを最大10分ほど返すことがある（古いページは古い場所の JS を読みに行くので白い画面になる）。少し待ってから確かめる。

### 4. 誤り報告フォームの管理

- 報告用の Google フォーム（日本語版・英語版）のURLは `src/app/config.ts` の `REPORT_FORM_URLS`
- フォームの回答は Google フォームの「回答」タブ（または連携したスプレッドシート）で確認する
- 出口・通路の誤りは OpenStreetMap を直してから `scripts/osm/README.md` の手順で再生成するのが望ましい。店名の誤りは `src/data/officialShops.ts`、改札・広場は `scripts/osm/overlay.mjs`

### 5. 通路の開放時間を入れる（分かったら）

夜間に閉まる通路は、各地下街の公式サイトに開放時間が載っていない（2026-10-20 確認）ため、まだ入っていない。今入っているのは、ホワイティうめだのエスカレーター（6:00〜23:30）とエレベーター（5:00〜23:00）だけ（公式 FAQ より）。

1. 各地下街の防災センター・管理事務所に、通路（通り抜け）の開放時間を問い合わせる
2. `src/app/config.ts` の `TIMED_PASSAGES` に、地下街ごとに 1 行足す。例: `{ area: 'diamor', hours: { open: '06:00', close: '24:00' }, source: '問い合わせ先と確認日' }`（`attr` を省くと、その地下街のすべての通路が対象）
3. PR を作ってマージする。その時間外は、その通路を通らない経路になる（通らないと着けないときは、注意を出して経路を出す）

日本時間の 23:00〜6:00 は、時間が分かっていない通路もあるため、道案内に「閉まっている通路があるかもしれない」という注意を出す（`LATE_NIGHT`）。

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
