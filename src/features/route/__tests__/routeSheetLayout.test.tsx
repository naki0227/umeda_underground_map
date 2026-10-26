import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { buildGraph } from '../../../domain/graph';
import type { MapEdge, MapNode } from '../../../domain/types';
import { initI18n } from '../../../i18n';
import { RouteScreen } from '../RouteScreen';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

const node = (id: string, x: number, y = 0): MapNode => ({
  id,
  kind: 'gate',
  name: { ja: id, en: id },
  area: 'station',
  x,
  y,
  lat: 34.7,
  lng: 135.5 + x / 100000,
});

// a → b で曲がって → c。b→c は階段しかない
const nodes = [node('a', 0), node('b', 50), node('c', 50, 50)];
const edges: MapEdge[] = [
  { from: 'a', to: 'b', distanceM: 50 },
  { from: 'b', to: 'c', distanceM: 50, attrs: ['stairs'] },
];
const NOON = new Date('2026-10-20T03:00:00Z');

const renderRoute = (props: Partial<Parameters<typeof RouteScreen>[0]> = {}) =>
  render(
    <RouteScreen
      graph={buildGraph({ nodes, edges })}
      fromNodeId="a"
      toNodeId="c"
      destinationLabel={{ ja: 'HEP FIVE', en: 'HEP FIVE' }}
      aboveGround={false}
      onLost={() => {}}
      onFinish={() => {}}
      onClose={() => {}}
      now={NOON}
      {...props}
    />,
  );

describe('route sheet layout', () => {
  it('names the destination in one heading and the time in the line below', () => {
    renderRoute();
    expect(screen.getByRole('heading', { name: 'HEP FIVEまで' })).toBeInTheDocument();
    expect(screen.getByText(/到着まで 約\d+分・100m/)).toBeInTheDocument();
  });

  it('shows only the most important notice', () => {
    // 階段を避けたいのに階段しかない + 雨。お知らせは段差の方だけ
    renderRoute({ access: 'noStairs', rain: true, onAccessChange: () => {} });
    expect(screen.getByTestId('stairs-warning')).toBeInTheDocument();
    expect(screen.queryByTestId('rain-note')).toBeNull();
    expect(screen.getAllByText((_, el) => el?.classList.contains('hint') ?? false)).toHaveLength(1);
  });

  it('keeps the options and the full step list folded until asked', async () => {
    const user = userEvent.setup();
    const onAccessChange = vi.fn();
    const onSimpleChange = vi.fn();
    renderRoute({ onAccessChange, onSimpleChange, simple: true });
    expect(screen.queryByTestId('route-options')).toBeNull();
    const list = screen.getByText('すべての手順（2）').closest('details');
    expect(list).not.toHaveAttribute('open');

    const optionsButton = screen.getByRole('button', { name: /経路の設定/ });
    expect(optionsButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(optionsButton);
    const options = screen.getByTestId('route-options');
    expect(within(options).getByRole('radio', { name: 'ふつう' })).toBeChecked();
    await user.click(within(options).getByRole('radio', { name: 'エレベーターだけ' }));
    expect(onAccessChange).toHaveBeenCalledWith('stepFree');
    await user.click(within(options).getByRole('radio', { name: '最短の道にする' }));
    expect(onSimpleChange).toHaveBeenCalledWith(false);
  });

  it('jumps to a step picked from the list', async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    renderRoute({ onStepChange });
    await user.click(screen.getByText('すべての手順（2）'));
    const rows = screen.getAllByRole('button', { name: /「HEP FIVE」に到着/ });
    await user.click(rows[rows.length - 1]);
    expect(onStepChange).toHaveBeenCalledWith(1);
  });
});
