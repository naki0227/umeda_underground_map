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
});
