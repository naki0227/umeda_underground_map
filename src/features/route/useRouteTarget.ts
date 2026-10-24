import { useMemo } from 'react';
import type { Graph } from '../../domain/graph';
import { minuteOfDayInTokyo } from '../../domain/hours';
import { nearestCandidate } from '../../domain/stations';
import type { LocalizedText, NodeId } from '../../domain/types';
import type { Place } from '../map/InteractiveMap';
import { planRoute } from './planRoute';

/**
 * 案内する行き先のノードと、道案内に出す名前。駅のように候補（改札）がいくつもあるときは、
 * いまいる所から経路が一番短いものを選び、名前はその改札の名前にする（「JR大阪駅 御堂筋口」）
 */
export function useRouteTarget(
  graph: Graph,
  currentNodeId: NodeId | null,
  destination: Place | null,
  options: { avoidStairs: boolean; time: Date },
): { targetNodeId: NodeId | null; targetLabel: LocalizedText | null } {
  const { avoidStairs, time } = options;
  const targetNodeId = useMemo(() => {
    if (destination === null) return null;
    const { nodeId, nodeIds } = destination;
    if (nodeIds === undefined || nodeIds.length < 2 || currentNodeId === null) return nodeId;
    const minute = minuteOfDayInTokyo(time);
    return (
      nearestCandidate(
        nodeIds,
        (id) =>
          planRoute(graph, currentNodeId, id, { avoidStairs, minute })?.route.totalDistanceM ??
          null,
      ) ?? nodeId
    );
  }, [graph, currentNodeId, destination, avoidStairs, time]);

  const targetLabel = useMemo(() => {
    if (destination === null || targetNodeId === null) return null;
    if (destination.nodeIds === undefined) return destination.name;
    return graph.nodes.get(targetNodeId)?.name ?? destination.name;
  }, [graph, destination, targetNodeId]);

  return { targetNodeId, targetLabel };
}
