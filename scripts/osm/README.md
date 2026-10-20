# OpenStreetMap からのデータ生成

`src/data/generated/osmData.ts` はこのフォルダのスクリプトで作る。手で編集しない。

## ライセンス

元データは © OpenStreetMap contributors、[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)。
生成したデータ（`src/data/generated/`）は ODbL の派生データベースなので、同じ ODbL で提供し、
アプリ（メニュー）と README に帰属表示を出す。

## 手順

```bash
# 1. 梅田周辺の抽出データを取得（OSM API の map 呼び出し。範囲は約 1.2km 四方）
mkdir -p .osm
curl -o .osm/umeda.osm 'https://api.openstreetmap.org/api/0.6/map?bbox=135.4925,34.6955,135.5055,34.7075'

# 2. 生成（取得日を記録する）
OSM_EXTRACT_DATE=$(date +%F) node scripts/osm/build.mjs .osm/umeda.osm
npx prettier --write src/data/generated

# 3. 確認
npm test
```

`.osm/` は `.gitignore` 済み（元データはコミットしない）。

## 中身

| ファイル       | 役割                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `parseOsm.mjs` | OSM XML の読み込み（node / way / tag）                                                                                   |
| `network.mjs`  | 地下の歩行グラフ作成（地下の通路＋上り下りの階段、15m 以内の切れ目をつなぐ、出入口を 30m 以内でつなぐ、次数2の点を縮約） |
| `overlay.mjs`  | 手作業で重ねるデータ（改札・広場・区画名・阪急三番街 B1/B2・地上スポットの一覧）。値の根拠をコメントに書く               |
| `build.mjs`    | 上をまとめて `osmData.ts` を書き出す                                                                                     |

## 生成の規則

- 範囲: `overlay.mjs` の `REGION`（原点からの東西・南北メートル）
- 出口: `railway=subway_entrance`（または番号付きの `entrance`）のうち、主な通路網につながり番号（`ref`）があるもの
- フロア: 通路の `level`。-2 だけなら B2、出入口は 1F、それ以外は B1
- エリア: OSM の地下街ポリゴン（Whityうめだ / ディアモール大阪 / ドージマ地下センター / ekimo梅田）の内側。阪急三番街は `overlay.mjs` の場所。その他は駅（station）
- 店: `level` が負の名前付きの店・飲食店。近くの点（25m）か通路の途中（45m）に付ける。大阪駅前第1〜4ビルの地下の店は各ビルの点に付ける
- 名前のない分岐: 35m 以内の出口（「H-49出口付近」）→ その点に付く店（「◯◯前」）→ 区画名の通路
- 通路の長さ: OSM の線の長さ。重ねた場所の枝は直線距離 ×1.15
