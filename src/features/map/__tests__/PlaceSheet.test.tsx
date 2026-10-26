import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initI18n } from '../../../i18n';
import { PlaceSheet } from '../PlaceSheet';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

const renderPlace = (aboveGround: boolean, onGo = vi.fn()) =>
  render(
    <PlaceSheet
      place={{ nodeId: 'n1', name: { ja: 'HEP FIVE', en: 'HEP FIVE' }, aboveGround }}
      exitNo={aboveGround ? 'H-30' : undefined}
      onGo={onGo}
      onSetHere={() => {}}
      onClose={() => {}}
      favorite={false}
      onToggleFavorite={() => {}}
    />,
  );

describe('place sheet', () => {
  it('says where to come up for a place above ground', () => {
    renderPlace(true);
    expect(screen.getByRole('heading', { name: 'HEP FIVE' })).toBeInTheDocument();
    expect(screen.getByText('地上・H-30 出口')).toBeInTheDocument();
  });

  it('has one main action, and saving and sharing as small icons', async () => {
    const user = userEvent.setup();
    const onGo = vi.fn();
    renderPlace(false, onGo);
    expect(screen.queryByText(/地上/)).toBeNull();
    const primary = document.querySelectorAll('button.primary');
    expect(primary).toHaveLength(1);
    expect(primary[0]).toHaveTextContent('ここへ行く');
    await user.click(primary[0] as HTMLElement);
    expect(onGo).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'いまここにいる' })).toHaveClass('secondary');
    for (const name of ['お気に入り', '共有']) {
      expect(screen.getByRole('button', { name })).toHaveClass('icon-tool');
    }
  });
});
