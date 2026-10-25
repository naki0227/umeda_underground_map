import { describe, expect, it } from 'vitest';
import { matchExitCode, normalizeExitCode } from '../exitCode';
import type { MapNode } from '../types';

const exit = (id: string, exitNo: string): MapNode => ({
  id,
  kind: 'exit',
  exitNo,
  name: { ja: `${exitNo} 出口`, en: `Exit ${exitNo}` },
  area: 'whity',
  x: 0,
  y: 0,
  lat: 0,
  lng: 0,
});

describe('exit codes', () => {
  it('reads the code however it was typed', () => {
    expect(normalizeExitCode('ｍ－１２')).toBe('M12');
    expect(normalizeExitCode('m 12')).toBe('M12');
    expect(normalizeExitCode('M-12')).toBe('M12');
  });

  it('puts the exact exit first, then the ones starting with the code', () => {
    const nodes = [exit('a', 'M-1'), exit('b', 'M-12'), exit('c', 'M-10'), exit('d', 'H-12')];
    expect(matchExitCode(nodes, 'm12').map((n) => n.id)).toEqual(['b']);
    expect(matchExitCode(nodes, 'M1').map((n) => n.id)).toEqual(['a', 'c', 'b']);
    expect(matchExitCode(nodes, '')).toEqual([]);
  });
});
