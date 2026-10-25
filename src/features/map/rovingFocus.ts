import { useEffect, type KeyboardEvent, type RefObject } from 'react';

export type Direction = 'up' | 'down' | 'left' | 'right';

const ARROWS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const VECTORS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * from から dir の向きにある、いちばん近い点の番号（なければ null）。
 * 真横からずれている点ほど遠い扱いにする（ずれの 2 倍を足す）。
 */
export function nextInDirection(
  points: readonly { x: number; y: number }[],
  from: number,
  dir: Direction,
): number | null {
  const origin = points[from];
  const v = VECTORS[dir];
  let best: { index: number; score: number } | null = null;
  points.forEach((p, index) => {
    if (index === from) return;
    const dx = p.x - origin.x;
    const dy = p.y - origin.y;
    const along = dx * v.x + dy * v.y;
    if (along <= 0) return;
    const across = Math.abs(dx * v.y - dy * v.x);
    const score = along + across * 2;
    if (best === null || score < best.score) best = { index, score };
  });
  return best === null ? null : (best as { index: number }).index;
}

const items = (root: Element) => [...root.querySelectorAll<SVGElement>('[role="button"]')];

/**
 * 地図の上の押せる点（ピン・出口など）を、Tab では1か所だけ止まり、矢印キーで
 * 画面上の向きに移るようにする（数百の点を Tab で順にたどらずに済む）。
 * 点は pressable で tabIndex -1 にしておき、ここで1つだけ 0 にする。
 */
export function useRovingFocus(rootRef: RefObject<Element | null>) {
  // 描き直しのたびに、Tab で止まる点がちょうど1つあるようにする
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const all = items(root);
    if (all.length === 0 || all.some((el) => el.getAttribute('tabindex') === '0')) return;
    all[0].setAttribute('tabindex', '0');
  });

  return (e: KeyboardEvent<Element>) => {
    const dir = ARROWS[e.key];
    const root = rootRef.current;
    const current = e.target as Element;
    if (!dir || !root || current.getAttribute('role') !== 'button') return;
    const all = items(root);
    const from = all.indexOf(current as SVGElement);
    if (from < 0) return;
    e.preventDefault();
    const centers = all.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    const next = nextInDirection(centers, from, dir);
    if (next === null) return;
    all[from].setAttribute('tabindex', '-1');
    all[next].setAttribute('tabindex', '0');
    all[next].focus();
  };
}
