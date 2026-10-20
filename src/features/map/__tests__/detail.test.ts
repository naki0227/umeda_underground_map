import { describe, expect, it } from 'vitest';
import { detailLevel } from '../detail';

describe('detailLevel', () => {
  it('shows less when zoomed out and more when zoomed in', () => {
    expect(detailLevel(2.4)).toBe('overview');
    expect(detailLevel(1.6)).toBe('overview');
    expect(detailLevel(1.2)).toBe('normal');
    expect(detailLevel(0.7)).toBe('normal');
    expect(detailLevel(0.5)).toBe('detail');
  });
});
