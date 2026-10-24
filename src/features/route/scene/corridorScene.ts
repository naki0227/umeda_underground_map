import { breakpoints, buildCorridor, offsetAt, simplifyPath, type Corridor } from './corridorPath';
import {
  projectPolygon,
  segmentsCross,
  toCamera,
  projectCamera,
  type Camera,
  type PlanePoint,
} from './perspective';
import type { Scene, SceneInput, SceneItem, SceneLabel, ScenePolygon } from './sceneTypes';
import { EXIT_STYLE, mixColor } from './shopStyle';

export type { Scene, SceneInput, SceneItem, SceneLabel, ScenePolygon } from './sceneTypes';

export const SCENE_WIDTH = 360;
export const SCENE_HEIGHT = 640;
const HALF_WIDTH_M = 4;
const CEILING_M = 3.2;
const SIGN_BOTTOM_M = 2.4;
const SIGN_TOP_M = 3.0;
/** 目は起点より少し後ろに置く（起点にある店も左右に見えるように） */
const BACK_M = 3;
const CHUNK_M = 4;
const FACADE_M = 5;
const FACADE_GAP_M = 0.6;
/** 店がまとまっていて元の位置からこれ以上ずれるものは並べない */
const MAX_SHIFT_M = 18;
/** これより遠い看板は名前を出さずアイコンだけ */
const NAME_MAX_M = 45;
const LABEL_MAX_M = 80;

const COLORS = {
  fog: '#fbf3e6',
  floorA: '#eadcc4',
  floorB: '#e2d2b6',
  ceiling: '#f3ebdf',
  light: '#fffaf0',
  wallLeft: '#f1e3cf',
  wallRight: '#f9eedf',
  baseboard: '#b9a68a',
  route: '#2f6bf2',
  opening: '#c8b9a2',
  stairs: '#4b5563',
};

/** 遠くほど霧の色に近づける */
const fogged = (color: string, depthM: number) =>
  mixColor(color, COLORS.fog, Math.min(0.75, Math.max(0, (depthM - 12) / 110)));

interface Placed extends SceneItem {
  start: number;
  end: number;
}

/** 左右それぞれ、店先が重ならないよう奥へずらしながら並べる */
function placeItems(items: SceneItem[], length: number): Placed[] {
  const placed: Placed[] = [];
  for (const side of ['left', 'right'] as const) {
    let end = 0;
    const onSide = items
      .filter((item) => item.side === side)
      .sort((a, b) => a.distanceM - b.distanceM);
    for (const item of onSide) {
      const s = item.distanceM + BACK_M;
      const size = item.kind === 'shop' ? FACADE_M : 3.5;
      const start = Math.max(s - size / 2, end + FACADE_GAP_M, BACK_M - 1);
      if (start - (s - size / 2) > MAX_SHIFT_M || start + size > length - 0.5) continue;
      placed.push({ ...item, start, end: start + size });
      end = start + size;
    }
  }
  return placed;
}

/**
 * 一人称の通路の絵を組み立てる。経路の折れ線に沿って床・壁・天井を短く区切って作り、
 * 壁には店先（店ごとの四角）・出口・脇道を並べる。遠いものから順に描けば手前が上に重なる。
 */
export function buildScene({ path, items, turn, goal }: SceneInput): Scene {
  const empty: Scene = { width: SCENE_WIDTH, height: SCENE_HEIGHT, polygons: [], labels: [] };
  const simplified = simplifyPath(path, 1.5);
  if (simplified.length < 2) return empty;
  const first = buildCorridor(simplified);
  const ahead = offsetAt(first, Math.min(8, first.length), 0);
  const hx = ahead.x - simplified[0].x;
  const hy = ahead.y - simplified[0].y;
  const hl = Math.hypot(hx, hy);
  if (hl < 1e-6) return empty;
  const heading = { x: hx / hl, y: hy / hl };
  const eye = { x: simplified[0].x - heading.x * BACK_M, y: simplified[0].y - heading.y * BACK_M };
  const corridor: Corridor = buildCorridor([eye, ...simplified]);
  const camera: Camera = {
    position: eye,
    heading,
    eyeM: 1.6,
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
    horizonY: SCENE_HEIGHT * 0.41,
    focal: 280,
  };

  const groups: { depth: number; polygons: ScenePolygon[] }[] = [];
  const quad = (a: PlanePoint, b: PlanePoint, z0: number, z1: number) =>
    projectPolygon(camera, [
      { p: a, z: z0 },
      { p: b, z: z0 },
      { p: b, z: z1 },
      { p: a, z: z1 },
    ]);
  const flat = (s0: number, s1: number, w0: number, w1: number, z: number) =>
    projectPolygon(camera, [
      { p: offsetAt(corridor, s0, w0), z },
      { p: offsetAt(corridor, s1, w0), z },
      { p: offsetAt(corridor, s1, w1), z },
      { p: offsetAt(corridor, s0, w1), z },
    ]);
  const add = (
    key: string,
    shape: ReturnType<typeof quad>,
    fill: string,
    group: ScenePolygon[],
  ) => {
    if (shape) group.push({ key, points: shape.points, fill: fogged(fill, shape.depth) });
    return shape;
  };
  const push = (polygons: ScenePolygon[], depth: number | undefined) => {
    if (polygons.length > 0 && depth !== undefined) groups.push({ depth, polygons });
  };

  // 床（タイルの縞と、経路の青い帯）と天井（照明）
  const cuts = breakpoints(corridor, 0, corridor.length, CHUNK_M);
  cuts.slice(1).forEach((s1, i) => {
    const s0 = cuts[i];
    const floor: ScenePolygon[] = [];
    const tile = Math.floor(s0 / CHUNK_M) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
    const base = add(`floor-${i}`, flat(s0, s1, HALF_WIDTH_M, -HALF_WIDTH_M, 0), tile, floor);
    if (s1 > BACK_M) {
      add(`route-${i}`, flat(Math.max(s0, BACK_M), s1, 0.6, -0.6, 0), COLORS.route, floor);
    }
    push(floor, base?.depth);
    const ceiling: ScenePolygon[] = [];
    const top = add(
      `ceiling-${i}`,
      flat(s0, s1, HALF_WIDTH_M, -HALF_WIDTH_M, CEILING_M),
      COLORS.ceiling,
      ceiling,
    );
    if (s1 - s0 > 2) {
      const mid = (s0 + s1) / 2;
      add(`light-${i}`, flat(mid - 0.8, mid + 0.8, 1, -1, CEILING_M - 0.01), COLORS.light, ceiling);
    }
    push(ceiling, top?.depth);
  });

  // 壁と店先
  const placed = placeItems(items, corridor.length);
  for (const side of ['left', 'right'] as const) {
    const w = side === 'left' ? HALF_WIDTH_M : -HALF_WIDTH_M;
    const wall = side === 'left' ? COLORS.wallLeft : COLORS.wallRight;
    const mine = placed.filter((item) => item.side === side);
    const wallCuts = breakpoints(
      corridor,
      0,
      corridor.length,
      CHUNK_M,
      mine.flatMap((item) => [item.start, item.end]),
    );
    wallCuts.slice(1).forEach((s1, i) => {
      const s0 = wallCuts[i];
      const mid = (s0 + s1) / 2;
      const a = offsetAt(corridor, s0, w);
      const b = offsetAt(corridor, s1, w);
      const item = mine.find((p) => p.start <= mid && mid <= p.end);
      const polygons: ScenePolygon[] = [];
      const key = `${side}-${i}`;
      if (item === undefined) {
        const shape = add(key, quad(a, b, 0, CEILING_M), wall, polygons);
        add(`${key}-base`, quad(a, b, 0, 0.15), COLORS.baseboard, polygons);
        push(polygons, shape?.depth);
        return;
      }
      const lower =
        item.kind === 'shop'
          ? mixColor(item.color, '#ffffff', 0.62)
          : item.kind === 'exit'
            ? COLORS.stairs
            : COLORS.opening;
      const band = item.kind === 'passage' ? wall : item.color;
      const shape = add(`${key}-lower`, quad(a, b, 0, SIGN_BOTTOM_M), lower, polygons);
      add(`${key}-sign`, quad(a, b, SIGN_BOTTOM_M, SIGN_TOP_M), band, polygons);
      add(`${key}-upper`, quad(a, b, SIGN_TOP_M, CEILING_M), wall, polygons);
      push(polygons, shape?.depth);
    });
  }

  // 突き当たり（目的地か、先へ続く通路の霧）
  const endGroup: ScenePolygon[] = [];
  const end = add(
    'end',
    quad(
      offsetAt(corridor, corridor.length, HALF_WIDTH_M),
      offsetAt(corridor, corridor.length, -HALF_WIDTH_M),
      0,
      CEILING_M,
    ),
    goal ? '#ffe7b3' : COLORS.fog,
    endGroup,
  );
  push(endGroup, end?.depth);

  groups.sort((a, b) => b.depth - a.depth);
  const polygons = groups.flatMap((g) => g.polygons);

  // 看板の吹き出し（壁に隠れるものは出さない）
  const walls = [HALF_WIDTH_M, -HALF_WIDTH_M].map((w) =>
    corridor.cum.map((s) => offsetAt(corridor, s, w)),
  );
  const hidden = (p: PlanePoint) =>
    walls.some((line) => line.slice(1).some((q, i) => segmentsCross(eye, p, line[i], q)));
  const labels: SceneLabel[] = [];
  const label = (
    key: string,
    kind: SceneLabel['kind'],
    p: PlanePoint,
    z: number,
    icon: string,
    text: string,
    color: string,
  ) => {
    const c = toCamera(camera, p, z);
    const depthM = Math.hypot(c.forward, c.right);
    if (c.forward < 1.5 || (kind !== 'goal' && depthM > LABEL_MAX_M) || hidden(p)) return;
    const { x, y } = projectCamera(camera, c);
    if (x < -40 || x > SCENE_WIDTH + 40) return;
    const fontPx = Math.min(16, Math.max(10, 220 / depthM));
    labels.push({
      key,
      kind,
      x,
      y,
      fontPx,
      icon,
      text: depthM > NAME_MAX_M && kind === 'shop' ? '' : text,
      color,
      depthM,
    });
  };
  for (const item of placed) {
    if (item.kind === 'passage') continue;
    const w = (item.side === 'left' ? 1 : -1) * (HALF_WIDTH_M - 0.4);
    const p = offsetAt(corridor, (item.start + item.end) / 2, w);
    label(
      item.key,
      item.kind,
      p,
      SIGN_TOP_M,
      item.kind === 'exit' ? EXIT_STYLE.icon : item.icon,
      item.name,
      item.color,
    );
  }
  if (turn !== undefined && turn.distanceM + BACK_M < corridor.length) {
    label(
      'turn',
      'turn',
      offsetAt(corridor, turn.distanceM + BACK_M, 0),
      2.2,
      turn.icon,
      '',
      COLORS.route,
    );
  }
  if (goal !== undefined) {
    label(
      'goal',
      'goal',
      offsetAt(corridor, corridor.length - 0.5, 0),
      2.4,
      goal.icon,
      goal.text,
      '#f59e0b',
    );
  }
  return { width: SCENE_WIDTH, height: SCENE_HEIGHT, polygons, labels };
}
