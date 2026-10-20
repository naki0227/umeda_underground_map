import type { KeyboardEvent } from 'react';

/**
 * SVG 要素をボタンとして操作できるようにする属性一式。
 * タップに加えて Tab で移動し Enter / Space で選べるようにする。
 */
export function pressable(label: string, onPress: () => void) {
  return {
    role: 'button',
    tabIndex: 0,
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
