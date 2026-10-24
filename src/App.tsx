import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from './components/BottomSheet';
import { TabBar } from './components/TabBar';
import { umedaMap } from './data/map';
import { isUndergroundShop } from './domain/shopLabel';
import { fitGeoTransform, nearestNode } from './domain/geo';
import { buildSteps, stepNodeIds } from './domain/directions';
import { buildGraph } from './domain/graph';
import { minuteOfDayInTokyo } from './domain/hours';
import { localized } from './i18n';
import { InteractiveMap } from './features/map/InteractiveMap';
import { PlaceSheet } from './features/map/PlaceSheet';
import { MenuSheet } from './features/menu/MenuSheet';
import { useMapNavigation } from './features/navigation/useMapNavigation';
import { LocateScreen } from './features/locate/LocateScreen';
import { useInitialGeolocation } from './features/locate/useGeolocation';
import { FirstPersonView } from './features/route/FirstPersonView';
import { MiniMap } from './features/route/MiniMap';
import { planRoute } from './features/route/planRoute';
import { RouteScreen } from './features/route/RouteScreen';
import { buildSceneInput } from './features/route/scene/sceneInput';
import { SearchBar } from './features/search/SearchBar';
import { SpotsSheet } from './features/spots/SpotsSheet';
import { FavoritesSheet } from './features/favorites/FavoritesSheet';
import { useFavorites } from './features/favorites/useFavorites';

/** 地図と現在地の推定に使う地下の店（ビルの地上階の店は検索・目的地だけ） */
const undergroundShops = umedaMap.shops.filter(isUndergroundShop);

/** 画面下のシートが地図を隠すおおよその割合（地図を寄せるときに避ける） */
const SHEET_INSET: Record<string, number> = { none: 0.1, place: 0.38 };
const DEFAULT_SHEET_INSET = 0.6;

/** GPS 位置から最寄りノードまでこれ以上離れていたら「範囲外」とする（m） */
const GPS_AREA_RANGE_M = 600;

export default function App() {
  const { t, i18n } = useTranslation();
  const graph = useMemo(() => buildGraph(umedaMap), []);
  const nav = useMapNavigation();
  const [avoidStairs, setAvoidStairs] = useState(false);
  const favorites = useFavorites();
  const gps = useInitialGeolocation();
  const [gpsNoteDismissed, setGpsNoteDismissed] = useState(false);
  const { acquire: acquireGps } = gps;
  const locateGps = useCallback(() => {
    setGpsNoteDismissed(false);
    acquireGps();
  }, [acquireGps]);
  const geo = useMemo(() => fitGeoTransform(umedaMap.nodes), []);

  /** GPS の大まかな位置をマップ平面に置く。範囲外なら inArea=false */
  const gpsHint = useMemo(() => {
    if (gps.position === null || geo === null) return null;
    const point = geo.toMap(gps.position);
    const nearest = nearestNode(graph.nodes.values(), point);
    const inArea = nearest !== null && nearest.distanceM <= GPS_AREA_RANGE_M;
    return { ...point, accuracyM: gps.position.accuracyM, inArea };
  }, [gps.position, geo, graph]);

  // 経路を決めた時刻（夜に閉まる通路を避ける）。出発地・目的地が変わるたびに今の時刻にし直し、
  // 道案内のシートにも同じ時刻を渡して、地図・一人称・シートを同じ経路にする
  const routeRequest = `${nav.currentNodeId ?? ''}>${nav.destination?.nodeId ?? ''}`;
  const [routeClock, setRouteClock] = useState(() => ({ request: routeRequest, time: new Date() }));
  if (routeClock.request !== routeRequest)
    setRouteClock({ request: routeRequest, time: new Date() });
  const routeTime = routeClock.time;
  const route = useMemo(() => {
    if (nav.currentNodeId === null || nav.destination === null) return null;
    return (
      planRoute(graph, nav.currentNodeId, nav.destination.nodeId, {
        avoidStairs,
        minute: minuteOfDayInTokyo(routeTime),
      })?.route ?? null
    );
  }, [graph, nav.currentNodeId, nav.destination, avoidStairs, routeTime]);

  // 案内中に表示しているステップ。経路が変わったら先頭に戻す
  const routeKey = route?.nodeIds.join('>') ?? '';
  const [stepState, setStepState] = useState({ routeKey: '', index: 0 });
  const stepIndex = stepState.routeKey === routeKey ? stepState.index : 0;
  const setStepIndex = (index: number) => setStepState({ routeKey, index });
  const currentStep = useMemo(() => {
    if (route === null || nav.sheet !== 'route') return null;
    const steps = buildSteps(graph, route);
    const step = steps[Math.min(stepIndex, steps.length - 1)];
    if (!step) return null;
    const nodeIds = stepNodeIds(route, step);
    return { step, nodeIds };
  }, [graph, route, stepIndex, nav.sheet]);
  const focusNodeIds = currentStep?.nodeIds;
  // 一人称の絵の材料（いまの区間の起点から経路に沿って先まで）
  const fpv = useMemo(
    () =>
      currentStep === null || route === null
        ? null
        : buildSceneInput(
            graph,
            undergroundShops,
            route,
            currentStep.step,
            (text) => localized(text, i18n.language),
            t('fpv.goal'),
            (via, floor) => t('fpv.floorSign', { via: t(`facility.${via}`), floor }),
          ),
    [graph, route, currentStep, i18n.language, t],
  );
  // 一人称の表示。新しい経路で案内を始めたときは一人称から
  const [firstPersonState, setFirstPersonState] = useState({ routeKey: '', on: true });
  const firstPerson = firstPersonState.routeKey === routeKey ? firstPersonState.on : true;
  const setFirstPerson = (on: boolean) => setFirstPersonState({ routeKey, on });
  /** 一人称の画面に切り替わっている（地図と検索欄は隠す） */
  const fpvOn = nav.sheet === 'route' && firstPerson && fpv !== null && nav.destination !== null;

  /** 選択中・目的地の地上スポット（地図で最寄り出口までの点線を出す） */
  const linkedPoiIds = useMemo(() => {
    const places = [nav.selectedPlace, nav.destination].filter(
      (place): place is NonNullable<typeof place> => place !== null && place.aboveGround,
    );
    return umedaMap.pois
      .filter((poi) =>
        places.some((place) => place.nodeId === poi.nodeId && place.name.ja === poi.name.ja),
      )
      .map((poi) => poi.id);
  }, [nav.selectedPlace, nav.destination]);

  const currentName = useMemo(() => {
    if (nav.currentNodeId === null) return null;
    const node = graph.nodes.get(nav.currentNodeId);
    return node ? localized(node.name, i18n.language) : null;
  }, [graph, nav.currentNodeId, i18n.language]);

  return (
    <div className={fpvOn ? 'app-map fpv-on' : 'app-map'}>
      <InteractiveMap
        graph={graph}
        shops={undergroundShops}
        pois={umedaMap.pois}
        routeNodeIds={route?.nodeIds}
        focusNodeIds={focusNodeIds}
        currentNodeId={nav.currentNodeId}
        destinationNodeId={nav.destination?.nodeId ?? null}
        selectedNodeId={nav.sheet === 'place' ? (nav.selectedPlace?.nodeId ?? null) : null}
        linkedPoiIds={linkedPoiIds}
        bottomInset={SHEET_INSET[nav.sheet] ?? DEFAULT_SHEET_INSET}
        gpsHint={gpsHint?.inArea ? gpsHint : null}
        onSelectGpsHint={nav.openLocate}
        onLocateGps={locateGps}
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
          favorite={favorites.isFavorite(nav.selectedPlace)}
          onToggleFavorite={() => nav.selectedPlace && favorites.toggle(nav.selectedPlace)}
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
            shops={undergroundShops}
            pois={umedaMap.pois}
            lost={nav.lost}
            initialGps={gpsHint?.inArea ? gps.position : null}
            onConfirm={nav.confirmLocation}
          />
        </BottomSheet>
      )}

      {fpvOn &&
        fpv !== null &&
        currentStep !== null &&
        route !== null &&
        nav.destination !== null && (
          <FirstPersonView
            scene={fpv.scene}
            sideView={fpv.sideView}
            step={currentStep.step}
            miniMap={
              <MiniMap
                graph={graph}
                routeNodeIds={route.nodeIds}
                stepNodeIds={currentStep.nodeIds}
                destinationNodeId={nav.destination.nodeId}
                onOpenMap={() => setFirstPerson(false)}
              />
            }
          />
        )}

      {nav.sheet === 'route' && nav.currentNodeId !== null && nav.destination !== null && (
        <BottomSheet label={t('route.title')} initialSnap={firstPerson ? 'peek' : 'half'}>
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
            now={routeTime}
            firstPerson={firstPerson}
            compact={fpvOn}
            onToggleFirstPerson={() => setFirstPerson(!firstPerson)}
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

      {nav.sheet === 'favorites' && (
        <FavoritesSheet
          favorites={favorites.favorites}
          onPick={nav.selectPlace}
          onRemove={favorites.toggle}
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
        onFavorites={nav.openFavorites}
        onMenu={nav.openMenu}
      />
    </div>
  );
}
