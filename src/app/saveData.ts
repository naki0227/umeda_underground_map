/** Network Information API の saveData（対応ブラウザのみ） */
type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean } };

/**
 * 端末の「データセーバー」設定がオンなら <html data-save-data> を付ける。
 * index.css はこの属性があると、常に動くアニメーション（選択の目印の点滅）を止める。
 */
export function applySaveDataPreference(
  root: HTMLElement = document.documentElement,
  nav: Navigator = navigator,
): boolean {
  const saveData = (nav as NavigatorWithConnection).connection?.saveData === true;
  if (saveData) root.dataset.saveData = 'true';
  else delete root.dataset.saveData;
  return saveData;
}
