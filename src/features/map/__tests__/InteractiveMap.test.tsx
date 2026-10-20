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

// 地図全体を何度も描き直す（拡大を繰り返す）テストがあるので、遅い環境でも足りる時間にする
describe('InteractiveMap', { timeout: 15_000 }, () => {
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
    const route = findRoute(graph, 'wt-c4', 'ex-M-14');
    render(
      <InteractiveMap
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        routeNodeIds={route?.nodeIds}
        currentNodeId="wt-c4"
        destinationNodeId="ex-M-14"
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

    // 店の点は全体表示では出さないので、拡大してから押す
    expect(container.querySelector('[data-shop-id="wt-shop-starbucks"]')).toBeNull();
    for (let i = 0; i < 3; i += 1) await user.click(screen.getByRole('button', { name: '拡大' }));
    await user.click(container.querySelector('[data-shop-id="wt-shop-starbucks"]') as Element);
    expect(onSelectPlace).toHaveBeenLastCalledWith(expect.objectContaining({ nodeId: 'wt-c4' }));
  });

  it('renders area zones, exit badges and the legend', () => {
    const { container } = render(
      <InteractiveMap
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        onSelectPlace={() => {}}
      />,
    );
    expect(container.querySelector('[data-area="whity"]')).not.toBeNull();
    // 出口はバッジ（出口番号入りチップ）で表示される
    const badge = container.querySelector('.map-exit-badge[data-node-id="ex-H-8"]');
    expect(badge).not.toBeNull();
    expect(badge).toHaveTextContent('H-8');
    expect(screen.getByTestId('map-legend')).toHaveTextContent('地下街');
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
      expect.objectContaining({
        nodeId: umedaMap.pois.find((p) => p.id === 'poi-hepfive')?.nodeId,
        aboveGround: true,
      }),
    );
  });

  it('shows more detail as the map is zoomed in', async () => {
    const user = userEvent.setup();
    render(
      <InteractiveMap
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        onSelectPlace={() => {}}
      />,
    );
    const map = screen.getByTestId('map-view');
    expect(map).toHaveAttribute('data-detail', 'overview');
    expect(screen.queryAllByTestId('map-shop-label')).toHaveLength(0);
    for (let i = 0; i < 6; i += 1) await user.click(screen.getByRole('button', { name: '拡大' }));
    expect(map).toHaveAttribute('data-detail', 'detail');
    // 詳細表示では店名が出る
    expect(screen.getAllByTestId('map-shop-label').length).toBeGreaterThan(0);
  });

  it('draws the route with direction arrows, dims the rest and offers a fit-route button', () => {
    const route = findRoute(graph, 'wt-izumi', 'ex-C-93');
    render(
      <InteractiveMap
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        routeNodeIds={route?.nodeIds}
        onSelectPlace={() => {}}
      />,
    );
    expect(screen.getByTestId('map-view')).toHaveClass('has-route');
    expect(screen.getAllByTestId('map-route-arrow').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '経路全体を表示' })).toBeInTheDocument();
    expect(screen.getByTestId('map-legend')).toHaveTextContent('経路');
  });

  it('marks the selected place and links a selected spot to its exit', () => {
    const hep = umedaMap.pois.find((p) => p.id === 'poi-hepfive');
    render(
      <InteractiveMap
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        selectedNodeId={hep?.nodeId}
        linkedPoiIds={['poi-hepfive']}
        onSelectPlace={() => {}}
      />,
    );
    expect(screen.getByTestId('map-selection')).toBeInTheDocument();
    // 点線は選んだスポットの分だけ
    expect(screen.getAllByTestId('stair-link')).toHaveLength(1);
  });

  it('shows one floor at a time and switches floors with the floor buttons', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <InteractiveMap
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        onSelectPlace={() => {}}
      />,
    );
    const map = screen.getByTestId('map-view');
    expect(map).toHaveAttribute('data-floor', 'B1');
    const exitsOnB1 = container.querySelectorAll('.map-exit-badge').length;
    expect(screen.getByRole('button', { name: 'B1 を表示' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'B2 を表示' }));
    expect(map).toHaveAttribute('data-floor', 'B2');
    // B2 では、B2 につながらない出口は出さず、B1 の通路は薄く残す
    expect(container.querySelectorAll('.map-exit-badge').length).toBeLessThan(exitsOnB1);
    expect(container.querySelectorAll('.map-edge.off-floor').length).toBeGreaterThan(0);
  });

  it('follows the floor of the current step while navigating', () => {
    const b2 = umedaMap.nodes.find((n) => n.floor === 'B2');
    expect(b2).toBeDefined();
    const neighbor = graph.adjacency.get(b2?.id ?? '')?.[0]?.to ?? '';
    render(
      <InteractiveMap
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        focusNodeIds={[b2?.id ?? '', neighbor]}
        onSelectPlace={() => {}}
      />,
    );
    expect(screen.getByTestId('map-view')).toHaveAttribute('data-floor', 'B2');
  });
});
