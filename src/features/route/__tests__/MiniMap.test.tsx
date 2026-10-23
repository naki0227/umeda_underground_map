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
    // 区間の起点は中心（66, 66）に来る
    expect(button.querySelector('.mini-map-step')?.getAttribute('points')).toMatch(/^66,66 /);
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
