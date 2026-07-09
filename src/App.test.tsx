import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import App from './App';
import { initI18n } from './i18n';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

describe('App user flow', () => {
  it('locates via nearby shops, chooses a destination and shows directions', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. 位置確定画面: 近くの店を2つ選ぶ
    expect(screen.getByRole('heading', { name: '現在地を確認する' })).toBeInTheDocument();
    await user.click(screen.getByLabelText(/マクドナルド ホワイティうめだ店/));
    await user.click(screen.getByLabelText(/古潭ラーメン ホワイティうめだ店/));
    await user.click(screen.getByRole('button', { name: '現在地を推定する' }));

    // 2. 候補から現在地を確定
    expect(screen.getByText('このあたりですか？')).toBeInTheDocument();
    const candidates = screen.getAllByRole('button', { name: /確度/ });
    await user.click(candidates[0]);

    // 3. 目的地を選ぶ（出口タブから泉の広場東出口）
    expect(screen.getByRole('heading', { name: '目的地を選ぶ' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /M-14 泉の広場東 出口/ }));

    // 4. 経路が表示される
    expect(screen.getByRole('heading', { name: '道案内' })).toBeInTheDocument();
    expect(screen.getByText(/合計 約\d+m/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '迷った' })).toBeInTheDocument();

    // 5. 迷ったボタンで位置確定に戻る
    await user.click(screen.getByRole('button', { name: '迷った' }));
    expect(screen.getByRole('heading', { name: '現在地を確認する' })).toBeInTheDocument();
  });

  it('shows the report link for the current language', () => {
    render(<App />);
    const link = screen.getByRole('link', { name: /間違いを報告する/ });
    expect(link).toHaveAttribute('href', expect.stringContaining('docs.google.com/forms'));
  });
});
