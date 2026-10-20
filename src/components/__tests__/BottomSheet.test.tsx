import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../../i18n';
import { BottomSheet } from '../BottomSheet';
import { nearestSnap, nextSnap } from '../sheetSnap';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

describe('snap helpers', () => {
  it('picks the nearest snap height', () => {
    expect(nearestSnap(0.2)).toBe('peek');
    expect(nearestSnap(0.5)).toBe('half');
    expect(nearestSnap(0.9)).toBe('full');
  });

  it('cycles peek -> half -> full -> peek', () => {
    expect(nextSnap('peek')).toBe('half');
    expect(nextSnap('half')).toBe('full');
    expect(nextSnap('full')).toBe('peek');
  });
});

describe('BottomSheet', () => {
  const renderSheet = () =>
    render(
      <BottomSheet label="テスト">
        <p>内容</p>
      </BottomSheet>,
    );

  it('changes height with the handle button (tap or keyboard)', async () => {
    const user = userEvent.setup();
    renderSheet();
    const sheet = screen.getByRole('dialog', { name: 'テスト' });
    const handle = screen.getByRole('button', { name: 'シートの高さを変える' });
    expect(sheet).toHaveAttribute('data-snap', 'half');
    await user.click(handle);
    expect(sheet).toHaveAttribute('data-snap', 'full');
    handle.focus();
    await user.keyboard('{Enter}');
    expect(sheet).toHaveAttribute('data-snap', 'peek');
  });

  it('snaps to the nearest height after dragging the handle', () => {
    renderSheet();
    const sheet = screen.getByRole('dialog', { name: 'テスト' });
    const handle = screen.getByRole('button', { name: 'シートの高さを変える' });
    const height = window.innerHeight;
    // half(0.55) から画面の 0.3 分だけ上へ → 0.85 = full
    fireEvent.pointerDown(handle, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 500 - height * 0.3, pointerId: 1 });
    expect(sheet).toHaveClass('dragging');
    fireEvent.pointerUp(handle, { clientY: 500 - height * 0.3, pointerId: 1 });
    // ブラウザはドラッグ後にも click を送るが、段階は変えない
    fireEvent.click(handle);
    expect(sheet).toHaveAttribute('data-snap', 'full');
    expect(sheet).not.toHaveClass('dragging');
  });
});
