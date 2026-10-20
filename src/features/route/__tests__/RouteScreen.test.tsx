import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildGraph } from '../../../domain/graph';
import type { MapEdge, MapNode } from '../../../domain/types';
import { initI18n } from '../../../i18n';
import { RouteScreen } from '../RouteScreen';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

const node = (id: string, x: number, y: number, lat: number, lng: number): MapNode => ({
  id,
  kind: 'gate',
  name: { ja: id, en: id },
  area: 'station',
  x,
  y,
  lat,
  lng,
});

// a と b は直線 300m だが、地下は c を大きく迂回する（約 854m）
const detourNodes = [
  node('a', 0, 0, 34.7, 135.5),
  node('b', 300, 0, 34.7, 135.50328),
  node('c', 150, 400, 34.7036, 135.50164),
];
const detourEdges: MapEdge[] = [
  { from: 'a', to: 'c', distanceM: 427 },
  { from: 'c', to: 'b', distanceM: 427 },
];

const renderRoute = (edges: MapEdge[]) =>
  render(
    <RouteScreen
      graph={buildGraph({ nodes: detourNodes, edges })}
      fromNodeId="a"
      toNodeId="b"
      destinationLabel={null}
      aboveGround={false}
      avoidStairs={false}
      onToggleAvoidStairs={() => {}}
      onLost={() => {}}
      onFinish={() => {}}
      onClose={() => {}}
    />,
  );

describe('RouteScreen above-ground suggestion', () => {
  it('suggests walking above ground with a Google Maps link when the detour is long', () => {
    renderRoute(detourEdges);
    expect(screen.getByTestId('above-ground-suggest')).toHaveTextContent(
      '地下 約854m／直線 約300m',
    );
    const link = screen.getByRole('link', { name: 'Googleマップで地上の徒歩ルートを見る' });
    const url = new URL(link.getAttribute('href') ?? '');
    expect(url.hostname).toBe('www.google.com');
    expect(url.searchParams.get('origin')).toBe('34.700000,135.500000');
    expect(url.searchParams.get('destination')).toBe('34.700000,135.503280');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not suggest when the underground route is direct', () => {
    renderRoute([...detourEdges, { from: 'a', to: 'b', distanceM: 320 }]);
    expect(screen.queryByTestId('above-ground-suggest')).not.toBeInTheDocument();
  });
});
