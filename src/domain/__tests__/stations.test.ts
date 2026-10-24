import { describe, expect, it } from 'vitest';
import { umedaMap } from '../../data/map';
import { matchStations, nearestCandidate, STATIONS, stationGates } from '../stations';

describe('stations', () => {
  it('finds the station from how people say it', () => {
    expect(matchStations('大阪駅')[0].id).toBe('jr-osaka');
    expect(matchStations('JR大阪駅')[0].id).toBe('jr-osaka');
    expect(matchStations('大阪駅に行きたい')[0].id).toBe('jr-osaka');
    expect(matchStations('osaka station')[0].id).toBe('jr-osaka');
    expect(matchStations('阪神梅田')[0].id).toBe('hanshin-umeda');
    expect(matchStations('東梅田')[0].id).toBe('higashi-umeda');
    expect(matchStations('梅田駅').map((s) => s.id)).toEqual(
      expect.arrayContaining(['hankyu-umeda', 'hanshin-umeda', 'metro-umeda']),
    );
  });

  it('does not take buildings in front of the station for the station', () => {
    expect(matchStations('大阪駅前第1ビル')).toEqual([]);
    expect(matchStations('HEP FIVE')).toEqual([]);
  });

  it('has gates in the data for every station', () => {
    for (const station of STATIONS) {
      expect(stationGates(station, umedaMap.nodes).length, station.id).toBeGreaterThan(0);
    }
    const jr = STATIONS.find((s) => s.id === 'jr-osaka');
    expect(jr && stationGates(jr, umedaMap.nodes).length).toBe(2);
  });

  it('picks the candidate with the shortest route', () => {
    const d: Record<string, number | null> = { a: 300, b: 120, c: null };
    expect(nearestCandidate(['a', 'b', 'c'], (id) => d[id])).toBe('b');
    expect(nearestCandidate(['c'], (id) => d[id])).toBeNull();
  });
});
