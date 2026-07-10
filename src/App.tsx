import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TabBar } from './components/TabBar';
import { umedaMap } from './data/map';
import { buildGraph } from './domain/graph';
import { findRoute } from './domain/route';
import { localized } from './i18n';
import { InteractiveMap } from './features/map/InteractiveMap';
import { PlaceSheet } from './features/map/PlaceSheet';
import { MenuSheet } from './features/menu/MenuSheet';
import { useMapNavigation } from './features/navigation/useMapNavigation';
import { LocateScreen } from './features/locate/LocateScreen';
import { RouteScreen } from './features/route/RouteScreen';
import { SearchBar } from './features/search/SearchBar';
import { SpotsSheet } from './features/spots/SpotsSheet';

export default function App() {
  const { t, i18n } = useTranslation();
  const graph = useMemo(() => buildGraph(umedaMap), []);
  const nav = useMapNavigation();
  const [avoidStairs, setAvoidStairs] = useState(false);

  const route = useMemo(() => {
    if (nav.currentNodeId === null || nav.destination === null) return null;
    return findRoute(graph, nav.currentNodeId, nav.destination.nodeId, { avoidStairs });
  }, [graph, nav.currentNodeId, nav.destination, avoidStairs]);

  const currentName = useMemo(() => {
    if (nav.currentNodeId === null) return null;
    const node = graph.nodes.get(nav.currentNodeId);
    return node ? localized(node.name, i18n.language) : null;
  }, [graph, nav.currentNodeId, i18n.language]);

  return (
    <div className="app-map">
      <InteractiveMap
        graph={graph}
        shops={umedaMap.shops}
        pois={umedaMap.pois}
        routeNodeIds={route?.nodeIds}
        currentNodeId={nav.currentNodeId}
        destinationNodeId={nav.destination?.nodeId ?? null}
        onSelectPlace={nav.selectPlace}
      />

      <div className="map-topbar">
        <button type="button" className="current-field" onClick={nav.openLocate}>
          <span className="current-dot" aria-hidden />
          <span className="current-label">{t('mapUi.currentField')}</span>
          <span className={currentName === null ? 'current-value empty' : 'current-value'}>
            {currentName ?? t('mapUi.notSet')}
          </span>
        </button>
        <SearchBar
          graph={graph}
          shops={umedaMap.shops}
          pois={umedaMap.pois}
          onPick={nav.selectPlace}
        />
      </div>

      {nav.sheet === 'none' && nav.currentNodeId === null && (
        <button type="button" className="setup-banner" onClick={nav.openLocate}>
          {t('mapUi.setupPrompt')}
        </button>
      )}

      {nav.sheet === 'place' && nav.selectedPlace !== null && (
        <PlaceSheet
          place={nav.selectedPlace}
          onGo={nav.goToSelected}
          onSetHere={nav.setHereSelected}
          onClose={nav.closeSheet}
        />
      )}

      {nav.sheet === 'locate' && (
        <div className="sheet" role="dialog" aria-label={t('locate.title')}>
          <div className="sheet-header">
            <h2>{t('locate.title')}</h2>
            <button
              type="button"
              className="close"
              aria-label={t('sheet.close')}
              onClick={nav.closeSheet}
            >
              ×
            </button>
          </div>
          <LocateScreen
            graph={graph}
            shops={umedaMap.shops}
            pois={umedaMap.pois}
            onConfirm={nav.confirmLocation}
          />
        </div>
      )}

      {nav.sheet === 'route' && nav.currentNodeId !== null && nav.destination !== null && (
        <div className="sheet" role="dialog" aria-label={t('route.title')}>
          <RouteScreen
            graph={graph}
            fromNodeId={nav.currentNodeId}
            toNodeId={nav.destination.nodeId}
            destinationLabel={nav.destination.name}
            aboveGround={nav.destination.aboveGround}
            avoidStairs={avoidStairs}
            onToggleAvoidStairs={() => setAvoidStairs((v) => !v)}
            onLost={nav.markLost}
            onFinish={nav.clearDestination}
          />
        </div>
      )}

      {nav.sheet === 'spots' && (
        <SpotsSheet
          graph={graph}
          pois={umedaMap.pois}
          currentNodeId={nav.currentNodeId}
          onPick={nav.selectPlace}
          onClose={nav.closeSheet}
        />
      )}

      {nav.sheet === 'menu' && (
        <MenuSheet dataVersion={umedaMap.dataVersion} onClose={nav.closeSheet} />
      )}

      <TabBar
        sheet={nav.sheet}
        onMap={nav.closeSheet}
        onSpots={nav.openSpots}
        onMenu={nav.openMenu}
      />
    </div>
  );
}
