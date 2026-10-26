import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { umedaMap } from '../../../data/map';
import { buildGraph } from '../../../domain/graph';
import { initI18n } from '../../../i18n';
import { LocateScreen } from '../LocateScreen';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion: reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

async function estimate() {
  const scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
  const user = userEvent.setup();
  render(
    <LocateScreen
      graph={buildGraph(umedaMap)}
      shops={umedaMap.shops}
      pois={umedaMap.pois}
      onConfirm={vi.fn()}
    />,
  );
  await user.click(screen.getByRole('radio', { name: '見えるお店' }));
  const shopSearch = screen.getByPlaceholderText('店名で検索');
  await user.type(shopSearch, 'スターバックス');
  await user.click(screen.getByLabelText(/スターバックスコーヒー ホワイティうめだ店/));
  await user.click(screen.getByRole('button', { name: '現在地を推定する' }));
  return scrollIntoView;
}

describe('LocateScreen estimate card scrolling', () => {
  it('scrolls smoothly to the estimate card', async () => {
    stubReducedMotion(false);
    const scrollIntoView = await estimate();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });

  it('jumps without animation when reduced motion is requested', async () => {
    stubReducedMotion(true);
    const scrollIntoView = await estimate();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'nearest' });
  });

  it('starts from an exit whose number the user sees on a sign', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const graph = buildGraph(umedaMap);
    const exits = [...graph.nodes.values()].filter((n) => n.kind === 'exit' && n.exitNo === 'C-60');
    render(
      <LocateScreen
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        onConfirm={onConfirm}
      />,
    );
    // 全角・小文字・ハイフンなしでも見つかる
    await user.type(screen.getByLabelText(/出口番号/), 'ｃ６０');
    const picks = screen.getAllByRole('button', { name: /^C-60 出口のそばにいる/ });
    expect(picks).toHaveLength(exits.length);
    await user.click(picks[0]);
    expect(exits.map((n) => n.id)).toContain(onConfirm.mock.calls[0][0]);
  });

  it('starts right away from a landmark the user picks', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const graph = buildGraph(umedaMap);
    render(
      <LocateScreen
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        onConfirm={onConfirm}
      />,
    );
    // 出口番号の入力だけが開いている
    expect(screen.queryByPlaceholderText('店名で検索')).toBeNull();
    await user.click(screen.getByRole('radio', { name: '目印・改札' }));
    expect(screen.queryByLabelText(/出口番号/)).toBeNull();
    await user.click(screen.getByRole('button', { name: '円形広場' }));
    const plaza = [...graph.nodes.values()].find((n) => n.name.ja === '円形広場');
    expect(onConfirm).toHaveBeenCalledWith(plaza?.id);
  });

  it('asks for at least one clue before estimating', async () => {
    const user = userEvent.setup();
    render(
      <LocateScreen
        graph={buildGraph(umedaMap)}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        onConfirm={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('radio', { name: '見えるお店' }));
    expect(screen.getByRole('button', { name: '現在地を推定する' })).toBeDisabled();
    // 入った場所・GPS はたたんである
    expect(
      screen.getByText('ほかの手がかり（入った場所・GPS）').closest('details'),
    ).not.toHaveAttribute('open');
  });
});
