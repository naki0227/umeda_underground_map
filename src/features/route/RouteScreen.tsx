import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LATE_NIGHT, WALK_SPEED_M_PER_MIN } from '../../app/config';
import { stepPlaceName, type RouteStep } from '../../domain/directions';
import type { Graph } from '../../domain/graph';
import { isWithin, minuteOfDayInTokyo } from '../../domain/hours';
import { nodeFloor, type LocalizedText, type NodeId } from '../../domain/types';
import { localized } from '../../i18n';
import { NextStepCard } from './NextStepCard';
import { RouteNotice } from './RouteNotice';
import { RouteOptions } from './RouteOptions';
import { RouteStepList } from './RouteStepList';
import { StepSensor } from './StepSensor';
import { useRoutePlan, type Access } from './useRoutePlan';
import { useSpeech } from './useSpeech';

export type { Access } from './useRoutePlan';

interface Props {
  graph: Graph;
  fromNodeId: NodeId;
  toNodeId: NodeId;
  /** 目的地の表示名（POI・店名など）。ノード名で良い場合はnull */
  destinationLabel: LocalizedText | null;
  /** 目的地が地上スポットなら、上がる出口を添える */
  aboveGround: boolean;
  /** 段差の扱い（ふつう / 階段を避ける / エレベーターだけ） */
  access?: Access;
  onAccessChange?: (access: Access) => void;
  /** 曲がりの少ない「わかりやすい道」で案内する（既定）。false なら最短 */
  simple?: boolean;
  onSimpleChange?: (simple: boolean) => void;
  /** 雨の予報。地上の近道は勧めず、地下で案内していることを伝える */
  rain?: boolean;
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

/**
 * 道案内のシート。上から「どこへ・あと何分」「いまの手順と 前へ/次へ」「見え方・音声・設定」
 * 「大事なお知らせ 1 つ」。設定・すべての手順はふだん閉じておき、画面を情報で埋めない
 */
export function RouteScreen({
  graph,
  fromNodeId,
  toNodeId,
  destinationLabel,
  aboveGround,
  access = 'normal',
  onAccessChange,
  simple = false,
  onSimpleChange,
  rain = false,
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
  const { result, aboveGroundSuggestion } = useRoutePlan(graph, fromNodeId, toNodeId, {
    access,
    simple,
    minute,
  });
  const [optionsOpen, setOptionsOpen] = useState(false);
  // 一人称 ⇔ 地図を切り替えるとシートの高さが変わる。いまの手順が上に隠れないよう先頭へ戻す
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const sheet = sectionRef.current?.closest('.sheet');
    if (sheet) sheet.scrollTop = 0;
  }, [compact]);

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
        : stepPlaceName(nodeName(step.atNodeId));
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

  const steps = result?.steps ?? [];
  const lastIndex = steps.length - 1;
  const currentIndex = Math.min(Math.max(stepIndex, 0), Math.max(lastIndex, 0));
  const next = steps.length > 0 ? steps[currentIndex] : null;
  /** いまいるフロア = 表示中ステップの起点のフロア */
  const currentFloor = (() => {
    const node = graph.nodes.get(next?.fromNodeId ?? fromNodeId);
    return node ? nodeFloor(node) : 'B1';
  })();
  /** ここから到着までの残り距離 */
  const remainingM = steps.slice(currentIndex).reduce((sum, step) => sum + step.distanceM, 0);
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

  const eta =
    steps.length > 0
      ? t('route.eta', {
          distance: Math.round(remainingM),
          minutes: Math.max(1, Math.round(remainingM / WALK_SPEED_M_PER_MIN)),
        })
      : null;

  return (
    <section className="route-screen" ref={sectionRef}>
      <div className="sheet-header route-header">
        <div className="route-title">
          <h2>{t('route.toName', { name: destinationName })}</h2>
          {(eta !== null || aboveGround) && (
            <p className="route-sub">
              {eta !== null && <span className="total eta">{eta}</span>}
              {aboveGround && (
                <span className="route-exit">
                  {t('route.upAt', { exit: stepPlaceName(nodeName(toNodeId)) })}
                </span>
              )}
            </p>
          )}
        </div>
        <button type="button" className="close" aria-label={t('sheet.close')} onClick={onClose}>
          ×
        </button>
      </div>

      {next !== null && (
        <NextStepCard
          step={next}
          index={currentIndex}
          total={lastIndex + 1}
          actionText={actionText(next)}
          floor={currentFloor}
          hidden={compact}
        />
      )}

      {next !== null && lastIndex > 0 && onStepChange !== undefined && (
        <div className="step-nav sticky-actions">
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

      <RouteNotice
        result={result}
        stepCount={steps.length}
        aboveGroundSuggestion={aboveGroundSuggestion}
        rain={rain}
        lateNight={lateNight}
      />

      {/* 見え方・音声・設定。よく使う切り替えだけをボタンにし、細かい設定は開いたときだけ */}
      <div className="route-tools">
        {onToggleFirstPerson !== undefined && steps.length > 0 && (
          <button type="button" className="tool" onClick={onToggleFirstPerson}>
            <span aria-hidden>{firstPerson ? '🗺' : '👁'}</span>
            {firstPerson ? t('route.viewMap') : t('route.viewFirstPerson')}
          </button>
        )}
        {speech.supported && (
          <button
            type="button"
            className={voiceOn ? 'tool active' : 'tool'}
            aria-pressed={voiceOn}
            onClick={toggleVoice}
          >
            <span aria-hidden>{voiceOn ? '🔊' : '🔈'}</span>
            {t('route.voice')}
          </button>
        )}
        {result !== null && onAccessChange !== undefined && onSimpleChange !== undefined && (
          <button
            type="button"
            className={optionsOpen ? 'tool active' : 'tool'}
            aria-expanded={optionsOpen}
            onClick={() => setOptionsOpen((open) => !open)}
          >
            <span aria-hidden>⚙</span>
            {t('route.options')}
          </button>
        )}
      </div>

      {optionsOpen && result !== null && onAccessChange && onSimpleChange && (
        <RouteOptions
          access={access}
          onAccessChange={onAccessChange}
          simple={simple}
          onSimpleChange={onSimpleChange}
          alternative={result.alternative}
        />
      )}

      {next !== null && lastIndex > 0 && (
        <StepSensor
          stepKey={currentIndex}
          distanceM={next.distanceM}
          hasNext={currentIndex < lastIndex}
          showToggle={optionsOpen}
        />
      )}

      {steps.length > 1 && (
        <RouteStepList
          steps={steps}
          currentIndex={currentIndex}
          actionText={actionText}
          onSelect={onStepChange ? selectStep : undefined}
        />
      )}

      <div className="route-actions">
        <button type="button" className="warn" onClick={onLost}>
          {t('lost.button')}
        </button>
        <button type="button" className="secondary" onClick={onFinish}>
          {t('route.finish')}
        </button>
      </div>
    </section>
  );
}
