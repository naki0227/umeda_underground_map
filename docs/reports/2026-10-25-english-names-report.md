# 英語名の対訳表

- 日時: 2026-10-25
- ブランチ: claude/en-names

## 背景

OSM に英語名（`name:en`）がない店・ビルは、英語の表示でも日本語のままだった（1453 件中 324 件、名前の種類で 286）。中国語・韓国語の表示も英語名を使うので、同じく日本語が出ていた。自動のローマ字化（kuroshiro + kuromoji）は「ファミリマート → famirimāto」のように崩れるため、手で対訳表を作った。

## やったこと

- `src/data/englishNames.ts` に 286 件の対訳表。地図データを組み立てるとき（`src/data/map.ts`）に、英語名に日本語が残るものだけを置き換える。生成スクリプトとデータはそのまま
- 決め方
  - 公式の英語表記がある店はそれに合わせる（FamilyMart・LEGO Store・Lupicia・Afternoon Tea Living・Holly's Cafe・Sarabeth's・St. Marc・ORIHICA など）
  - ほかはヘボン式のローマ字（長音記号なし）。「酒場」「そば」などはそのまま読み（Sakaba / Soba）、「証券」「信用金庫」「ビル」など業種が分かる語は英語（Securities / Shinkin Bank / Building）
  - 名前のない分岐の目印（「つるとんたん前」→ In front of Tsurutontan）は中の名前だけを置き換える
- テスト: 地図のすべてのノード・店・ビル・地上スポットの英語名に日本語が残っていないこと

英語で検索するとローマ字でも見つかる（「Tsuru」で Tsurutontan）。

## 残ること

- 読みは推測を含む（とくに漢字の店名）。誤りに気づいたら表を直すか、OSM に `name:en` を足す（作り直したデータではそちらが優先され、表は使われなくなる）

## テスト

- test 256 件・typecheck・lint・format・build 通過。英語の画面をスクリーンショットで確認
