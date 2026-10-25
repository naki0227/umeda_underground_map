import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { umedaMap } from '../../../data/map';
import { buildGraph } from '../../../domain/graph';
import { initI18n } from '../../../i18n';
import { SearchBar } from '../SearchBar';

const graph = buildGraph(umedaMap);

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

describe('SearchBar', () => {
  it('announces the number of results and moves through them with the arrow keys', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<SearchBar graph={graph} shops={umedaMap.shops} pois={umedaMap.pois} onPick={onPick} />);
    const input = screen.getByRole('searchbox');
    await user.type(input, '大阪駅');
    expect(screen.getByRole('status')).toHaveTextContent(/件見つかりました/);

    const buttons = screen.getAllByRole('button');
    await user.keyboard('{ArrowDown}');
    expect(buttons[0]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(buttons[1]).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(input).toHaveFocus();

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onPick).toHaveBeenCalledTimes(1);
  });
});
