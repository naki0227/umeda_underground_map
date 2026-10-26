import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../../i18n';
import { BottomSheet } from '../BottomSheet';
import { releaseSnap, swipeMode } from '../sheetSwipe';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

describe('swipeMode', () => {
  it('waits until the finger has moved a little', () => {
    expect(swipeMode({ dx: 2, dy: -4, scrollTop: 0, snap: 'half' })).toBeNull();
  });

  it('grows the sheet on an upward swipe until it is full, then scrolls', () => {
    expect(swipeMode({ dx: 0, dy: -30, scrollTop: 0, snap: 'peek' })).toBe('resize');
    expect(swipeMode({ dx: 0, dy: -30, scrollTop: 0, snap: 'half' })).toBe('resize');
    expect(swipeMode({ dx: 0, dy: -30, scrollTop: 0, snap: 'full' })).toBe('scroll');
  });

  it('shrinks the sheet on a downward swipe only when the content is at the top', () => {
    expect(swipeMode({ dx: 0, dy: 30, scrollTop: 0, snap: 'full' })).toBe('resize');
    expect(swipeMode({ dx: 0, dy: 30, scrollTop: 120, snap: 'full' })).toBe('scroll');
  });

  it('leaves sideways swipes to horizontal lists', () => {
    expect(swipeMode({ dx: -40, dy: -10, scrollTop: 0, snap: 'half' })).toBe('scroll');
  });
});

describe('releaseSnap', () => {
  it('goes to the nearest height after a slow, short move', () => {
    expect(releaseSnap('half', -20, 0.57)).toBe('half');
  });

  it('moves at least one step in the direction of a long swipe', () => {
    expect(releaseSnap('half', -60, 0.6)).toBe('full');
    expect(releaseSnap('half', 60, 0.5)).toBe('peek');
    expect(releaseSnap('full', -60, 0.85)).toBe('full');
    expect(releaseSnap('peek', 400, 0.15)).toBe('peek');
  });
});

describe('BottomSheet touch', () => {
  const swipe = (el: Element, fromY: number, toY: number) => {
    fireEvent.touchStart(el, { touches: [{ clientX: 100, clientY: fromY }] });
    fireEvent.touchMove(el, { touches: [{ clientX: 100, clientY: (fromY + toY) / 2 }] });
    fireEvent.touchMove(el, { touches: [{ clientX: 100, clientY: toY }] });
    fireEvent.touchEnd(el, { changedTouches: [{ clientX: 100, clientY: toY }] });
  };

  it('resizes when swiping on the content, not only on the handle', () => {
    render(
      <BottomSheet label="テスト">
        <p>内容</p>
      </BottomSheet>,
    );
    const sheet = screen.getByRole('dialog', { name: 'テスト' });
    expect(sheet).toHaveAttribute('data-snap', 'half');
    swipe(screen.getByText('内容'), 600, 300);
    expect(sheet).toHaveAttribute('data-snap', 'full');
    swipe(screen.getByText('内容'), 300, 700);
    expect(sheet).toHaveAttribute('data-snap', 'peek');
  });

  it('lets the content scroll when the full sheet is scrolled down', () => {
    render(
      <BottomSheet label="テスト" initialSnap="full">
        <p>内容</p>
      </BottomSheet>,
    );
    const sheet = screen.getByRole('dialog', { name: 'テスト' });
    sheet.scrollTop = 200;
    swipe(screen.getByText('内容'), 300, 600);
    expect(sheet).toHaveAttribute('data-snap', 'full');
  });
});
