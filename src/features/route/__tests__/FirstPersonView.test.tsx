import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { SideView } from '../../../domain/sideView';
import { initI18n } from '../../../i18n';
import { FirstPersonView } from '../FirstPersonView';

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
    },
    { key: 'exit:x', kind: 'exit', name: { ja: 'H-8', en: 'H-8' }, side: 'left', distanceM: 40 },
  ],
  right: [
    {
      key: 'passage:p',
      kind: 'passage',
      name: { ja: '泉の広場', en: 'Izumi' },
      side: 'right',
      distanceM: 25,
    },
  ],
  along: [
    { key: 'shop:b', kind: 'shop', name: { ja: '店B', en: 'Shop B' }, side: 'along', distanceM: 5 },
  ],
};

describe('FirstPersonView', () => {
  it('lists what is on the left and right with the distance ahead', () => {
    render(
      <FirstPersonView
        sideView={sideView}
        step={{ fromNodeId: 'a', atNodeId: 'b', action: 'right', distanceM: 53 }}
        onShowMap={() => {}}
      />,
    );
    expect(screen.getByText(/約53m先で右へ/)).toBeInTheDocument();
    const left = screen.getByRole('region', { name: '左' });
    expect(within(left).getByText('カフェA')).toBeInTheDocument();
    expect(within(left).getByText('H-8 出口')).toBeInTheDocument();
    expect(within(left).getByText('12m先')).toBeInTheDocument();
    const right = screen.getByRole('region', { name: '右' });
    expect(within(right).getByText('脇道（泉の広場）')).toBeInTheDocument();
    expect(screen.getByText(/道沿い: 店B/)).toBeInTheDocument();
  });

  it('says so when nothing is on a side and switches back to the map', async () => {
    const onShowMap = vi.fn();
    render(
      <FirstPersonView
        sideView={{ left: [], right: [], along: [] }}
        step={{ fromNodeId: 'a', atNodeId: 'b', action: 'arrive', distanceM: 10 }}
        onShowMap={onShowMap}
      />,
    );
    expect(screen.getAllByText('なし')).toHaveLength(2);
    await userEvent.setup().click(screen.getByRole('button', { name: '地図で見る' }));
    expect(onShowMap).toHaveBeenCalled();
  });

  it('shows the step number and the mini map slot next to the next move', () => {
    render(
      <FirstPersonView
        sideView={sideView}
        step={{ fromNodeId: 'a', atNodeId: 'b', action: 'left', distanceM: 20 }}
        stepLabel="2 / 5"
        miniMap={<div data-testid="slot" />}
        onShowMap={() => {}}
      />,
    );
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
    expect(screen.getByTestId('slot')).toBeInTheDocument();
  });
});
