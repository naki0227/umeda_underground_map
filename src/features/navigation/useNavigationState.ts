import { useCallback, useState } from 'react';
import type { LocalizedText, NodeId } from '../../domain/types';

export type Phase = 'locate' | 'destination' | 'route';

export interface NavigationState {
  phase: Phase;
  currentNodeId: NodeId | null;
  destinationNodeId: NodeId | null;
  /** 地上スポットを目的地に選んだ場合の表示名（例: HEP FIVE）。地下ノード直接選択ならnull */
  destinationLabel: LocalizedText | null;
}

export interface NavigationActions {
  /** 位置確定。目的地が既にあれば案内を再開する（迷った後の復帰）。 */
  confirmLocation: (nodeId: NodeId) => void;
  chooseDestination: (nodeId: NodeId, label?: LocalizedText) => void;
  /** 迷ったボタン: 目的地は保持したまま位置確定へ戻る */
  markLost: () => void;
  /** 別の目的地を選び直す */
  newSearch: () => void;
}

export function useNavigationState(): NavigationState & NavigationActions {
  const [phase, setPhase] = useState<Phase>('locate');
  const [currentNodeId, setCurrentNodeId] = useState<NodeId | null>(null);
  const [destinationNodeId, setDestinationNodeId] = useState<NodeId | null>(null);
  const [destinationLabel, setDestinationLabel] = useState<LocalizedText | null>(null);

  const confirmLocation = useCallback(
    (nodeId: NodeId) => {
      setCurrentNodeId(nodeId);
      setPhase(destinationNodeId !== null ? 'route' : 'destination');
    },
    [destinationNodeId],
  );

  const chooseDestination = useCallback((nodeId: NodeId, label?: LocalizedText) => {
    setDestinationNodeId(nodeId);
    setDestinationLabel(label ?? null);
    setPhase('route');
  }, []);

  const markLost = useCallback(() => {
    setCurrentNodeId(null);
    setPhase('locate');
  }, []);

  const newSearch = useCallback(() => {
    setDestinationNodeId(null);
    setDestinationLabel(null);
    setPhase('destination');
  }, []);

  return {
    phase,
    currentNodeId,
    destinationNodeId,
    destinationLabel,
    confirmLocation,
    chooseDestination,
    markLost,
    newSearch,
  };
}
