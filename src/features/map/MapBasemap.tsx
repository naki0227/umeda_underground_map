import { memo } from 'react';
import type { Basemap } from '../../data/types';

/** [x, y, x, y, ...]（北が +y）を SVG のパスにする（y を反転） */
function toPath(lines: number[][], closed: boolean): string {
  return lines
    .map((points) => {
      let d = '';
      for (let i = 0; i < points.length; i += 2) {
        d += `${i === 0 ? 'M' : 'L'}${points[i]} ${-points[i + 1]}`;
      }
      return closed ? `${d}Z` : d;
    })
    .join('');
}

/**
 * 地図の下地: 地上の建物の輪郭と道路。地下の通路と重ねて「いまどの通りの下か」が分かるようにする。
 * 要素が多い（建物 2,000 棟以上）ので、種類ごとに 1 本のパスにまとめて描く
 */
export const MapBasemap = memo(function MapBasemap({ basemap }: { basemap: Basemap }) {
  return (
    <g className="basemap" pointerEvents="none" aria-hidden>
      <path className="basemap-building" d={toPath(basemap.buildings, true)} />
      <path className="basemap-road minor" d={toPath(basemap.minorRoads, false)} />
      <path className="basemap-road major" d={toPath(basemap.majorRoads, false)} />
    </g>
  );
});
