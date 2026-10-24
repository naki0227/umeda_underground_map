import { describe, expect, it } from 'vitest';
import { umedaMap } from '../../../data/map';
import { gateRailway, pinIcon, pinShortName, poiIcon } from '../mapIcons';
import { pinLabelText } from '../mapLabels';

const node = (kind: 'gate' | 'landmark', ja: string) => ({
  id: ja,
  kind,
  name: { ja, en: ja },
  area: 'station' as const,
  x: 0,
  y: 0,
});

describe('map icons', () => {
  it('gives every spot an icon by kind', () => {
    expect(poiIcon({ id: 'poi-hepfive', name: { ja: 'HEP FIVE', en: 'HEP FIVE' } })).toBe('🎡');
    expect(poiIcon({ id: 'x', name: { ja: '梅田センタービル', en: '' } })).toBe('🏢');
    expect(poiIcon({ id: 'y', name: { ja: 'どこか', en: '' } })).toBe('📍');
    for (const poi of umedaMap.pois) expect(poiIcon(poi)).not.toBe('');
  });

  it('names gates by their railway, in its color', () => {
    expect(gateRailway(node('gate', 'JR大阪駅 御堂筋口'))?.short.ja).toBe('JR');
    expect(gateRailway(node('gate', '御堂筋線梅田駅 北改札'))?.short.ja).toBe('御堂筋線');
    expect(gateRailway(node('gate', '阪神大阪梅田駅 東改札'))?.color).toBe('#0067b0');
    for (const gate of umedaMap.nodes.filter((n) => n.kind === 'gate')) {
      expect(gateRailway(gate), gate.name.ja).not.toBeNull();
    }
  });

  it('shows short names unless zoomed in, and only an icon for building basements', () => {
    const plaza = node('landmark', '泉の広場（Water Tree）');
    const basement = node('landmark', '大阪駅前第1ビル B1');
    const gate = node('gate', '四つ橋線西梅田駅 改札');
    expect(pinIcon(plaza)).toBe('⛲');
    expect(pinIcon(gate)).toBe('🚉');
    expect(pinShortName(basement)).toBeNull();
    expect(pinLabelText(gate, 1, 'ja')).toBe('四つ橋線');
    expect(pinLabelText(gate, 1, 'en')).toBe('Yotsubashi');
    expect(pinLabelText(basement, 1, 'ja')).toBeNull();
    expect(pinLabelText(plaza, 1, 'ja')).toBe('泉の広場（Water Tree）');
    // 拡大したら（詳細表示）フルの名前
    expect(pinLabelText(gate, 0.4, 'ja')).toBe('四つ橋線西梅田駅 改札');
    expect(pinLabelText(basement, 0.4, 'ja')).toBe('大阪駅前第1ビル B1');
  });
});
