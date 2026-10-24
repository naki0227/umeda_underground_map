import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
const image = readFileSync(resolve(__dirname, '../../public/ogp.jpg'));

/** JPEG の幅と高さ（SOF マーカーから読む） */
function jpegSize(data: Buffer): { width: number; height: number } {
  let i = 2;
  while (i < data.length) {
    const marker = data[i + 1];
    const length = data.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc2) {
      return { height: data.readUInt16BE(i + 5), width: data.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  throw new Error('no SOF marker');
}

describe('share card (OGP / X)', () => {
  it('has the tags X and other apps read, with the image as an absolute URL', () => {
    for (const tag of [
      'property="og:title"',
      'property="og:description"',
      'property="og:url" content="%SITE_URL%"',
      'property="og:image" content="%SITE_URL%ogp.jpg"',
      'name="twitter:card" content="summary_large_image"',
      'name="twitter:image" content="%SITE_URL%ogp.jpg"',
    ]) {
      expect(html, tag).toContain(tag);
    }
  });

  it('has a 1200x630 image that is small enough to load quickly', () => {
    expect(jpegSize(image)).toEqual({ width: 1200, height: 630 });
    expect(image.length).toBeLessThan(300 * 1024);
  });
});
