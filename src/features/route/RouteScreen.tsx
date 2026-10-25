import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ABOVE_GROUND_MIN_STRAIGHT_M,
  ABOVE_GROUND_SUGGEST_RATIO,
  LATE_NIGHT,
  WALK_SPEED_M_PER_MIN,
} from '../../app/config';
import { googleMapsWalkingUrl, shouldSuggestAboveGround } from '../../domain/aboveGround';
import { buildSteps, type RouteStep } from '../../domain/directions';
import { fitGeoTransform, type LatLng } from '../../domain/geo';
import type { Graph } from '../../domain/graph';
import { isWithin, minuteOfDayInTokyo } from '../../domain/hours';
import { planRoute } from './planRoute';
import { routeUsesStairs } from '../../domain/route';
import { nodeFloor, type LocalizedText, type NodeId } from '../../domain/types';
import { localized } from '../../i18n';
import { useSpeech } from './useSpeech';

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
  /** 経路シートを閉じて地図を見る（案内は継続） */
  onClose: () => void;
  /** いま表示しているステップ（0 始まり）。範囲外は端に丸める */
  stepIndex?: number;
  /** 「次へ」「前へ」・一覧のタップでステップを選んだとき */
  onStepChange?: (index: number) => void;
  /** いまの時刻（テスト用）。省略時はシートを開いた時刻 */
  now?: Date;
  /** 一人称の表示を出しているか。未指定なら切り替えボタンを出さない */
  firstPerson?: boolean;
  /** 一人称の画面の下に出すとき。次の動きは一人称の画面が出すので、操作だけにする */
  compact?: boolean;
  onToggleFirstPerson?: () => void;
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
  onClose,
  stepIndex = 0,
  onStepChange,
  now,
  firstPerson,
  compact = false,
  onToggleFirstPerson,
}: Props) {
  const { t, i18n } = useTranslation();
  const [openedAt] = useState(() => new Date());
  const minute = minuteOfDayInTokyo(now ?? openedAt);
  const lateNight = isWithin(minute, LATE_NIGHT);

  const result = useMemo(() => {
    const planned = planRoute(graph, fromNodeId, toNodeId, { avoidStairs, minute });
    if (planned === null) return null;
    const { route, throughClosed } = planned;
    return {
      route,
      steps: buildSteps(graph, route),
      usesStairs: routeUsesStairs(graph, route),
      throughClosed,
    };
  }, [graph, fromNodeId, toNodeId, avoidStairs, minute]);

  /** 地上の方が近い可能性があるときの比較値と Google マップのリンク */
  const aboveGroundSuggestion = useMemo(() => {
    if (result === null) return null;
    const from = graph.nodes.get(fromNodeId);
    const to = graph.nodes.get(toNodeId);
    if (!from || !to) return null;
    const straightM = Math.hypot(to.x - from.x, to.y - from.y);
    const undergroundM = result.route.totalDistanceM;
    const suggest = shouldSuggestAboveGround({
      undergroundM,
      straightM,
      ratio: ABOVE_GROUND_SUGGEST_RATIO,
      minStraightM: ABOVE_GROUND_MIN_STRAIGHT_M,
    });
    if (!suggest) return null;
    const transform = fitGeoTransform([...graph.nodes.values()]);
    const geoOf = (node: typeof from): LatLng | null =>
      node.lat !== undefined && node.lng !== undefined
        ? { lat: node.lat, lng: node.lng }
        : (transform?.toGeo(node) ?? null);
    const origin = geoOf(from);
    const destination = geoOf(to);
    if (origin === null || destination === null) return null;
    return {
      straightM: Math.round(straightM),
      undergroundM: Math.round(undergroundM),
      url: googleMapsWalkingUrl(origin, destination),
    };
  }, [graph, fromNodeId, toNodeId, result]);

  const nodeName = (nodeId: NodeId) => {
    const node = graph.nodes.get(nodeId);
    return node ? localized(node.name, i18n.language) : nodeId;
  };

  const destinationName =
    destinationLabel !== null ? localized(destinationLabel, i18n.language) : nodeName(toNodeId);

  const actionText = (step: RouteStep) => {
    // 最終到着は目的地の表示名（店名など）で伝える。地上スポットは出口名のまま
    const name =
      step.action === 'arrive' && step.atNodeId === toNodeId && !aboveGround
        ? destinationName
        : nodeName(step.atNodeId);
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

  const lastIndex = result !== null ? result.steps.length - 1 : -1;
  const currentIndex = Math.min(Math.max(stepIndex, 0), Math.max(lastIndex, 0));
  const next = result !== null && result.steps.length > 0 ? result.steps[currentIndex] : null;
  /** いまいるフロア = 表示中ステップの起点のフロア */
  const currentFloor = (() => {
    const node = graph.nodes.get(next?.fromNodeId ?? fromNodeId);
    return node ? nodeFloor(node) : 'B1';
  })();
  /** ここから到着までの残り距離 */
  const remainingM =
    result !== null
      ? result.steps.slice(currentIndex).reduce((sum, step) => sum + step.distanceM, 0)
      : 0;
  const selectStep = (index: number) => onStepChange?.(index);

  // 音声案内: オンの間、表示中の「次の動作」を読み上げる（ステップが変わるたび）
  const speech = useSpeech();
  const [voiceOn, setVoiceOn] = useState(false);
  const spokenText =
    next === null
      ? null
      : t('route.spokenStep', {
          go: t('route.stepGo', { distance: next.distanceM }),
          action: actionText(next),
        });
  useEffect(() => {
    if (voiceOn && spokenText !== null) speech.speak(spokenText, i18n.language);
  }, [voiceOn, spokenText, speech, i18n.language]);
  const toggleVoice = () => {
    if (voiceOn) speech.cancel();
    setVoiceOn((on) => !on);
  };

  return (
    <section>
      <div className="sheet-header">
        <h2>{t('route.title')}</h2>
        <button
          type="button"
          className={avoidStairs ? 'chip active' : 'chip'}
          aria-pressed={avoidStairs}
          onClick={onToggleAvoidStairs}
        >
          {t('route.avoidStairs')}
        </button>
        {onToggleFirstPerson !== undefined && (result?.steps.length ?? 0) > 0 && (
          <button
            type="button"
            className={firstPerson ? 'chip active' : 'chip'}
            aria-pressed={firstPerson === true}
            onClick={onToggleFirstPerson}
          >
            {t('fpv.showFirstPerson')}
          </button>
        )}
        {speech.supported && (
          <button
            type="button"
            className={voiceOn ? 'chip active' : 'chip'}
            aria-pressed={voiceOn}
            onClick={toggleVoice}
          >
            {t('route.voice')}
          </button>
        )}
        <button type="button" className="close" aria-label={t('sheet.close')} onClick={onClose}>
          ×
        </button>
      </div>
      <p className={compact ? 'description visually-hidden' : 'description'}>
        {t('route.from', { name: nodeName(fromNodeId) })}
        <br />
        {t('route.to', { name: destinationName })}
      </p>

      {aboveGround && destinationLabel !== null && (
        <p className={compact ? 'hint above-ground visually-hidden' : 'hint above-ground'}>
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
          {result.steps.length === 0 && <p className="hint ok">{t('route.alreadyHere')}</p>}
          {avoidStairs && result.usesStairs && (
            <p className="hint warn" data-testid="stairs-warning">
              {t('route.usesStairs')}
            </p>
          )}
          {result.throughClosed && (
            <p className="hint warn" data-testid="closed-warning">
              {t('route.throughClosed')}
            </p>
          )}
          {lateNight && (
            <p className="hint" data-testid="late-night-note">
              {t('route.lateNight')}
            </p>
          )}
          {next !== null && (
            <div
              className={compact ? 'next-step-card visually-hidden' : 'next-step-card'}
              data-testid="next-step"
              aria-live="polite"
            >
              <span className="step-counter">
                {t('route.stepCounter', { current: currentIndex + 1, total: lastIndex + 1 })}
              </span>
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
          {next !== null && lastIndex > 0 && onStepChange !== undefined && (
            <div className="step-nav">
              <button
                type="button"
                className="secondary"
                disabled={currentIndex === 0}
                onClick={() => selectStep(currentIndex - 1)}
              >
                {t('route.prevStep')}
              </button>
              <button
                type="button"
                className="primary"
                disabled={currentIndex === lastIndex}
                onClick={() => selectStep(currentIndex + 1)}
              >
                {t('route.nextStep')}
              </button>
            </div>
          )}

          {aboveGroundSuggestion !== null && (
            <div
              className={compact ? 'above-ground-suggest visually-hidden' : 'above-ground-suggest'}
              data-testid="above-ground-suggest"
            >
              <p>
                {t('route.aboveGroundSuggest', {
                  underground: aboveGroundSuggestion.undergroundM,
                  straight: aboveGroundSuggestion.straightM,
                })}
              </p>
              <a href={aboveGroundSuggestion.url} target="_blank" rel="noopener noreferrer">
                {t('route.openGoogleMaps')}
              </a>
              <p className="hint">{t('route.aboveGroundReason')}</p>
            </div>
          )}

          {result.steps.length > 0 && (
            <p className="total eta">
              {t('route.eta', {
                distance: Math.round(remainingM),
                minutes: Math.max(1, Math.round(remainingM / WALK_SPEED_M_PER_MIN)),
              })}
            </p>
          )}

          <ol className="steps">
            {result.steps.map((step, index) => (
              <li
                key={`${step.atNodeId}-${index}`}
                className={index === currentIndex ? 'current' : index < currentIndex ? 'done' : ''}
                aria-current={index === currentIndex ? 'step' : undefined}
              >
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
