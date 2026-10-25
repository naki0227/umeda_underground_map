import { describe, expect, it } from 'vitest';
import { currentPop, floodWarningIn } from '../weather';

const forecast = [
  {
    timeSeries: [
      { timeDefines: ['2026-10-25T17:00:00+09:00'], areas: [{ weatherCodes: ['200'] }] },
      {
        timeDefines: [
          '2026-10-25T18:00:00+09:00',
          '2026-10-26T00:00:00+09:00',
          '2026-10-26T06:00:00+09:00',
        ],
        areas: [{ area: { code: '270000' }, pops: ['30', '60', '80'] }],
      },
    ],
  },
];

describe('weather from the JMA JSON', () => {
  it('reads the chance of rain for the time slot we are in', () => {
    expect(currentPop(forecast, new Date('2026-10-25T20:00:00+09:00'))).toBe(30);
    expect(currentPop(forecast, new Date('2026-10-26T01:00:00+09:00'))).toBe(60);
    // 予報の最初の時間帯より前なら最初の値
    expect(currentPop(forecast, new Date('2026-10-25T12:00:00+09:00'))).toBe(30);
    expect(currentPop({}, new Date())).toBeNull();
  });

  it('finds heavy-rain and flood warnings for Osaka city only', () => {
    const warning = (code: string, status: string, area = '2710000') => ({
      areaTypes: [{ areas: [] }, { areas: [{ code: area, warnings: [{ code, status }] }] }],
    });
    expect(floodWarningIn(warning('03', '発表'))).toBe('warning');
    expect(floodWarningIn(warning('33', '継続'))).toBe('emergency');
    expect(floodWarningIn(warning('03', '解除'))).toBeNull();
    expect(floodWarningIn(warning('03', '発表', '2714000'))).toBeNull();
    expect(floodWarningIn(warning('21', '発表'))).toBeNull();
  });
});
