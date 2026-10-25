/**
 * ホーム画面から開いたアプリは閉じずに裏へ回ることが多く、新しい版が出ても古いまま動き続ける。
 * 画面に戻ってきたときに Service Worker の更新を確かめ、新しい版があれば裏で入れておく
 * （途中で再読み込みはしない。次に開いたときから新しい版になる）。
 */
export function checkForUpdatesWhenVisible(
  doc: Document = document,
  sw: ServiceWorkerContainer | undefined = globalThis.navigator?.serviceWorker,
): () => void {
  if (sw === undefined) return () => {};
  const onVisible = () => {
    if (doc.visibilityState !== 'visible') return;
    void sw
      .getRegistration()
      .then((registration) => registration?.update())
      .catch(() => {
        // オフラインなどで確かめられなくても、いまの版で動き続ければよい
      });
  };
  doc.addEventListener('visibilitychange', onVisible);
  return () => doc.removeEventListener('visibilitychange', onVisible);
}
