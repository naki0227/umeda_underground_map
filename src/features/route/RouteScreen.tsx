import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { WALK_SPEED_M_PER_MIN } from '../../app/config';
import { MapView } from '../../components/MapView';
import { buildSteps, type RouteStep } from '../../domain/directions';
import type { Graph } from '../../domain/graph';
import { findRoute } from '../../domain/route';
import type { NodeId } from '../../domain/types';
import { localized } from '../../i18n';

interface Props {
  graph: Graph;
  fromNodeId: NodeId;
  toNodeId: NodeId;
  onLost: () => void;
  onNewSearch: () => void;
}

export function RouteScreen({ graph, fromNodeId, toNodeId, onLost, onNewSearch }: Props) {
  const { t, i18n } = useTranslation();

  const result = useMemo(() => {
    const route = findRoute(graph, fromNodeId, toNodeId);
    if (route === null) return null;
    return { route, steps: buildSteps(graph, route) };
  }, [graph, fromNodeId, toNodeId]);

  const nodeName = (nodeId: NodeId) => {
    const node = graph.nodes.get(nodeId);
    return node ? localized(node.name, i18n.language) : nodeId;
  };

  const actionText = (step: RouteStep) => {
    const name = nodeName(step.atNodeId);
    switch (step.action) {
      case 'left':
        return t('route.actionLeft', { name });
      case 'right':
        return t('route.actionRight', { name });
      case 'u-turn':
        return t('route.actionUturn', { name });
      case 'straight':
      case 'arrive':
        return t('route.actionArrive', { name });
    }
  };

  return (
    <section className="screen">
      <h2>{t('route.title')}</h2>
      <p className="description">
        {t('route.from', { name: nodeName(fromNodeId) })}
        <br />
        {t('route.to', { name: nodeName(toNodeId) })}
      </p>

      <MapView
        graph={graph}
        routeNodeIds={result?.route.nodeIds}
        currentNodeId={fromNodeId}
        destinationNodeId={toNodeId}
      />

      {result === null ? (
        <p className="hint warn">{t('route.notFound')}</p>
      ) : (
        <>
          <p className="total">
            {t('route.total', {
              distance: Math.round(result.route.totalDistanceM),
              minutes: Math.max(1, Math.round(result.route.totalDistanceM / WALK_SPEED_M_PER_MIN)),
            })}
          </p>
          <ol className="steps">
            {result.steps.map((step, index) => (
              <li key={`${step.atNodeId}-${index}`}>
                <span className="step-distance">
                  {t('route.stepGo', { distance: step.distanceM })}
                </span>
                <span className="step-action">{actionText(step)}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="route-actions">
        <button type="button" className="warn" onClick={onLost}>
          {t('lost.button')}
        </button>
        <button type="button" className="secondary" onClick={onNewSearch}>
          {t('route.newSearch')}
        </button>
      </div>
      <p className="hint">{t('lost.description')}</p>
    </section>
  );
}
