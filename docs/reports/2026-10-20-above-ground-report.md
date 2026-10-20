# 作業報告書: 地上ルートの提案と Google マップへの誘導（B-3）

## 作業日時

2026年10月20日 02時08分04秒

## 作業目的

`docs/COMPLETION.md` B-3 / TODO「地上ルートが最適な場合の提案とGoogle Mapsへの誘導（日差し回避などの理由がなければ地上を提案）」。

## 変更内容

- `src/domain/aboveGround.ts`（新規）: `shouldSuggestAboveGround`（地下経路 > 直線距離 × 1.6 かつ直線 150m 以上）、`googleMapsWalkingUrl`（Google の公開 Maps URLs。API キー・埋め込み・タイルなし）
- `src/domain/geo.ts`: `fitGeoTransform` に逆変換 `toGeo` を追加（緯度経度のない分岐ノードでもリンクを作れる）
- 経路シートに提案カード（地下と直線の距離、Google マップへのリンク、「日差しや雨を避けたいときは地下のまま」の注記）
- しきい値は `src/app/config.ts` の `ABOVE_GROUND_SUGGEST_RATIO` / `ABOVE_GROUND_MIN_STRAIGHT_M`（COMPLETION §5-5 で確認依頼中）

## 追加・更新したテスト

- `aboveGround.test.ts`: 提案する／しない（直通・近距離）、URL の形（キーなし・徒歩）
- `geo.test.ts`: 逆変換
- `RouteScreen.test.tsx`: 迂回が長いと提案とリンクが出る、直通なら出ない

## 実行した確認コマンド

typecheck / lint / format:check / test（105件）/ build → 成功

## 注意

- 現状の地下データは骨格のみで迂回が少ないため、実データで提案が出る組み合わせは少ない。C 系でデータを増やすと効いてくる
- リンクは外部サイト（Google マップ）を新しいタブで開く。位置情報は URL にのみ含まれ、アプリからは送信しない

## 次にやること

B-4 案内中ビューの磨き込み
