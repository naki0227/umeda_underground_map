import { useCallback, useState } from 'react';
import type { NodeId } from '../../domain/types';
import type { Place } from '../map/InteractiveMap';

/** 画面下部に出すシートの種類 */
export type SheetKind = 'none' | 'place' | 'locate' | 'route' | 'spots' | 'favorites' | 'menu';

export interface MapNavigationState {
  sheet: SheetKind;
  currentNodeId: NodeId | null;
  destination: Place | null;
  selectedPlace: Place | null;
  /** 「迷った」から位置確定に戻ったとき true（再測位の説明を出す） */
  lost: boolean;
}

export interface MapNavigationActions {
  /** マップのピンや検索結果から場所を選ぶ → 場所シートを開く */
  selectPlace: (place: Place) => void;
  /** 選択中の場所へ行く。現在地未設定なら先に位置確定シートへ */
  goToSelected: () => void;
  /** 選択中の場所を現在地として設定する */
  setHereSelected: () => void;
  /** 位置確定の完了 */
  confirmLocation: (nodeId: NodeId) => void;
  /** 現在地設定シートを開く */
  openLocate: () => void;
  /** おすすめスポットシートを開く */
  openSpots: () => void;
  /** お気に入りシートを開く */
  openFavorites: () => void;
  /** メニューシートを開く */
  openMenu: () => void;
  /** 迷った: 現在地を破棄して位置確定へ（目的地は保持） */
  markLost: () => void;
  /** 案内を終了して目的地をクリア */
  clearDestination: () => void;
  /** シートを閉じる（案内中なら経路シートへ戻る。経路シート自体を閉じると地図だけになる） */
  closeSheet: () => void;
  /** 地図タブ: シートを閉じて地図だけにする */
  showMap: () => void;
  /** 閉じた経路シートを再表示する */
  openRoute: () => void;
}

export function useMapNavigation(): MapNavigationState & MapNavigationActions {
  const [sheet, setSheet] = useState<SheetKind>('none');
  const [currentNodeId, setCurrentNodeId] = useState<NodeId | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [lost, setLost] = useState(false);

  const selectPlace = useCallback((place: Place) => {
    setSelectedPlace(place);
    setSheet('place');
  }, []);

  const goToSelected = useCallback(() => {
    if (selectedPlace === null) return;
    setDestination(selectedPlace);
    setSelectedPlace(null);
    setSheet(currentNodeId !== null ? 'route' : 'locate');
  }, [selectedPlace, currentNodeId]);

  const setHereSelected = useCallback(() => {
    if (selectedPlace === null) return;
    setCurrentNodeId(selectedPlace.nodeId);
    setSelectedPlace(null);
    setLost(false);
    setSheet(destination !== null ? 'route' : 'none');
  }, [selectedPlace, destination]);

  const confirmLocation = useCallback(
    (nodeId: NodeId) => {
      setCurrentNodeId(nodeId);
      setLost(false);
      setSheet(destination !== null ? 'route' : 'none');
    },
    [destination],
  );

  const openLocate = useCallback(() => setSheet('locate'), []);
  const openSpots = useCallback(() => setSheet('spots'), []);
  const openFavorites = useCallback(() => setSheet('favorites'), []);
  const openMenu = useCallback(() => setSheet('menu'), []);

  const markLost = useCallback(() => {
    setCurrentNodeId(null);
    setLost(true);
    setSheet('locate');
  }, []);

  const clearDestination = useCallback(() => {
    setDestination(null);
    setSheet('none');
  }, []);

  const closeSheet = useCallback(() => {
    setSelectedPlace(null);
    const navigating = destination !== null && currentNodeId !== null;
    setSheet(navigating && sheet !== 'route' ? 'route' : 'none');
  }, [destination, currentNodeId, sheet]);

  /** 地図タブ: 開いているシートと選択を閉じて地図だけにする（案内中でも経路のシートを出さない） */
  const showMap = useCallback(() => {
    setSelectedPlace(null);
    setSheet('none');
  }, []);

  const openRoute = useCallback(() => {
    if (destination !== null && currentNodeId !== null) setSheet('route');
  }, [destination, currentNodeId]);

  return {
    sheet,
    currentNodeId,
    destination,
    selectedPlace,
    lost,
    selectPlace,
    goToSelected,
    setHereSelected,
    confirmLocation,
    openLocate,
    openSpots,
    openFavorites,
    openMenu,
    markLost,
    clearDestination,
    closeSheet,
    showMap,
    openRoute,
  };
}
