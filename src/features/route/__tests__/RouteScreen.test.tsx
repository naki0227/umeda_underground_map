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

describe('RouteScreen passage hours', () => {
  // ホワイティのエスカレーターは 6:00〜23:30（app/config の TIMED_PASSAGES）。経路はエスカレーターだけ
  const whity = (id: string, x: number, lng: number): MapNode => ({
    ...node(id, x, 0, 34.7, lng),
    area: 'whity',
  });
  const escalatorOnly = buildGraph({
    nodes: [whity('a', 0, 135.5), whity('b', 50, 135.50055)],
    edges: [{ from: 'a', to: 'b', distanceM: 50, attrs: ['escalator'] }],
  });
  const renderAt = (iso: string) =>
    render(
      <RouteScreen
        graph={escalatorOnly}
        fromNodeId="a"
        toNodeId="b"
        destinationLabel={null}
        aboveGround={false}
        onLost={() => {}}
        onFinish={() => {}}
        onClose={() => {}}
        now={new Date(iso)}
      />,
    );

  it('shows no note during the day', () => {
    renderAt('2026-10-20T03:00:00Z'); // 12:00 JST
    expect(screen.queryByTestId('late-night-note')).toBeNull();
    expect(screen.queryByTestId('closed-warning')).toBeNull();
  });

  it('notes late night while the escalator still runs', () => {
    renderAt('2026-10-20T14:10:00Z'); // 23:10 JST
    expect(screen.getByTestId('late-night-note')).toHaveTextContent('夜遅く・早朝は');
    expect(screen.queryByTestId('closed-warning')).toBeNull();
  });

  it('warns only about the closed facility when the route goes through one', () => {
    renderAt('2026-10-20T17:00:00Z'); // 02:00 JST
    // お知らせは 1 つだけ。閉まっている方が大事
    expect(screen.queryByTestId('late-night-note')).toBeNull();
    expect(screen.getByTestId('closed-warning')).toHaveTextContent(
      'いまの時間に閉まっている通路・設備を通る経路しか見つかりませんでした',
    );
    // 経路は出す（現地の案内に従ってもらう）
    expect(screen.getByTestId('next-step')).toBeInTheDocument();
  });
});
