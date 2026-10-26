import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../../../i18n';
import { MenuSheet } from '../MenuSheet';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

describe('menu sheet', () => {
  it('puts language first, folds the about text and always shows the map credit', () => {
    render(<MenuSheet dataVersion="2026-10" onClose={() => {}} />);
    const language = screen.getByRole('combobox');
    const about = screen.getByText('このアプリについて').closest('details');
    expect(about).not.toHaveAttribute('open');
    expect(language.compareDocumentPosition(about as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    const credit = screen.getByTestId('attribution');
    expect(about?.contains(credit)).toBe(false);
    expect(credit).toHaveTextContent('© OpenStreetMap contributors');
  });
});
