import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { umedaMap } from '../../../data/map';
import { buildGraph } from '../../../domain/graph';
import { findRoute } from '../../../domain/route';
import { initI18n } from '../../../i18n';
import { MiniMap } from '../MiniMap';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

const graph = buildGraph(umedaMap);
const ids = [...graph.nodes.keys()];

describe('MiniMap', () => {
  it('draws the corridors, the route and the current step, and opens the map when tapped', async () => {
    const from = ids[0];
    const to = ids[ids.length - 1];
    const route = findRoute(graph, from, to);
    expect(route).not.toBeNull();
    const nodeIds = route?.nodeIds ?? [];
    const onOpenMap = vi.fn();
    render(
      <MiniMap
        graph={graph}
        routeNodeIds={nodeIds}
        stepNodeIds={nodeIds.slice(0, 2)}
        destinationNodeId={to}
        onOpenMap={onOpenMap}
      />,
    );
    const button = screen.getByRole('button', { name: '全体の地図を開く' });
    expect(button.querySelector('.mini-map-corridor')?.getAttribute('d')).toMatch(/^M/);
    // 全体の地図と同じ下地（建物・道路）と地下街の形を、回して描く
    expect(button.querySelector('.basemap-building')).not.toBeNull();
    expect(button.querySelectorAll('.map-zone').length).toBeGreaterThan(0);
    expect(button.querySelector('g')?.getAttribute('transform')).toMatch(/^matrix\(/);
    // 区間の起点（地図の座標 x, -y）から始まる
    const start = graph.nodes.get(nodeIds[0]);
    expect(button.querySelector('.mini-map-step')?.getAttribute('points')).toMatch(
      new RegExp(`^${start?.x},${-(start?.y ?? 0)} `),
    );
    expect(button.querySelector('.mini-map-you')).not.toBeNull();
    await userEvent.setup().click(button);
    expect(onOpenMap).toHaveBeenCalled();
  });

  it('draws nothing when the step has no known start', () => {
    const { container } = render(
      <MiniMap
        graph={graph}
        routeNodeIds={[]}
        stepNodeIds={[]}
        destinationNodeId={ids[0]}
        onOpenMap={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
