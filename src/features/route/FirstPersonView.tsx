import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { RouteStep } from '../../domain/directions';
import type { SideItem, SideView } from '../../domain/sideView';
import { localized } from '../../i18n';
import { placeLabels, textWidthPx, type LabelBox } from '../map/labelLayout';
import { buildScene, type SceneInput, type SceneLabel } from './scene/corridorScene';

interface Props {
  scene: SceneInput;
  /** いまの区間の左右の一覧（画面には絵で出し、読み上げ用に文字でも持つ） */
  sideView: SideView;
  step: RouteStep;
  /** 左上に出す小さな地図 */
  miniMap?: ReactNode;
}

const ACTION_ICON: Record<RouteStep['action'], string> = {
  straight: '↑',
  left: '↰',
  right: '↱',
  'u-turn': '↩',
  arrive: '◎',
  'floor-change': '⇅',
};

/** 単独で出すときは文の頭なので大文字に（英語の "turn right" → "Turn right"） */
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const ACTION_KEY: Record<RouteStep['action'], string> = {
  straight: 'fpv.actionStraight',
  left: 'fpv.actionLeft',
  right: 'fpv.actionRight',
  'u-turn': 'fpv.actionUturn',
  arrive: 'fpv.actionArrive',
  'floor-change': 'fpv.actionFloorChange',
};

/** 吹き出しに出す名前の長さ */
const NAME_MAX_CHARS = 8;
const PAD_PX = 6;
const TAIL_PX = 6;

const pillText = (label: SceneLabel) => {
  // 階の移動の札は短い決まり文句なので切らない
  const max = label.kind === 'floor' ? 16 : NAME_MAX_CHARS;
  const text = label.text.length > max ? `${label.text.slice(0, max - 1)}…` : label.text;
  return text === '' ? label.icon : `${label.icon} ${text}`;
};

/** 吹き出しの大きさ（SVG 座標）。曲がる所の矢印は大きく */
const pillBox = (label: SceneLabel): LabelBox => {
  const font = label.kind === 'turn' ? 30 : label.fontPx;
  const width = textWidthPx(pillText(label), font) + PAD_PX * 2;
  const height = font + PAD_PX * 1.4;
  const priority = (label.kind === 'goal' || label.kind === 'floor' ? 200 : 100) - label.depthM;
  return {
    id: label.key,
    x: label.x - width / 2,
    y: label.y - TAIL_PX - height,
    width,
    height,
    priority,
  };
};

/**
 * 案内中の一人称の画面。経路に沿った通路（曲がり角の先も）を描き、壁には店ごとの店先を
 * 種類の色で並べ、店名はアイコンつきの吹き出しで出す。左上に小さな地図、その右に次の動き
 */
const VIEWPOINT_KEY = 'umeda-navi.viewpoint';
type Viewpoint = 'eye' | 'behind';

/** 前回選んだ視点（端末内）。保存できない環境では一人称 */
function loadViewpoint(): Viewpoint {
  try {
    return globalThis.localStorage?.getItem(VIEWPOINT_KEY) === 'behind' ? 'behind' : 'eye';
  } catch {
    return 'eye';
  }
}

function saveViewpoint(viewpoint: Viewpoint): void {
  try {
    globalThis.localStorage?.setItem(VIEWPOINT_KEY, viewpoint);
  } catch {
    // 保存できなくても、この案内の間は切り替わる
  }
}

export function FirstPersonView({ scene, sideView, step, miniMap }: Props) {
  const { t, i18n } = useTranslation();
  const [viewpoint, setViewpoint] = useState(loadViewpoint);
  const drawing = useMemo(() => buildScene({ ...scene, viewpoint }), [scene, viewpoint]);
  const toggleViewpoint = () => {
    const next = viewpoint === 'eye' ? 'behind' : 'eye';
    setViewpoint(next);
    saveViewpoint(next);
  };
  const pills = useMemo(() => {
    // 曲がる所の矢印は店名を押しのけないよう、重なりの判定に入れず一番下に描く
    const boxes = drawing.labels.map(pillBox);
    const shown = placeLabels(boxes.filter((box) => box.id !== 'turn'));
    return drawing.labels
      .map((label, i) => ({ label, box: boxes[i] }))
      .filter(({ label }) => label.kind === 'turn' || shown.has(label.key))
      .sort(
        (a, b) =>
          Number(b.label.kind === 'turn') - Number(a.label.kind === 'turn') ||
          b.label.depthM - a.label.depthM,
      );
  }, [drawing]);

  const itemText = (item: SideItem) => {
    const name = localized(item.name, i18n.language);
    if (item.kind === 'exit') return t('fpv.exit', { name });
    if (item.kind === 'passage') return t('fpv.passage', { name });
    return name;
  };
  const list = (items: SideItem[], heading: string) => (
    <section aria-label={heading}>
      <h3>{heading}</h3>
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            {itemText(item)} {t('fpv.itemAhead', { distance: Math.round(item.distanceM) })}
          </li>
        ))}
        {items.length === 0 && <li>{t('fpv.nothing')}</li>}
      </ul>
    </section>
  );

  return (
    <div className="first-person" data-testid="first-person">
      <svg
        className="fpv-scene"
        viewBox={`0 0 ${drawing.width} ${drawing.height}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <rect className="fpv-sky" width={drawing.width} height={drawing.height} />
        {drawing.polygons.map((polygon) => (
          <polygon key={polygon.key} points={polygon.points} fill={polygon.fill} />
        ))}
        {pills.map(({ label, box }) => (
          <g key={label.key} className={`fpv-pill ${label.kind}`}>
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              rx={box.height / 2}
              fill={label.color}
            />
            <path
              d={`M${label.x - 5} ${box.y + box.height - 0.5}L${label.x} ${label.y}L${label.x + 5} ${box.y + box.height - 0.5}Z`}
              fill={label.color}
            />
            <text
              x={box.x + box.width / 2}
              y={box.y + box.height / 2}
              fontSize={label.kind === 'turn' ? 30 : label.fontPx}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {pillText(label)}
            </text>
          </g>
        ))}
      </svg>
      <div className="fpv-header">
        {miniMap}
        <button
          type="button"
          className="fpv-viewpoint"
          aria-pressed={viewpoint === 'behind'}
          onClick={toggleViewpoint}
        >
          {t(viewpoint === 'behind' ? 'fpv.viewEye' : 'fpv.viewBehind')}
        </button>
        <div className="fpv-next">
          <span className="fpv-ahead-icon" aria-hidden>
            {ACTION_ICON[step.action]}
          </span>
          <span
            className="fpv-ahead"
            aria-label={t('fpv.ahead', {
              distance: Math.round(step.distanceM),
              action: t(ACTION_KEY[step.action]),
            })}
          >
            <span className="fpv-ahead-distance">
              {t('fpv.distance', { distance: Math.round(step.distanceM) })}
            </span>
            <span className="fpv-ahead-action">{capitalize(t(ACTION_KEY[step.action]))}</span>
          </span>
        </div>
      </div>
      <div className="visually-hidden">
        {list(sideView.left, t('fpv.left'))}
        {list(sideView.right, t('fpv.right'))}
        {sideView.along.length > 0 && list(sideView.along, t('fpv.along'))}
      </div>
    </div>
  );
}
