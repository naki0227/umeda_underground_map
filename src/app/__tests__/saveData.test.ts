import { describe, expect, it } from 'vitest';
import { applySaveDataPreference } from '../saveData';

const navWith = (connection?: { saveData?: boolean }) => ({ connection }) as unknown as Navigator;

describe('applySaveDataPreference', () => {
  it('marks the root when the data saver is on', () => {
    const root = document.createElement('html');
    expect(applySaveDataPreference(root, navWith({ saveData: true }))).toBe(true);
    expect(root.dataset.saveData).toBe('true');
  });

  it('leaves the root unmarked when the data saver is off or unsupported', () => {
    const root = document.createElement('html');
    root.dataset.saveData = 'true';
    expect(applySaveDataPreference(root, navWith({ saveData: false }))).toBe(false);
    expect(root.dataset.saveData).toBeUndefined();
    expect(applySaveDataPreference(root, navWith())).toBe(false);
    expect(root.dataset.saveData).toBeUndefined();
  });
});
