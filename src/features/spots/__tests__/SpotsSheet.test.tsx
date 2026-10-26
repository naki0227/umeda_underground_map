import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { umedaAmenities } from '../../../data/amenities';
import { umedaMap } from '../../../data/map';
import { buildGraph } from '../../../domain/graph';
import { initI18n } from '../../../i18n';
import { SpotsSheet } from '../SpotsSheet';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

describe('finding facilities', () => {
  it('lists the nearest coin lockers and opens one', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const graph = buildGraph(umedaMap);
    const start = umedaMap.nodes.find((n) => n.name.ja === '円形広場')!;
    render(
      <SpotsSheet
        graph={graph}
        pois={umedaMap.pois}
        amenities={umedaAmenities}
        currentNodeId={start.id}
        onPick={onPick}
        onClose={() => {}}
      />,
    );
    // おすすめスポットが開いている。設備のタブに切り替える
    expect(screen.queryByRole('button', { name: 'コインロッカー' })).toBeNull();
    await user.click(screen.getByRole('radio', { name: '設備をさがす' }));
    await user.click(screen.getByRole('button', { name: 'コインロッカー' }));
    const items = screen.getAllByRole('button', { name: /^コインロッカー/ }).slice(1);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(8);
    expect(items[0]).toHaveTextContent(/徒歩\d+分/);
    await user.click(items[0]);
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({
        aboveGround: false,
        name: expect.objectContaining({ ja: expect.stringMatching(/^コインロッカー/) }),
      }),
    );
  });
});
