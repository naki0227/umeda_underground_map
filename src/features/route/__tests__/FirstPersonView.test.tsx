import { render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import type { SideView } from '../../../domain/sideView';
import { initI18n } from '../../../i18n';
import { FirstPersonView } from '../FirstPersonView';
import type { SceneInput } from '../scene/corridorScene';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

const sideView: SideView = {
  left: [
    {
      key: 'shop:a',
      kind: 'shop',
      name: { ja: 'カフェA', en: 'Cafe A' },
      side: 'left',
      distanceM: 12,
      index: 1,
    },
  ],
  right: [],
  along: [],
};

// 北へ 40m 進んで東へ曲がる通路。左に店、右に出口
const scene: SceneInput = {
  path: [
    { x: 0, y: 0 },
    { x: 0, y: 40 },
    { x: 30, y: 40 },
  ],
  items: [
    {
      key: 'shop:a',
      kind: 'shop',
      side: 'left',
      distanceM: 12,
      name: 'カフェA',
      icon: '☕',
      color: '#a0612b',
    },
    {
      key: 'exit:x',
      kind: 'exit',
      side: 'right',
      distanceM: 20,
      name: 'H-8',
      icon: '⬆',
      color: '#facc15',
    },
  ],
  turn: { distanceM: 40, icon: '↱' },
};

describe('FirstPersonView', () => {
  it('draws the corridor with shop and exit signs and the next move', () => {
    const { container } = render(
      <FirstPersonView
        scene={scene}
        sideView={sideView}
        step={{ fromNodeId: 'a', atNodeId: 'b', action: 'right', distanceM: 40 }}
        miniMap={<div data-testid="slot" />}
      />,
    );
    expect(screen.getByText('40m')).toBeInTheDocument();
    expect(screen.getByText('右へ')).toBeInTheDocument();
    expect(screen.getByLabelText('約40m先で右へ')).toBeInTheDocument();
    expect(screen.getByTestId('slot')).toBeInTheDocument();
    expect(container.querySelectorAll('.fpv-scene polygon').length).toBeGreaterThan(20);
    expect(container.querySelector('.fpv-pill.shop text')?.textContent).toBe('☕ カフェA');
    expect(container.querySelector('.fpv-pill.exit text')?.textContent).toBe('⬆ H-8');
    expect(container.querySelector('.fpv-pill.turn text')?.textContent).toBe('↱');
  });

  it('keeps the left and right lists for screen readers', () => {
    render(
      <FirstPersonView
        scene={scene}
        sideView={sideView}
        step={{ fromNodeId: 'a', atNodeId: 'b', action: 'arrive', distanceM: 10 }}
      />,
    );
    const left = screen.getByRole('region', { name: '左' });
    expect(within(left).getByText(/カフェA/)).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: '右' })).getByText('なし'),
    ).toBeInTheDocument();
  });
});
