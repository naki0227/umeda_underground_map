import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import App from './App';
import { initI18n } from './i18n';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

describe('App map-first user flow', () => {
  it('searches a place, sets location via shops, and shows directions', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. 全画面マップと検索バーが出る
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: '目的地を入力（お店・出口・スポット）' });

    // 2. 検索して地上スポットを選ぶ
    await user.type(search, 'HEP');
    await user.click(screen.getByRole('button', { name: /HEP FIVE（赤い観覧車）/ }));

    // 3. 場所シート → ここへ行く（現在地未設定なので位置確定シートへ）
    await user.click(screen.getByRole('button', { name: 'ここへ行く' }));
    expect(screen.getByRole('dialog', { name: '現在地を確認する' })).toBeInTheDocument();

    // 4. 近くの店を2つ選んで推定 → 推定位置カードから案内開始
    await user.click(screen.getByLabelText(/スターバックスコーヒー ホワイティうめだ店/));
    await user.click(screen.getByLabelText(/古潭 ホワイティうめだ店/));
    await user.click(screen.getByRole('button', { name: '現在地を推定する' }));
    expect(screen.getByText('推定位置')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'この位置で案内開始' }));

    // 5. 経路シートが表示される（地上ヒント・迷ったボタン付き）
    expect(screen.getByRole('dialog', { name: '道案内' })).toBeInTheDocument();
    expect(screen.getByText(/目的地: HEP FIVE（赤い観覧車）/)).toBeInTheDocument();
    expect(screen.getByText(/地上です/)).toBeInTheDocument();
    expect(screen.getByText(/合計 約\d+m/)).toBeInTheDocument();
    expect(screen.getByTestId('map-route')).toBeInTheDocument();

    // 6. 迷ったボタンで位置確定シートに戻る
    await user.click(screen.getByRole('button', { name: '迷った' }));
    expect(screen.getByRole('dialog', { name: '現在地を確認する' })).toBeInTheDocument();
  });

  it('selects a pin on the map and sets it as current location', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const pin = container.querySelector('[data-node-id="wt-izumi"]');
    expect(pin).not.toBeNull();
    await user.click(pin as Element);
    expect(screen.getByRole('dialog', { name: /泉の広場/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'いまここにいる' }));
    // 現在地マーカーがマップに出る
    expect(screen.getByTestId('map-current')).toBeInTheDocument();
  });

  it('opens spots and menu from the tab bar', async () => {
    const user = userEvent.setup();
    render(<App />);

    // スポットタブ → おすすめスポットのカード一覧
    await user.click(screen.getByRole('button', { name: 'スポット' }));
    expect(screen.getByRole('dialog', { name: 'おすすめスポット' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /HEP FIVE/ })).toBeInTheDocument();

    // メニュータブ → 報告リンクと言語切替
    await user.click(screen.getByRole('button', { name: 'メニュー' }));
    const link = screen.getByRole('link', { name: /間違いを報告する/ });
    expect(link).toHaveAttribute('href', expect.stringContaining('docs.google.com/forms'));

    // 地図タブでシートが閉じる
    await user.click(screen.getByRole('button', { name: '地図' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
