import { describe, expect, it } from 'vitest';
import { googleMapsWalkingUrl, shouldSuggestAboveGround } from '../aboveGround';

const base = { ratio: 1.6, minStraightM: 150 };

describe('shouldSuggestAboveGround', () => {
  it('suggests when the underground route is much longer than the straight line', () => {
    expect(shouldSuggestAboveGround({ ...base, undergroundM: 700, straightM: 300 })).toBe(true);
  });

  it('does not suggest when the underground route is reasonably direct', () => {
    expect(shouldSuggestAboveGround({ ...base, undergroundM: 400, straightM: 300 })).toBe(false);
    expect(shouldSuggestAboveGround({ ...base, undergroundM: 480, straightM: 300 })).toBe(false);
  });

  it('does not suggest for short trips', () => {
    expect(shouldSuggestAboveGround({ ...base, undergroundM: 400, straightM: 100 })).toBe(false);
  });
});

describe('googleMapsWalkingUrl', () => {
  it('builds a Maps URLs walking directions link without an API key', () => {
    const url = new URL(
      googleMapsWalkingUrl({ lat: 34.7025, lng: 135.4959 }, { lat: 34.704, lng: 135.5007 }),
    );
    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('origin')).toBe('34.702500,135.495900');
    expect(url.searchParams.get('destination')).toBe('34.704000,135.500700');
    expect(url.searchParams.get('travelmode')).toBe('walking');
    expect(url.searchParams.has('key')).toBe(false);
  });
});
