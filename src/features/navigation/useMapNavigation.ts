import { useCallback, useState } from 'react';
import type { NodeId } from '../../domain/types';
import type { Place } from '../map/InteractiveMap';

/** 画面下部に出すシートの種類 */
export type SheetKind = 'none' | 'place' | 'locate' | 'route' | 'spots' | 'menu';

export interface MapNavigationState {
  sheet: SheetKind;
  currentNodeId: NodeId | null;
  destination: Place | null;
  selectedPlace: Place | null;
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
  /** メニューシートを開く */
  openMenu: () => void;
  /** 迷った: 現在地を破棄して位置確定へ（目的地は保持） */
  markLost: () => void;
  /** 案内を終了して目的地をクリア */
  clearDestination: () => void;
  /** シートを閉じる（案内中なら経路シートへ戻る） */
  closeSheet: () => void;
}

export function useMapNavigation(): MapNavigationState & MapNavigationActions {
  const [sheet, setSheet] = useState<SheetKind>('none');
  const [currentNodeId, setCurrentNodeId] = useState<NodeId | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const selectPlace = useCallback((place: Place) => {
    setSelectedPlace(place);
    setSheet('place');
  }, []);

  const goToSelected = useCallback(() => {
    setSelectedPlace((place) => {
      if (place !== null) {
        setDestination(place);
        setSheet(currentNodeId !== null ? 'route' : 'locate');
      }
      return null;
    });
  }, [currentNodeId]);

  const setHereSelected = useCallback(() => {
    setSelectedPlace((place) => {
      if (place !== null) {
        setCurrentNodeId(place.nodeId);
        setDestination((dest) => {
          setSheet(dest !== null ? 'route' : 'none');
          return dest;
        });
      }
      return null;
    });
  }, []);

  const confirmLocation = useCallback(
    (nodeId: NodeId) => {
      setCurrentNodeId(nodeId);
      setSheet(destination !== null ? 'route' : 'none');
    },
    [destination],
  );

  const openLocate = useCallback(() => setSheet('locate'), []);
  const openSpots = useCallback(() => setSheet('spots'), []);
  const openMenu = useCallback(() => setSheet('menu'), []);

  const markLost = useCallback(() => {
    setCurrentNodeId(null);
    setSheet('locate');
  }, []);

  const clearDestination = useCallback(() => {
    setDestination(null);
    setSheet('none');
  }, []);

  const closeSheet = useCallback(() => {
    setSelectedPlace(null);
    setSheet(destination !== null && currentNodeId !== null ? 'route' : 'none');
  }, [destination, currentNodeId]);

  return {
    sheet,
    currentNodeId,
    destination,
    selectedPlace,
    selectPlace,
    goToSelected,
    setHereSelected,
    confirmLocation,
    openLocate,
    openSpots,
    openMenu,
    markLost,
    clearDestination,
    closeSheet,
  };
}
