import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { WALK_SPEED_M_PER_MIN } from '../../app/config';
import { buildSteps, type RouteStep } from '../../domain/directions';
import type { Graph } from '../../domain/graph';
import { findRoute } from '../../domain/route';
import { nodeFloor, type LocalizedText, type NodeId } from '../../domain/types';
import { localized } from '../../i18n';

interface Props {
  graph: Graph;
  fromNodeId: NodeId;
  toNodeId: NodeId;
  /** 目的地の表示名（POI・店名など）。ノード名で良い場合はnull */
  destinationLabel: LocalizedText | null;
  /** 目的地が地上スポットなら出口ヒントを出す */
  aboveGround: boolean;
  avoidStairs: boolean;
  onToggleAvoidStairs: () => void;
  onLost: () => void;
  onFinish: () => void;
}

/** ステップの種類をアイコン1文字で表す */
function stepIcon(step: RouteStep): string {
  switch (step.action) {
    case 'left':
      return '←';
    case 'right':
      return '→';
    case 'u-turn':
      return '↩';
    case 'floor-change':
      return step.floorChange?.up ? '⤴' : '⤵';
    default:
      return '◎';
  }
}

export function RouteScreen({
  graph,
  fromNodeId,
  toNodeId,
  destinationLabel,
  aboveGround,
  avoidStairs,
  onToggleAvoidStairs,
  onLost,
  onFinish,
}: Props) {
  const { t, i18n } = useTranslation();

  const result = useMemo(() => {
    const route = findRoute(graph, fromNodeId, toNodeId, { avoidStairs });
    if (route === null) return null;
    return { route, steps: buildSteps(graph, route) };
  }, [graph, fromNodeId, toNodeId, avoidStairs]);

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
      case 'floor-change': {
        const change = step.floorChange;
        if (change === undefined) return t('route.actionArrive', { name });
        return t(change.up ? 'route.actionFloorUp' : 'route.actionFloorDown', {
          name,
          via: t(`facility.${change.via}`),
          floor: change.to,
        });
      }
      case 'straight':
      case 'arrive':
        return t('route.actionArrive', { name });
    }
  };

  const currentFloor = (() => {
    const node = graph.nodes.get(fromNodeId);
    return node ? nodeFloor(node) : 'B1';
  })();

  const destinationName =
    destinationLabel !== null ? localized(destinationLabel, i18n.language) : nodeName(toNodeId);

  const next = result !== null && result.steps.length > 0 ? result.steps[0] : null;

  return (
    <section>
      <div className="sheet-header">
        <h2>{t('route.title')}</h2>
        <button
          type="button"
          className={avoidStairs ? 'chip active' : 'chip'}
          onClick={onToggleAvoidStairs}
        >
          {t('route.avoidStairs')}
        </button>
      </div>
      <p className="description">
        {t('route.from', { name: nodeName(fromNodeId) })}
        <br />
        {t('route.to', { name: destinationName })}
      </p>

      {aboveGround && destinationLabel !== null && (
        <p className="hint above-ground">
          {t('route.aboveGroundHint', {
            name: destinationName,
            exit: nodeName(toNodeId),
          })}
        </p>
      )}

      {result === null ? (
        <p className="hint warn">{t('route.notFound')}</p>
      ) : (
        <>
          {next !== null && (
            <div className="next-step-card" data-testid="next-step">
              <span className="next-icon" aria-hidden>
                {stepIcon(next)}
              </span>
              <div className="next-body">
                <span className="next-distance">
                  {t('route.stepGo', { distance: next.distanceM })}
                </span>
                <span className="next-action">{actionText(next)}</span>
              </div>
              <div className="next-floors">
                <span className="floor-badge">{t('route.floorNow', { floor: currentFloor })}</span>
                {next.action === 'floor-change' && next.floorChange !== undefined && (
                  <span className="floor-badge to">
                    {t('route.floorNext', { floor: next.floorChange.to })}
                  </span>
                )}
              </div>
            </div>
          )}

          <p className="total eta">
            {t('route.eta', {
              distance: Math.round(result.route.totalDistanceM),
              minutes: Math.max(1, Math.round(result.route.totalDistanceM / WALK_SPEED_M_PER_MIN)),
            })}
          </p>

          <ol className="steps">
            {result.steps.map((step, index) => (
              <li key={`${step.atNodeId}-${index}`} className={index === 0 ? 'current' : ''}>
                <span className="step-icon" aria-hidden>
                  {stepIcon(step)}
                </span>
                <span className="step-body">
                  {step.distanceM > 0 && (
                    <span className="step-distance">
                      {t('route.stepGo', { distance: step.distanceM })}
                    </span>
                  )}
                  <span className="step-action">{actionText(step)}</span>
                </span>
                {step.action === 'floor-change' && step.floorChange !== undefined && (
                  <span className="floor-move">
                    {step.floorChange.from}→{step.floorChange.to}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="route-actions">
        <button type="button" className="warn" onClick={onLost}>
          {t('lost.button')}
        </button>
        <button type="button" className="secondary" onClick={onFinish}>
          {t('route.finish')}
        </button>
      </div>
      <p className="hint warn">{t('route.estimateNote')}</p>
    </section>
  );
}
