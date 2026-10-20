import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from './components/BottomSheet';
import { TabBar } from './components/TabBar';
import { umedaMap } from './data/map';
import { fitGeoTransform, nearestNode } from './domain/geo';
import { buildSteps, stepNodeIds } from './domain/directions';
import { buildGraph } from './domain/graph';
import { findRoute } from './domain/route';
import { localized } from './i18n';
import { InteractiveMap } from './features/map/InteractiveMap';
import { PlaceSheet } from './features/map/PlaceSheet';
import { MenuSheet } from './features/menu/MenuSheet';
import { useMapNavigation } from './features/navigation/useMapNavigation';
import { LocateScreen } from './features/locate/LocateScreen';
import { useInitialGeolocation } from './features/locate/useGeolocation';
import { RouteScreen } from './features/route/RouteScreen';
import { SearchBar } from './features/search/SearchBar';
import { SpotsSheet } from './features/spots/SpotsSheet';

/** GPS 位置から最寄りノードまでこれ以上離れていたら「範囲外」とする（m） */
const GPS_AREA_RANGE_M = 600;

export default function App() {
  const { t, i18n } = useTranslation();
  const graph = useMemo(() => buildGraph(umedaMap), []);
  const nav = useMapNavigation();
  const [avoidStairs, setAvoidStairs] = useState(false);
  const gps = useInitialGeolocation();
  const [gpsNoteDismissed, setGpsNoteDismissed] = useState(false);
  const geo = useMemo(() => fitGeoTransform(umedaMap.nodes), []);

  /** GPS の大まかな位置をマップ平面に置く。範囲外なら inArea=false */
  const gpsHint = useMemo(() => {
    if (gps.position === null || geo === null) return null;
    const point = geo.toMap(gps.position);
    const nearest = nearestNode(graph.nodes.values(), point);
    const inArea = nearest !== null && nearest.distanceM <= GPS_AREA_RANGE_M;
    return { ...point, accuracyM: gps.position.accuracyM, inArea };
  }, [gps.position, geo, graph]);

  const route = useMemo(() => {
    if (nav.currentNodeId === null || nav.destination === null) return null;
    return findRoute(graph, nav.currentNodeId, nav.destination.nodeId, { avoidStairs });
  }, [graph, nav.currentNodeId, nav.destination, avoidStairs]);

  // 案内中に表示しているステップ。経路が変わったら先頭に戻す
  const routeKey = route?.nodeIds.join('>') ?? '';
  const [stepState, setStepState] = useState({ routeKey: '', index: 0 });
  const stepIndex = stepState.routeKey === routeKey ? stepState.index : 0;
  const setStepIndex = (index: number) => setStepState({ routeKey, index });
  const focusNodeIds = useMemo(() => {
    if (route === null || nav.sheet !== 'route') return undefined;
    const steps = buildSteps(graph, route);
    const step = steps[Math.min(stepIndex, steps.length - 1)];
    return step ? stepNodeIds(route, step) : undefined;
  }, [graph, route, stepIndex, nav.sheet]);

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
        focusNodeIds={focusNodeIds}
        currentNodeId={nav.currentNodeId}
        destinationNodeId={nav.destination?.nodeId ?? null}
        gpsHint={gpsHint?.inArea ? gpsHint : null}
        onSelectGpsHint={nav.openLocate}
        onLocateGps={() => {
          setGpsNoteDismissed(false);
          gps.acquire();
        }}
        gpsBusy={gps.status === 'loading'}
        onSelectPlace={nav.selectPlace}
      />

      {gpsHint !== null && !gpsHint.inArea && !gpsNoteDismissed && (
        <button
          type="button"
          className="gps-note"
          role="status"
          onClick={() => setGpsNoteDismissed(true)}
        >
          {t('map.gpsOutOfArea')}
        </button>
      )}

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

      {nav.sheet === 'none' && nav.currentNodeId !== null && nav.destination !== null && (
        <button type="button" className="setup-banner" onClick={nav.openRoute}>
          {t('mapUi.resumeRoute')}
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
        <BottomSheet label={t('locate.title')} initialSnap="full">
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
            lost={nav.lost}
            initialGps={gpsHint?.inArea ? gps.position : null}
            onConfirm={nav.confirmLocation}
          />
        </BottomSheet>
      )}

      {nav.sheet === 'route' && nav.currentNodeId !== null && nav.destination !== null && (
        <BottomSheet label={t('route.title')}>
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
            onClose={nav.closeSheet}
            stepIndex={stepIndex}
            onStepChange={setStepIndex}
          />
        </BottomSheet>
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
