import type { KeyboardEvent } from 'react';

/**
 * SVG 要素をボタンとして操作できるようにする属性一式。
 * タップに加えて Tab で移動し Enter / Space で選べるようにする。
 */
export function pressable(label: string, onPress: () => void) {
  return {
    role: 'button',
    // Tab で止まるのは地図の中で1か所だけ（rovingFocus.ts）。矢印キーで点を移る
    tabIndex: -1,
    'aria-label': label,
    onClick: onPress,
    onKeyDown: (e: KeyboardEvent<SVGElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPress();
      }
    },
  } as const;
}
