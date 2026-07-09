import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { ReportLink } from './components/ReportLink';
import { umedaMap } from './data/map';
import { buildGraph } from './domain/graph';
import { findRoute } from './domain/route';
import { InteractiveMap } from './features/map/InteractiveMap';
import { PlaceSheet } from './features/map/PlaceSheet';
import { useMapNavigation } from './features/navigation/useMapNavigation';
import { LocateScreen } from './features/locate/LocateScreen';
import { RouteScreen } from './features/route/RouteScreen';
import { SearchBar } from './features/search/SearchBar';

export default function App() {
  const { t } = useTranslation();
  const graph = useMemo(() => buildGraph(umedaMap), []);
  const nav = useMapNavigation();

  const route = useMemo(() => {
    if (nav.currentNodeId === null || nav.destination === null) return null;
    return findRoute(graph, nav.currentNodeId, nav.destination.nodeId);
  }, [graph, nav.currentNodeId, nav.destination]);

  return (
    <div className="app-map">
      <InteractiveMap
        graph={graph}
        shops={umedaMap.shops}
        routeNodeIds={route?.nodeIds}
        currentNodeId={nav.currentNodeId}
        destinationNodeId={nav.destination?.nodeId ?? null}
        onSelectPlace={nav.selectPlace}
      />

      <div className="map-topbar">
        <SearchBar
          graph={graph}
          shops={umedaMap.shops}
          pois={umedaMap.pois}
          onPick={nav.selectPlace}
        />
        <LanguageSwitcher />
      </div>

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
            onLost={nav.markLost}
            onNewSearch={nav.clearDestination}
          />
        </div>
      )}

      {nav.sheet === 'none' && (
        <div className="sheet welcome">
          <h1>{t('app.title')}</h1>
          <p className="hint">{t('app.subtitle')}</p>
          <p className="hint">{t('map.caption')}</p>
          <button type="button" className="primary" onClick={nav.openLocate}>
            {t('mapUi.setLocation')}
          </button>
          <ReportLink />
          <p className="hint">{t('app.dataVersionNote', { version: umedaMap.dataVersion })}</p>
        </div>
      )}
    </div>
  );
}
