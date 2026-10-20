# 作業報告書: 店舗データを OSM に一本化

## 作業日時

2026年10月20日 12時12分00秒

## 作業目的

`docs/COMPLETION.md` §5-4 の回答「既存の店舗データは OSM に寄せてよい」を反映する。

## 変更内容

- `src/data/mergeShops.ts`: 公式サイト由来の店と同じ店が OSM にあれば、OSM 側（店名・種別・位置）を使い、公式サイト由来の方は使わない。OSM にない店だけ公式サイト由来のものを残す（これまでは店名を公式サイト、位置を OSM から取っていた）
- 店数は変わらず計 357 店（OSM 由来 310 店 + OSM にない公式サイト由来 47 店。同じ店 17 店は OSM 側に一本化）
- README・`docs/COMPLETION.md`・`officialShops.ts` の説明を更新

## 追加・更新したテスト

`mergeShops.test.ts`: 同じ店は OSM 側を使い公式サイト由来を捨てる、1 対 1 で照合する

## 実行した確認コマンド

typecheck / lint / format:check / test（141件）/ build → 成功
