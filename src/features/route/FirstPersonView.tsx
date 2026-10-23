import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { RouteStep } from '../../domain/directions';
import type { SideItem, SideView } from '../../domain/sideView';
import { localized } from '../../i18n';

interface Props {
  sideView: SideView;
  step: RouteStep;
  onShowMap: () => void;
  /** 左上に出す小さな地図 */
  miniMap?: ReactNode;
  /** 「1 / 4」のようなステップの番号 */
  stepLabel?: string;
}

/** 正面の消失点（SVG 座標） */
const VP = { x: 180, y: 64 };
/** 壁に看板として出す数（左右それぞれ） */
const SIGNS_PER_SIDE = 3;
/** 一覧に出す数（左右それぞれ） */
const LIST_PER_SIDE = 6;
/** これより近いものは「すぐ」と出す（m） */
const HERE_M = 5;

const ACTION_ICON: Record<RouteStep['action'], string> = {
  straight: '↑',
  left: '↰',
  right: '↱',
  'u-turn': '↩',
  arrive: '◎',
  'floor-change': '⇅',
};

const ACTION_KEY: Record<RouteStep['action'], string> = {
  straight: 'fpv.actionStraight',
  left: 'fpv.actionLeft',
  right: 'fpv.actionRight',
  'u-turn': 'fpv.actionUturn',
  arrive: 'fpv.actionArrive',
  'floor-change': 'fpv.actionFloorChange',
};

/** 区間の中の位置（0 = 手前、1 = 曲がり角）を遠近の奥行きにする */
const depthOf = (distanceM: number, totalM: number) =>
  1 + (Math.min(distanceM, totalM) / Math.max(totalM, 1)) * 5;

/**
 * 案内中の一人称の表示。進む方向を正面にした通路の絵の左右の壁に、近い順に店・出口・脇の通路を
 * 看板で出し、その下に左右の一覧を並べる（左右を見比べながら進めるように）
 */
export function FirstPersonView({ sideView, step, onShowMap, miniMap, stepLabel }: Props) {
  const { t, i18n } = useTranslation();
  const label = (item: SideItem) => {
    const name = localized(item.name, i18n.language);
    if (item.kind === 'exit') return t('fpv.exit', { name });
    if (item.kind === 'passage') return t('fpv.passage', { name });
    return name;
  };

  const signs = (items: SideItem[], side: 'left' | 'right') =>
    items.slice(0, SIGNS_PER_SIDE).map((item, index) => {
      const z = depthOf(item.distanceM, step.distanceM);
      const x = VP.x + (side === 'left' ? -1 : 1) * (150 / z);
      // 同じ側の看板は重ならないよう、近いものほど下にずらす
      const y = VP.y + 46 / z + index * 18;
      const font = Math.max(8, 13 / z);
      // 看板は壁の範囲（通路の中央の手前まで）に収め、入りきらない名前は切る
      const room = (Math.abs(VP.x - x) - 10) * 0.6;
      const maxChars = Math.max(2, Math.floor((room - 10) / font));
      const full = label(item);
      const text = full.length > maxChars ? `${full.slice(0, maxChars - 1)}…` : full;
      const width = Math.min(room, text.length * font + 10);
      return (
        <g key={item.key} className={`fpv-sign ${item.kind}`}>
          <rect
            x={side === 'left' ? x : x - width}
            y={y - font - 4}
            width={width}
            height={font + 8}
            rx={3}
          />
          <text
            x={side === 'left' ? x + 5 : x - 5}
            y={y}
            fontSize={font}
            textAnchor={side === 'left' ? 'start' : 'end'}
          >
            {text}
          </text>
        </g>
      );
    });

  const list = (items: SideItem[], heading: string) => (
    <section className="fpv-column" aria-label={heading}>
      <h3>{heading}</h3>
      {items.length === 0 ? (
        <p className="fpv-none">{t('fpv.nothing')}</p>
      ) : (
        <ul>
          {items.slice(0, LIST_PER_SIDE).map((item) => (
            <li key={item.key} className={item.kind}>
              <span className="fpv-name">{label(item)}</span>
              <span className="fpv-distance">
                {item.distanceM < HERE_M
                  ? t('fpv.here')
                  : t('fpv.itemAhead', { distance: Math.round(item.distanceM) })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="first-person" data-testid="first-person">
      <div className="fpv-header">
        {miniMap}
        <div className="fpv-next">
          {stepLabel !== undefined && <span className="fpv-step">{stepLabel}</span>}
          <span className="fpv-ahead">
            <span className="fpv-ahead-icon" aria-hidden>
              {ACTION_ICON[step.action]}
            </span>
            {t('fpv.ahead', {
              distance: Math.round(step.distanceM),
              action: t(ACTION_KEY[step.action]),
            })}
          </span>
          <button type="button" className="chip" onClick={onShowMap}>
            {t('fpv.showMap')}
          </button>
        </div>
      </div>
      <svg className="fpv-scene" viewBox="0 0 360 200" aria-hidden>
        <polygon
          className="fpv-ceiling"
          points={`0,0 360,0 ${VP.x + 20},${VP.y - 8} ${VP.x - 20},${VP.y - 8}`}
        />
        <polygon
          className="fpv-wall"
          points={`0,0 ${VP.x - 20},${VP.y - 8} ${VP.x - 20},${VP.y + 6} 0,200`}
        />
        <polygon
          className="fpv-wall"
          points={`360,0 ${VP.x + 20},${VP.y - 8} ${VP.x + 20},${VP.y + 6} 360,200`}
        />
        <polygon
          className="fpv-floor"
          points={`0,200 360,200 ${VP.x + 20},${VP.y + 6} ${VP.x - 20},${VP.y + 6}`}
        />
        <text className="fpv-end" x={VP.x} y={VP.y + 4} textAnchor="middle">
          {ACTION_ICON[step.action]}
        </text>
        {signs(sideView.left, 'left')}
        {signs(sideView.right, 'right')}
      </svg>
      <div className="fpv-columns">
        {list(sideView.left, t('fpv.left'))}
        {list(sideView.right, t('fpv.right'))}
      </div>
      {sideView.along.length > 0 && (
        <p className="fpv-along">
          {t('fpv.along')}: {sideView.along.slice(0, LIST_PER_SIDE).map(label).join('・')}
        </p>
      )}
    </div>
  );
}
