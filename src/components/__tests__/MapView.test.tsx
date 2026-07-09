import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { MapView } from '../MapView';
import { umedaMap } from '../../data/map';
import { buildGraph } from '../../domain/graph';
import { findRoute } from '../../domain/route';
import { initI18n } from '../../i18n';

const graph = buildGraph(umedaMap);

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

describe('MapView', () => {
  it('renders the corridor network as svg', () => {
    render(<MapView graph={graph} />);
    const svg = screen.getByTestId('map-view');
    expect(svg).toBeInTheDocument();
    // 経路・マーカーなしでは描画されない
    expect(screen.queryByTestId('map-route')).not.toBeInTheDocument();
    expect(screen.queryByTestId('map-current')).not.toBeInTheDocument();
  });

  it('highlights the route and shows markers', () => {
    const route = findRoute(graph, 'wt-c4', 'wt-exit-h28');
    expect(route).not.toBeNull();
    render(
      <MapView
        graph={graph}
        routeNodeIds={route?.nodeIds}
        currentNodeId="wt-c4"
        destinationNodeId="wt-exit-h28"
      />,
    );
    expect(screen.getByTestId('map-route')).toBeInTheDocument();
    expect(screen.getByTestId('map-current')).toHaveTextContent('現在地');
    expect(screen.getByTestId('map-destination')).toHaveTextContent('目的地');
  });

  it('marks candidate nodes', () => {
    const { container } = render(<MapView graph={graph} candidateNodeIds={['wt-c4', 'wt-c3']} />);
    expect(container.querySelectorAll('.map-node.candidate')).toHaveLength(2);
  });
});
