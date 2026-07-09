import type { Poi } from '../domain/types';

/**
 * 地上スポット → 最寄り地下ノードの対応表。
 * 「H-28出口」ではなく「HEP FIVE」のように、地上の目印で
 * 出発地・目的地を選べるようにするためのデータ。
 * 最寄り出口の対応は現地未検証（報告フォームで修正を収集）。
 */
export const umedaPois: Poi[] = [
  {
    id: 'poi-hepfive',
    name: { ja: 'HEP FIVE（赤い観覧車）', en: 'HEP FIVE (Red Ferris Wheel)' },
    nodeId: 'wt-exit-h8',
  },
  {
    id: 'poi-hankyu-dept',
    name: { ja: '阪急百貨店 うめだ本店', en: 'Hankyu Department Store Umeda' },
    nodeId: 'wt-exit-h1',
  },
  {
    id: 'poi-hanshin-dept',
    name: { ja: '阪神百貨店 梅田本店', en: 'Hanshin Department Store Umeda' },
    nodeId: 'st-j-hanshinmae',
  },
  {
    id: 'poi-higashidori',
    name: { ja: '阪急東通商店街', en: 'Hankyu Higashi-dori Shopping Street' },
    nodeId: 'wt-exit-h16',
  },
  {
    id: 'poi-ohatsutenjin',
    name: { ja: 'お初天神（露天神社）', en: 'Ohatsu Tenjin Shrine (Tsuyunoten)' },
    nodeId: 'wt-s2',
  },
  {
    id: 'poi-chayamachi',
    name: { ja: '茶屋町（NU茶屋町・ロフト方面）', en: 'Chayamachi (NU Chayamachi / Loft)' },
    nodeId: 'sb-exit-n1',
  },
  {
    id: 'poi-yodobashi',
    name: { ja: 'ヨドバシカメラ梅田（LINKS UMEDA）', en: 'Yodobashi Camera Umeda (LINKS UMEDA)' },
    nodeId: 'st-metro-n',
  },
  {
    id: 'poi-grandfront',
    name: { ja: 'グランフロント大阪', en: 'Grand Front Osaka' },
    nodeId: 'st-exit-central',
  },
  {
    id: 'poi-lucua',
    name: { ja: 'ルクア大阪（大阪ステーションシティ）', en: 'LUCUA Osaka (Osaka Station City)' },
    nodeId: 'st-jr-midosuji',
  },
  {
    id: 'poi-daimaru',
    name: { ja: '大丸梅田店', en: 'Daimaru Umeda' },
    nodeId: 'st-jr-midosuji',
  },
  {
    id: 'poi-shinumeda-shokudogai',
    name: { ja: '新梅田食道街', en: 'Shin-Umeda Shokudogai (Food Alley)' },
    nodeId: 'st-exit-central',
  },
  {
    id: 'poi-herbis',
    name: { ja: 'ハービスPLAZA / ヒルトン大阪', en: 'Herbis PLAZA / Hilton Osaka' },
    nodeId: 'st-nishiumeda',
  },
  {
    id: 'poi-ekimae-bldg',
    name: { ja: '大阪駅前ビル（第1〜4ビル）', en: 'Osaka Ekimae Buildings (No.1-4)' },
    nodeId: 'dm-b2',
  },
  {
    id: 'poi-kitashinchi',
    name: { ja: '北新地（飲食街）', en: 'Kitashinchi Dining District' },
    nodeId: 'st-kitashinchi',
  },
  {
    id: 'poi-dojima-avanza',
    name: { ja: '堂島アバンザ（ジュンク堂書店）', en: 'Dojima Avanza (Junkudo Books)' },
    nodeId: 'dj-exit-c90',
  },
  {
    id: 'poi-sonezaki-police',
    name: { ja: '曽根崎警察署', en: 'Sonezaki Police Station' },
    nodeId: 'dm-exit-d2',
  },
];
