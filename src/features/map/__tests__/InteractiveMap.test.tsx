import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { InteractiveMap } from '../InteractiveMap';
import { umedaMap } from '../../../data/map';
import { buildGraph } from '../../../domain/graph';
import { findRoute } from '../../../domain/route';
import { initI18n } from '../../../i18n';

const graph = buildGraph(umedaMap);

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

describe('InteractiveMap', () => {
  it('renders the network and zoom controls', () => {
    render(
      <InteractiveMap
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        onSelectPlace={() => {}}
      />,
    );
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '拡大' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '縮小' })).toBeInTheDocument();
  });

  it('highlights a route and shows markers', () => {
    const route = findRoute(graph, 'wt-c4', 'wt-exit-h28');
    render(
      <InteractiveMap
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        routeNodeIds={route?.nodeIds}
        currentNodeId="wt-c4"
        destinationNodeId="wt-exit-h28"
        onSelectPlace={() => {}}
      />,
    );
    expect(screen.getByTestId('map-route')).toBeInTheDocument();
    expect(screen.getByTestId('map-current')).toHaveTextContent('現在地');
    expect(screen.getByTestId('map-destination')).toHaveTextContent('目的地');
  });

  it('fires onSelectPlace when a pin is clicked', async () => {
    const user = userEvent.setup();
    const onSelectPlace = vi.fn();
    const { container } = render(
      <InteractiveMap
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        onSelectPlace={onSelectPlace}
      />,
    );

    await user.click(container.querySelector('[data-node-id="wt-izumi"]') as Element);
    expect(onSelectPlace).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: 'wt-izumi', aboveGround: false }),
    );

    await user.click(container.querySelector('[data-shop-id="wt-shop-starbucks"]') as Element);
    expect(onSelectPlace).toHaveBeenLastCalledWith(expect.objectContaining({ nodeId: 'wt-c4' }));
  });

  it('renders above-ground buildings and selects a POI on click', async () => {
    const user = userEvent.setup();
    const onSelectPlace = vi.fn();
    const { container } = render(
      <InteractiveMap
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        onSelectPlace={onSelectPlace}
      />,
    );

    const building = container.querySelector('[data-poi-id="poi-hepfive"]');
    expect(building).not.toBeNull();
    await user.click(building as Element);
    expect(onSelectPlace).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: 'wt-exit-h8', aboveGround: true }),
    );
  });
});
