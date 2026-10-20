import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const HOVER_MEDIA = '@media (hover: hover) and (pointer: fine)';

/** CSS の各ルールのセレクタと、それを囲む @media の条件を取り出す */
function rulesWithMedia(css: string): { selector: string; media: string[] }[] {
  const rules: { selector: string; media: string[] }[] = [];
  const stack: string[] = [];
  let buffer = '';
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (ch === '{') {
      stack.push(buffer.trim());
      buffer = '';
    } else if (ch === '}') {
      const head = stack.pop() ?? '';
      if (!head.startsWith('@')) rules.push({ selector: head, media: [...stack] });
      buffer = '';
    } else if (ch === ';' && !buffer.includes('{')) {
      buffer = '';
    } else {
      buffer += ch;
    }
  }
  return rules;
}

describe('hover styles', () => {
  it('apply only on devices with a fine pointer (no sticky hover after a tap)', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
    const hoverRules = rulesWithMedia(css).filter((rule) => rule.selector.includes(':hover'));
    expect(hoverRules.length).toBeGreaterThan(0);
    for (const rule of hoverRules) {
      expect(rule.media, rule.selector).toContain(HOVER_MEDIA);
    }
  });
});
